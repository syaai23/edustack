const express = require('express');
const { auth, hasPermission } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const categories = await req.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { courses: true }
        }
      }
    });

    // Build hierarchical structure (only root categories)
    const rootCategories = categories.filter(cat => !cat.parentId);

    res.json({
      success: true,
      data: { categories: rootCategories }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/categories/:id
// @desc    Get category by ID
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await req.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        },
        courses: {
          where: {
            isPublished: true,
            status: 'PUBLISHED'
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
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
        },
        _count: {
          select: { courses: true }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: { category }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/categories
// @desc    Create new category
// @access  Private (Admin only)
router.post('/', auth, hasPermission('manage_categories'), validate(schemas.createCategory), async (req, res, next) => {
  try {
    const categoryData = req.body;

    // Generate slug from name
    const slug = categoryData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check if slug already exists
    const existingCategory = await req.prisma.category.findUnique({
      where: { slug }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    const category = await req.prisma.category.create({
      data: {
        ...categoryData,
        slug
      }
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category }
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/categories/:id
// @desc    Update category
// @access  Private (Admin only)
router.put('/:id', auth, hasPermission('manage_categories'), validate(schemas.updateCategory), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existingCategory = await req.prisma.category.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // If name is being updated, update slug
    if (updateData.name && updateData.name !== existingCategory.name) {
      const newSlug = updateData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const slugExists = await req.prisma.category.findFirst({
        where: {
          slug: newSlug,
          id: { not: id }
        }
      });

      if (slugExists) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }

      updateData.slug = newSlug;
    }

    const category = await req.prisma.category.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: { category }
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/categories/:id
// @desc    Delete category
// @access  Private (Admin only)
router.delete('/:id', auth, hasPermission('manage_categories'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await req.prisma.category.findUnique({
      where: { id },
      include: {
        courses: true,
        children: true
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has courses or children
    if (category.courses.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with courses. Move courses to another category first.'
      });
    }

    if (category.children.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with subcategories. Delete subcategories first.'
      });
    }

    await req.prisma.category.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
