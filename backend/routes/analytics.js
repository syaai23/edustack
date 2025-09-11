const express = require('express');
const { auth, hasPermission, isTutor, isAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/analytics/overview
// @desc    Get platform overview analytics
// @access  Private (Admin only)
router.get('/overview', auth, isAdmin, async (req, res, next) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    // Calculate date range
    let startDate;
    switch (timeframe) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const [
      totalUsers,
      totalCourses,
      totalRevenue,
      newUsersInPeriod,
      newCoursesInPeriod,
      revenueInPeriod,
      topCategories,
      userGrowth,
      courseStats
    ] = await Promise.all([
      // Total users
      req.prisma.user.count(),
      
      // Total courses
      req.prisma.course.count({ where: { isPublished: true } }),
      
      // Total revenue
      req.prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true }
      }),
      
      // New users in period
      req.prisma.user.count({
        where: { createdAt: { gte: startDate } }
      }),
      
      // New courses in period
      req.prisma.course.count({
        where: { 
          createdAt: { gte: startDate },
          isPublished: true
        }
      }),
      
      // Revenue in period
      req.prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate }
        },
        _sum: { amount: true }
      }),
      
      // Top categories
      req.prisma.category.findMany({
        include: {
          _count: {
            select: {
              courses: {
                where: { isPublished: true }
              }
            }
          }
        },
        orderBy: {
          courses: {
            _count: 'desc'
          }
        },
        take: 5
      }),
      
      // User growth over time
      req.prisma.user.groupBy({
        by: ['createdAt'],
        _count: true,
        where: {
          createdAt: { gte: startDate }
        },
        orderBy: {
          createdAt: 'asc'
        }
      }),
      
      // Course statistics by status
      req.prisma.course.groupBy({
        by: ['status'],
        _count: true
      })
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalCourses,
          totalRevenue: totalRevenue._sum.amount || 0,
          newUsersInPeriod,
          newCoursesInPeriod,
          revenueInPeriod: revenueInPeriod._sum.amount || 0
        },
        topCategories,
        userGrowth,
        courseStats,
        timeframe
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/analytics/tutor
// @desc    Get tutor analytics
// @access  Private (Tutor only)
router.get('/tutor', auth, isTutor, async (req, res, next) => {
  try {
    const tutorId = req.user.tutorProfile.id;
    const { timeframe = '30d' } = req.query;
    
    let startDate;
    switch (timeframe) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const [
      courseStats,
      enrollmentStats,
      revenueStats,
      topCourses,
      recentEnrollments,
      reviewStats
    ] = await Promise.all([
      // Course statistics
      req.prisma.course.aggregate({
        where: { tutorId },
        _count: true,
        _avg: { averageRating: true }
      }),
      
      // Enrollment statistics
      req.prisma.enrollment.count({
        where: {
          course: { tutorId },
          enrolledAt: { gte: startDate }
        }
      }),
      
      // Revenue statistics
      req.prisma.payment.aggregate({
        where: {
          course: { tutorId },
          status: 'COMPLETED',
          createdAt: { gte: startDate }
        },
        _sum: { amount: true }
      }),
      
      // Top performing courses
      req.prisma.course.findMany({
        where: { tutorId },
        orderBy: { totalEnrollments: 'desc' },
        take: 5,
        include: {
          _count: {
            select: {
              enrollments: true,
              reviews: true
            }
          }
        }
      }),
      
      // Recent enrollments
      req.prisma.enrollment.findMany({
        where: {
          course: { tutorId }
        },
        orderBy: { enrolledAt: 'desc' },
        take: 10,
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          course: {
            select: {
              title: true
            }
          }
        }
      }),
      
      // Review statistics
      req.prisma.review.aggregate({
        where: {
          course: { tutorId },
          createdAt: { gte: startDate }
        },
        _count: true,
        _avg: { rating: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        courseStats: {
          totalCourses: courseStats._count,
          averageRating: courseStats._avg.averageRating || 0
        },
        enrollmentStats: {
          newEnrollments: enrollmentStats
        },
        revenueStats: {
          totalRevenue: revenueStats._sum.amount || 0
        },
        reviewStats: {
          newReviews: reviewStats._count,
          averageRating: reviewStats._avg.rating || 0
        },
        topCourses,
        recentEnrollments,
        timeframe
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/analytics/course/:courseId
// @desc    Get specific course analytics
// @access  Private (Course tutor or admin)
router.get('/course/:courseId', auth, async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { timeframe = '30d' } = req.query;
    
    // Check if user has access to this course
    const course = await req.prisma.course.findUnique({
      where: { id: courseId },
      include: { tutor: true }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const isOwner = req.user.tutorProfile && req.user.tutorProfile.id === course.tutorId;
    const isAdmin = req.user.adminProfile;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    let startDate;
    switch (timeframe) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const [
      enrollmentStats,
      completionStats,
      progressStats,
      reviewStats,
      enrollmentTrend,
      lessonProgress
    ] = await Promise.all([
      // Enrollment statistics
      req.prisma.enrollment.aggregate({
        where: { courseId },
        _count: true
      }),
      
      // Completion statistics
      req.prisma.enrollment.count({
        where: {
          courseId,
          status: 'COMPLETED'
        }
      }),
      
      // Average progress
      req.prisma.enrollment.aggregate({
        where: { courseId },
        _avg: { progress: true }
      }),
      
      // Review statistics
      req.prisma.review.aggregate({
        where: { courseId },
        _count: true,
        _avg: { rating: true }
      }),
      
      // Enrollment trend
      req.prisma.enrollment.groupBy({
        by: ['enrolledAt'],
        where: {
          courseId,
          enrolledAt: { gte: startDate }
        },
        _count: true,
        orderBy: {
          enrolledAt: 'asc'
        }
      }),
      
      // Lesson progress analytics
      req.prisma.lesson.findMany({
        where: {
          section: { courseId }
        },
        include: {
          progress: {
            where: {
              enrollment: { courseId }
            }
          }
        }
      })
    ]);

    // Calculate lesson completion rates
    const lessonAnalytics = lessonProgress.map(lesson => {
      const totalStudents = enrollmentStats._count;
      const completedCount = lesson.progress.filter(p => p.isCompleted).length;
      const completionRate = totalStudents > 0 ? (completedCount / totalStudents) * 100 : 0;
      
      return {
        lessonId: lesson.id,
        title: lesson.title,
        completionRate,
        totalViews: lesson.progress.length,
        averageTimeSpent: lesson.progress.reduce((acc, p) => acc + p.timeSpent, 0) / lesson.progress.length || 0
      };
    });

    res.json({
      success: true,
      data: {
        course: {
          id: course.id,
          title: course.title,
          thumbnail: course.thumbnail
        },
        enrollmentStats: {
          total: enrollmentStats._count,
          completed: completionStats,
          completionRate: enrollmentStats._count > 0 ? (completionStats / enrollmentStats._count) * 100 : 0
        },
        progressStats: {
          averageProgress: progressStats._avg.progress || 0
        },
        reviewStats: {
          total: reviewStats._count,
          averageRating: reviewStats._avg.rating || 0
        },
        enrollmentTrend,
        lessonAnalytics,
        timeframe
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
