const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { auth, isStudent } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/payments/create-intent
// @desc    Create payment intent for course purchase
// @access  Private (Students only)
router.post('/create-intent', auth, isStudent, async (req, res, next) => {
  try {
    const { courseId } = req.body;
    const studentId = req.user.id;

    // Get course details
    const course = await req.prisma.course.findUnique({
      where: {
        id: courseId,
        isPublished: true,
        status: 'PUBLISHED'
      },
      include: {
        tutor: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              }
            }
          }
        }
      }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or not available for purchase'
      });
    }

    if (course.price === 0) {
      return res.status(400).json({
        success: false,
        message: 'This course is free'
      });
    }

    // Check if already enrolled
    const existingEnrollment = await req.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId
        }
      }
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course'
      });
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(course.price * 100), // Convert to cents
      currency: course.currency.toLowerCase(),
      metadata: {
        courseId,
        studentId,
        tutorId: course.tutorId,
      }
    });

    // Create payment record
    const payment = await req.prisma.payment.create({
      data: {
        userId: studentId,
        courseId,
        amount: course.price,
        currency: course.currency,
        paymentMethod: 'STRIPE',
        status: 'PENDING',
        stripePaymentId: paymentIntent.id,
        stripeClientSecret: paymentIntent.client_secret,
        description: `Course: ${course.title}`,
        metadata: {
          courseTitle: course.title,
          tutorName: `${course.tutor.user.firstName} ${course.tutor.user.lastName}`
        }
      }
    });

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentId: payment.id,
        amount: course.price,
        currency: course.currency,
        course: {
          id: course.id,
          title: course.title,
          thumbnail: course.thumbnail,
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/payments/webhook
// @desc    Handle Stripe webhook events
// @access  Public (Stripe webhook)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.log(`Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await handlePaymentSuccess(req.prisma, paymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        await handlePaymentFailure(req.prisma, failedPayment);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook error'
    });
  }
});

// Helper function to handle successful payment
async function handlePaymentSuccess(prisma, paymentIntent) {
  const { courseId, studentId, tutorId } = paymentIntent.metadata;

  try {
    await prisma.$transaction(async (tx) => {
      // Update payment status
      await tx.payment.update({
        where: { stripePaymentId: paymentIntent.id },
        data: {
          status: 'COMPLETED',
          paidAt: new Date()
        }
      });

      // Create enrollment
      const enrollment = await tx.enrollment.create({
        data: {
          studentId,
          courseId,
          status: 'ACTIVE'
        }
      });

      // Update course statistics
      await tx.course.update({
        where: { id: courseId },
        data: {
          totalEnrollments: { increment: 1 },
          totalRevenue: { increment: paymentIntent.amount / 100 }
        }
      });

      // Update tutor statistics
      await tx.tutor.update({
        where: { id: tutorId },
        data: {
          totalStudents: { increment: 1 },
          totalEarnings: { increment: paymentIntent.amount / 100 * 0.85 } // 85% to tutor, 15% platform fee
        }
      });

      // Update student statistics
      await tx.student.update({
        where: { userId: studentId },
        data: {
          totalCoursesEnrolled: { increment: 1 }
        }
      });
    });

    console.log(`Payment successful for course ${courseId} by student ${studentId}`);
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

// Helper function to handle failed payment
async function handlePaymentFailure(prisma, paymentIntent) {
  try {
    await prisma.payment.update({
      where: { stripePaymentId: paymentIntent.id },
      data: {
        status: 'FAILED',
        failedAt: new Date()
      }
    });

    console.log(`Payment failed for payment intent ${paymentIntent.id}`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

// @route   GET /api/payments
// @desc    Get user's payment history
// @access  Private
router.get('/', auth, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [payments, totalCount] = await Promise.all([
      req.prisma.payment.findMany({
        where: { userId },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              thumbnail: true,
            }
          }
        }
      }),
      req.prisma.payment.count({
        where: { userId }
      })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/payments/:id
// @desc    Get payment details
// @access  Private
router.get('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const payment = await req.prisma.payment.findFirst({
      where: {
        id,
        userId
      },
      include: {
        course: {
          include: {
            tutor: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: { payment }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
