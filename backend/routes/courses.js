const express = require('express');
const { auth, isTutor, hasPermission } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/courses
// @desc    Get all courses with filtering and pagination
// @access  Public
router.get('/', validate(schemas.courseQuery, 'query'), async (req, res, next) => {
  try {
    const {
      page,
      limit,
      sortBy,
      sortOrder,
      category,
      level,
      minPrice,
      maxPrice,
      language,
      search,
      tags
    } = req.query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      isPublished: true,
      status: 'PUBLISHED',
      ...(category && { categoryId: category }),
      ...(level && { level }),
      ...(language && { language }),
      ...(minPrice !== undefined || maxPrice !== undefined) && {
        price: {
          ...(minPrice !== undefined && { gte: parseFloat(minPrice) }),
          ...(maxPrice !== undefined && { lte: parseFloat(maxPrice) })
        }
      },
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { tags: { hasSome: [search] } }
        ]
      }),
      ...(tags && tags.length > 0 && {
        tags: { hasSome: Array.isArray(tags) ? tags : [tags] }
      })
    };

    // Build orderBy clause
    let orderBy = {};
    switch (sortBy) {
      case 'price':
        orderBy = { price: sortOrder };
        break;
      case 'rating':
        orderBy = { averageRating: sortOrder };
        break;
      case 'enrollments':
        orderBy = { totalEnrollments: sortOrder };
        break;
      case 'title':
        orderBy = { title: sortOrder };
        break;
      default:
        orderBy = { createdAt: sortOrder };
    }

    const [courses, totalCount] = await Promise.all([
      req.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          tutor: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                }
              }
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            }
          },
          _count: {
            select: {
              enrollments: true,
              reviews: true,
              sections: true,
            }
          }
        }
      }),
      req.prisma.course.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        courses,
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

// @route   GET /api/courses/:id
// @desc    Get single course by ID
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const course = await req.prisma.course.findUnique({
      where: { id },
      include: {
        tutor: {
          include: {
            user: {
              select: {
                id: true,
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
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                contentType: true,
                videoDuration: true,
                isPreview: true,
                sortOrder: true,
              }
            },
            _count: {
              select: { lessons: true }
            }
          }
        },
        reviews: {
          where: { isPublished: true },
          take: 5,
          orderBy: { createdAt: 'desc' },
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
        },
        _count: {
          select: {
            enrollments: true,
            reviews: true,
            likes: true,
          }
        }
      }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if course is accessible
    if (!course.isPublished || course.status !== 'PUBLISHED') {
      // Only allow tutor and admins to view unpublished courses
      if (!req.user || (req.user.id !== course.tutor.userId && !req.user.adminProfile)) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }
    }

    // Increment view count
    await req.prisma.course.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    });

    res.json({
      success: true,
      data: { course }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/courses
// @desc    Create new course
// @access  Private (Tutors only)
router.post('/', auth, isTutor, validate(schemas.createCourse), async (req, res, next) => {
  try {
    const courseData = req.body;
    
    // Generate slug from title
    const slug = courseData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check if slug already exists
    const existingCourse = await req.prisma.course.findUnique({
      where: { slug }
    });

    if (existingCourse) {
      // Append timestamp to make unique
      courseData.slug = `${slug}-${Date.now()}`;
    } else {
      courseData.slug = slug;
    }

    const course = await req.prisma.course.create({
      data: {
        ...courseData,
        tutorId: req.user.tutorProfile.id,
      },
      include: {
        tutor: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              }
            }
          }
        },
        category: true,
      }
    });

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: { course }
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/courses/:id
// @desc    Update course
// @access  Private (Course tutor or admin)
router.put('/:id', auth, validate(schemas.updateCourse), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if course exists and get current data
    const existingCourse = await req.prisma.course.findUnique({
      where: { id },
      include: { tutor: true }
    });

    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check permissions
    const isOwner = req.user.tutorProfile && req.user.tutorProfile.id === existingCourse.tutorId;
    const isAdmin = req.user.adminProfile;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own courses'
      });
    }

    // If title is being updated, update slug
    if (updateData.title && updateData.title !== existingCourse.title) {
      const newSlug = updateData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const slugExists = await req.prisma.course.findFirst({
        where: {
          slug: newSlug,
          id: { not: id }
        }
      });

      if (slugExists) {
        updateData.slug = `${newSlug}-${Date.now()}`;
      } else {
        updateData.slug = newSlug;
      }
    }

    const course = await req.prisma.course.update({
      where: { id },
      data: updateData,
      include: {
        tutor: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              }
            }
          }
        },
        category: true,
        _count: {
          select: {
            enrollments: true,
            reviews: true,
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: { course }
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/courses/:id
// @desc    Delete course
// @access  Private (Course tutor or admin)
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const course = await req.prisma.course.findUnique({
      where: { id },
      include: { tutor: true }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check permissions
    const isOwner = req.user.tutorProfile && req.user.tutorProfile.id === course.tutorId;
    const isAdmin = req.user.adminProfile;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own courses'
      });
    }

    // Check if course has enrollments
    const enrollmentCount = await req.prisma.enrollment.count({
      where: { courseId: id }
    });

    if (enrollmentCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete course with active enrollments. Archive it instead.'
      });
    }

    await req.prisma.course.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/courses/:id/publish
// @desc    Publish course
// @access  Private (Course tutor or admin)
router.post('/:id/publish', auth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const course = await req.prisma.course.findUnique({
      where: { id },
      include: {
        tutor: true,
        sections: {
          include: {
            lessons: true
          }
        }
      }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check permissions
    const isOwner = req.user.tutorProfile && req.user.tutorProfile.id === course.tutorId;
    const isAdmin = req.user.adminProfile;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only publish your own courses'
      });
    }

    // Check if course is ready for publishing
    if (course.sections.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Course must have at least one section to be published'
      });
    }

    const hasLessons = course.sections.some(section => section.lessons.length > 0);
    if (!hasLessons) {
      return res.status(400).json({
        success: false,
        message: 'Course must have at least one lesson to be published'
      });
    }

    const updatedCourse = await req.prisma.course.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        isPublished: true,
        publishedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Course published successfully',
      data: { course: updatedCourse }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/courses/:id/students
// @desc    Get course students (for tutor)
// @access  Private (Course tutor or admin)
router.get('/:id/students', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const course = await req.prisma.course.findUnique({
      where: { id },
      include: { tutor: true }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check permissions
    const isOwner = req.user.tutorProfile && req.user.tutorProfile.id === course.tutorId;
    const isAdmin = req.user.adminProfile;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [enrollments, totalCount] = await Promise.all([
      req.prisma.enrollment.findMany({
        where: { courseId: id },
        skip,
        take: parseInt(limit),
        orderBy: { enrolledAt: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            }
          }
        }
      }),
      req.prisma.enrollment.count({
        where: { courseId: id }
      })
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

module.exports = router;
