const express = require('express');
const { auth, isStudent } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// @route   POST /api/enrollments/:courseId
// @desc    Enroll in a course
// @access  Private (Students only)
router.post('/:courseId', auth, isStudent, async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    // Check if course exists and is published
    const course = await req.prisma.course.findUnique({
      where: {
        id: courseId,
        isPublished: true,
        status: 'PUBLISHED'
      }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or not available for enrollment'
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

    // For free courses, create enrollment directly
    // For paid courses, this would be handled after payment
    if (course.price === 0) {
      const enrollment = await req.prisma.enrollment.create({
        data: {
          studentId,
          courseId,
          status: 'ACTIVE'
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
                      avatar: true,
                    }
                  }
                }
              },
              category: true
            }
          }
        }
      });

      // Update course enrollment count
      await req.prisma.course.update({
        where: { id: courseId },
        data: { totalEnrollments: { increment: 1 } }
      });

      // Update tutor stats
      await req.prisma.tutor.update({
        where: { id: course.tutorId },
        data: { totalStudents: { increment: 1 } }
      });

      // Update student stats
      await req.prisma.student.update({
        where: { userId: studentId },
        data: { totalCoursesEnrolled: { increment: 1 } }
      });

      // Send real-time notification
      req.io.to(`user-${studentId}`).emit('enrollment-success', {
        courseId,
        courseName: course.title
      });

      res.status(201).json({
        success: true,
        message: 'Successfully enrolled in course',
        data: { enrollment }
      });
    } else {
      // For paid courses, return payment required
      res.status(402).json({
        success: false,
        message: 'Payment required for this course',
        data: {
          courseId,
          price: course.price,
          currency: course.currency
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/enrollments
// @desc    Get user's enrollments
// @access  Private (Students only)
router.get('/', auth, isStudent, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const studentId = req.user.id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      studentId,
      ...(status && { status })
    };

    const [enrollments, totalCount] = await Promise.all([
      req.prisma.enrollment.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { enrolledAt: 'desc' },
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
              },
              category: true,
              _count: {
                select: { sections: true }
              }
            }
          }
        }
      }),
      req.prisma.enrollment.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        enrollments,
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

// @route   GET /api/enrollments/:courseId
// @desc    Get specific enrollment details
// @access  Private (Students only)
router.get('/:courseId', auth, isStudent, async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    const enrollment = await req.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId
        }
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
                    avatar: true,
                    bio: true,
                  }
                }
              }
            },
            category: true,
            sections: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
              include: {
                lessons: {
                  where: { isActive: true },
                  orderBy: { sortOrder: 'asc' }
                }
              }
            }
          }
        },
        progressRecords: {
          include: {
            lesson: {
              select: {
                id: true,
                title: true,
                sectionId: true,
              }
            }
          }
        },
        certificate: true
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    res.json({
      success: true,
      data: { enrollment }
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/enrollments/:courseId/progress
// @desc    Update lesson progress
// @access  Private (Students only)
router.put('/:courseId/progress/:lessonId', auth, isStudent, async (req, res, next) => {
  try {
    const { courseId, lessonId } = req.params;
    const { timeSpent, lastPosition, isCompleted } = req.body;
    const studentId = req.user.id;

    // Verify enrollment exists
    const enrollment = await req.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId
        }
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Verify lesson belongs to course
    const lesson = await req.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        section: {
          courseId
        }
      }
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Update or create progress record
    const progress = await req.prisma.progress.upsert({
      where: {
        studentId_lessonId: {
          studentId,
          lessonId
        }
      },
      update: {
        timeSpent: timeSpent || undefined,
        lastPosition: lastPosition || undefined,
        isCompleted: isCompleted || undefined,
        ...(isCompleted && !progress?.completedAt && { completedAt: new Date() })
      },
      create: {
        studentId,
        lessonId,
        enrollmentId: enrollment.id,
        timeSpent: timeSpent || 0,
        lastPosition: lastPosition || 0,
        isCompleted: isCompleted || false,
        ...(isCompleted && { completedAt: new Date() })
      }
    });

    // Recalculate course progress
    const totalLessons = await req.prisma.lesson.count({
      where: {
        section: {
          courseId,
          isActive: true
        },
        isActive: true
      }
    });

    const completedLessons = await req.prisma.progress.count({
      where: {
        studentId,
        isCompleted: true,
        lesson: {
          section: {
            courseId
          }
        }
      }
    });

    const courseProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    // Update enrollment progress
    const updatedEnrollment = await req.prisma.enrollment.update({
      where: {
        studentId_courseId: {
          studentId,
          courseId
        }
      },
      data: {
        progress: courseProgress,
        lastAccessedAt: new Date(),
        ...(courseProgress === 100 && enrollment.status !== 'COMPLETED' && {
          status: 'COMPLETED',
          completedAt: new Date()
        })
      }
    });

    // If course just completed, update student stats and create certificate
    if (courseProgress === 100 && enrollment.status !== 'COMPLETED') {
      await req.prisma.student.update({
        where: { userId: studentId },
        data: { totalCoursesCompleted: { increment: 1 } }
      });

      // Create certificate
      const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      await req.prisma.certificate.create({
        data: {
          studentId,
          courseId,
          enrollmentId: enrollment.id,
          certificateNumber
        }
      });

      // Send real-time notification
      req.io.to(`user-${studentId}`).emit('course-completed', {
        courseId,
        certificateNumber
      });
    }

    // Send real-time progress update
    req.io.to(`user-${studentId}`).emit('progress-updated', {
      courseId,
      lessonId,
      progress: courseProgress
    });

    res.json({
      success: true,
      message: 'Progress updated successfully',
      data: {
        progress,
        courseProgress,
        enrollment: updatedEnrollment
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/enrollments/:courseId
// @desc    Unenroll from course
// @access  Private (Students only)
router.delete('/:courseId', auth, isStudent, async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    const enrollment = await req.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId
        }
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check if course is completed (might want to prevent unenrollment)
    if (enrollment.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot unenroll from completed course'
      });
    }

    // Delete enrollment and related data
    await req.prisma.$transaction(async (prisma) => {
      // Delete progress records
      await prisma.progress.deleteMany({
        where: { enrollmentId: enrollment.id }
      });

      // Delete enrollment
      await prisma.enrollment.delete({
        where: { id: enrollment.id }
      });

      // Update course stats
      await prisma.course.update({
        where: { id: courseId },
        data: { totalEnrollments: { decrement: 1 } }
      });

      // Update student stats
      await prisma.student.update({
        where: { userId: studentId },
        data: { totalCoursesEnrolled: { decrement: 1 } }
      });
    });

    res.json({
      success: true,
      message: 'Successfully unenrolled from course'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
