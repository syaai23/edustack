const express = require('express');
const { auth, hasPermission } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res, next) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        roles: {
          include: {
            role: true
          }
        },
        studentProfile: true,
        tutorProfile: true,
        adminProfile: true,
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: { user: userWithoutPassword }
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, validate(schemas.updateProfile), async (req, res, next) => {
  try {
    const updateData = req.body;

    const user = await req.prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      include: {
        roles: {
          include: {
            role: true
          }
        },
        studentProfile: true,
        tutorProfile: true,
        adminProfile: true,
      }
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: userWithoutPassword }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/users/dashboard
// @desc    Get user dashboard data
// @access  Private
router.get('/dashboard', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    let dashboardData = {};

    // Student dashboard
    if (req.user.studentProfile) {
      const [enrollments, recentProgress, certificates] = await Promise.all([
        req.prisma.enrollment.findMany({
          where: { studentId: userId },
          take: 5,
          orderBy: { lastAccessedAt: 'desc' },
          include: {
            course: {
              include: {
                tutor: {
                  include: {
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                        avatar: true,
                      }
                    }
                  }
                }
              }
            }
          }
        }),
        req.prisma.progress.findMany({
          where: { studentId: userId },
          take: 10,
          orderBy: { updatedAt: 'desc' },
          include: {
            lesson: {
              include: {
                section: {
                  include: {
                    course: {
                      select: {
                        id: true,
                        title: true,
                        thumbnail: true,
                      }
                    }
                  }
                }
              }
            }
          }
        }),
        req.prisma.certificate.findMany({
          where: { studentId: userId },
          take: 5,
          orderBy: { issuedAt: 'desc' },
          include: {
            course: {
              select: {
                id: true,
                title: true,
                thumbnail: true,
              }
            }
          }
        })
      ]);

      dashboardData = {
        type: 'student',
        enrollments,
        recentProgress,
        certificates,
        stats: req.user.studentProfile
      };
    }

    // Tutor dashboard
    if (req.user.tutorProfile) {
      const [courses, recentEnrollments, earnings, reviews] = await Promise.all([
        req.prisma.course.findMany({
          where: { tutorId: req.user.tutorProfile.id },
          take: 5,
          orderBy: { updatedAt: 'desc' },
          include: {
            category: true,
            _count: {
              select: { enrollments: true }
            }
          }
        }),
        req.prisma.enrollment.findMany({
          where: {
            course: {
              tutorId: req.user.tutorProfile.id
            }
          },
          take: 10,
          orderBy: { enrolledAt: 'desc' },
          include: {
            student: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,
              }
            },
            course: {
              select: {
                id: true,
                title: true,
              }
            }
          }
        }),
        req.prisma.payment.aggregate({
          where: {
            course: {
              tutorId: req.user.tutorProfile.id
            },
            status: 'COMPLETED'
          },
          _sum: {
            amount: true
          }
        }),
        req.prisma.review.findMany({
          where: {
            course: {
              tutorId: req.user.tutorProfile.id
            },
            isPublished: true
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            student: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,
              }
            },
            course: {
              select: {
                id: true,
                title: true,
              }
            }
          }
        })
      ]);

      dashboardData = {
        type: 'tutor',
        courses,
        recentEnrollments,
        totalEarnings: earnings._sum.amount || 0,
        reviews,
        stats: req.user.tutorProfile
      };
    }

    // Admin dashboard
    if (req.user.adminProfile) {
      const [userStats, courseStats, revenueStats] = await Promise.all([
        req.prisma.user.groupBy({
          by: ['createdAt'],
          _count: true,
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        }),
        req.prisma.course.groupBy({
          by: ['status'],
          _count: true
        }),
        req.prisma.payment.aggregate({
          where: {
            status: 'COMPLETED',
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          _sum: {
            amount: true
          }
        })
      ]);

      dashboardData = {
        type: 'admin',
        userStats,
        courseStats,
        revenue: revenueStats._sum.amount || 0,
        stats: req.user.adminProfile
      };
    }

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
