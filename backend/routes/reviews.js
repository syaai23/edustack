const express = require('express');
const { auth, isStudent } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/reviews/course/:courseId
// @desc    Get reviews for a course
// @access  Public
router.get('/course/:courseId', validate(schemas.paginationQuery, 'query'), async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { page, limit, sortBy, sortOrder } = req.query;
    const skip = (page - 1) * limit;

    const orderBy = {};
    if (sortBy === 'rating') {
      orderBy.rating = sortOrder;
    } else if (sortBy === 'helpful') {
      orderBy.likes = { _count: sortOrder };
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [reviews, totalCount, avgRating] = await Promise.all([
      req.prisma.review.findMany({
        where: {
          courseId,
          isPublished: true
        },
        skip,
        take: limit,
        orderBy,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            }
          },
          _count: {
            select: { likes: true }
          }
        }
      }),
      req.prisma.review.count({
        where: {
          courseId,
          isPublished: true
        }
      }),
      req.prisma.review.aggregate({
        where: {
          courseId,
          isPublished: true
        },
        _avg: {
          rating: true
        }
      })
    ]);

    // Get rating distribution
    const ratingDistribution = await req.prisma.review.groupBy({
      by: ['rating'],
      where: {
        courseId,
        isPublished: true
      },
      _count: {
        rating: true
      }
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        reviews,
        statistics: {
          totalReviews: totalCount,
          averageRating: avgRating._avg.rating || 0,
          ratingDistribution: ratingDistribution.reduce((acc, item) => {
            acc[item.rating] = item._count.rating;
            return acc;
          }, {})
        },
        pagination: {
          currentPage: page,
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

// @route   POST /api/reviews/:courseId
// @desc    Create a review for a course
// @access  Private (Students only)
router.post('/:courseId', auth, isStudent, validate(schemas.createReview), async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { rating, title, content } = req.body;
    const studentId = req.user.id;

    // Check if course exists
    const course = await req.prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if student is enrolled
    const enrollment = await req.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId
        }
      }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to leave a review'
      });
    }

    // Check if review already exists
    const existingReview = await req.prisma.review.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId
        }
      }
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this course'
      });
    }

    // Create review
    const review = await req.prisma.review.create({
      data: {
        studentId,
        courseId,
        rating,
        title,
        content,
        isPublished: true,
        isVerified: enrollment.status === 'COMPLETED'
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          }
        }
      }
    });

    // Update course statistics
    const [newAvgRating, reviewCount] = await Promise.all([
      req.prisma.review.aggregate({
        where: {
          courseId,
          isPublished: true
        },
        _avg: { rating: true }
      }),
      req.prisma.review.count({
        where: {
          courseId,
          isPublished: true
        }
      })
    ]);

    await req.prisma.course.update({
      where: { id: courseId },
      data: {
        averageRating: newAvgRating._avg.rating || 0,
        totalReviews: reviewCount
      }
    });

    // Update tutor statistics
    await req.prisma.tutor.update({
      where: { id: course.tutorId },
      data: {
        totalReviews: { increment: 1 }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: { review }
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/reviews/:courseId
// @desc    Update a review
// @access  Private (Review author only)
router.put('/:courseId', auth, isStudent, validate(schemas.updateReview), async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const updateData = req.body;
    const studentId = req.user.id;

    const existingReview = await req.prisma.review.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId
        }
      }
    });

    if (!existingReview) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    const review = await req.prisma.review.update({
      where: {
        studentId_courseId: {
          studentId,
          courseId
        }
      },
      data: updateData,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          }
        }
      }
    });

    // If rating changed, update course statistics
    if (updateData.rating !== undefined) {
      const newAvgRating = await req.prisma.review.aggregate({
        where: {
          courseId,
          isPublished: true
        },
        _avg: { rating: true }
      });

      await req.prisma.course.update({
        where: { id: courseId },
        data: {
          averageRating: newAvgRating._avg.rating || 0
        }
      });
    }

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: { review }
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/reviews/:courseId
// @desc    Delete a review
// @access  Private (Review author only)
router.delete('/:courseId', auth, isStudent, async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    const review = await req.prisma.review.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId
        }
      },
      include: {
        course: true
      }
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    await req.prisma.review.delete({
      where: {
        studentId_courseId: {
          studentId,
          courseId
        }
      }
    });

    // Update course statistics
    const [newAvgRating, reviewCount] = await Promise.all([
      req.prisma.review.aggregate({
        where: {
          courseId,
          isPublished: true
        },
        _avg: { rating: true }
      }),
      req.prisma.review.count({
        where: {
          courseId,
          isPublished: true
        }
      })
    ]);

    await req.prisma.course.update({
      where: { id: courseId },
      data: {
        averageRating: newAvgRating._avg.rating || 0,
        totalReviews: reviewCount
      }
    });

    // Update tutor statistics
    await req.prisma.tutor.update({
      where: { id: review.course.tutorId },
      data: {
        totalReviews: { decrement: 1 }
      }
    });

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/reviews/:reviewId/like
// @desc    Like/unlike a review
// @access  Private
router.post('/:reviewId/like', auth, async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    // Check if review exists
    const review = await req.prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if already liked
    const existingLike = await req.prisma.like.findUnique({
      where: {
        userId_reviewId: {
          userId,
          reviewId
        }
      }
    });

    if (existingLike) {
      // Unlike
      await req.prisma.like.delete({
        where: {
          userId_reviewId: {
            userId,
            reviewId
          }
        }
      });

      res.json({
        success: true,
        message: 'Review unliked',
        data: { liked: false }
      });
    } else {
      // Like
      await req.prisma.like.create({
        data: {
          userId,
          reviewId
        }
      });

      res.json({
        success: true,
        message: 'Review liked',
        data: { liked: true }
      });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
