const Joi = require('joi');

// Validation middleware factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Replace the request property with the validated and sanitized value
    req[property] = value;
    next();
  };
};

// Common validation schemas
const schemas = {
  // Auth schemas
  register: Joi.object({
    email: Joi.string().email().required(),
    username: Joi.string().alphanum().min(3).max(30).required(),
    firstName: Joi.string().min(1).max(50).required(),
    lastName: Joi.string().min(1).max(50).required(),
    password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required()
      .messages({
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
      }),
    userType: Joi.string().valid('student', 'tutor').required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  // User schemas
  updateProfile: Joi.object({
    firstName: Joi.string().min(1).max(50),
    lastName: Joi.string().min(1).max(50),
    bio: Joi.string().max(1000).allow('', null),
    phoneNumber: Joi.string().pattern(/^\\+?[1-9]\\d{1,14}$/).allow('', null),
    dateOfBirth: Joi.date().max('now'),
    gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'),
    location: Joi.string().max(100).allow('', null),
    timezone: Joi.string().max(50),
    language: Joi.string().max(10),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required(),
  }),

  // Course schemas
  createCourse: Joi.object({
    title: Joi.string().min(1).max(200).required(),
    description: Joi.string().min(10).max(5000).required(),
    shortDescription: Joi.string().max(500).allow('', null),
    categoryId: Joi.string().uuid().required(),
    price: Joi.number().min(0).max(10000).default(0),
    originalPrice: Joi.number().min(0).max(10000).allow(null),
    level: Joi.string().valid('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS').default('BEGINNER'),
    language: Joi.string().max(10).default('en'),
    tags: Joi.array().items(Joi.string().max(50)).max(10).default([]),
    requirements: Joi.array().items(Joi.string().max(200)).max(10).default([]),
    whatYouLearn: Joi.array().items(Joi.string().max(200)).max(20).default([]),
    targetAudience: Joi.array().items(Joi.string().max(200)).max(10).default([]),
  }),

  updateCourse: Joi.object({
    title: Joi.string().min(1).max(200),
    description: Joi.string().min(10).max(5000),
    shortDescription: Joi.string().max(500).allow('', null),
    categoryId: Joi.string().uuid(),
    price: Joi.number().min(0).max(10000),
    originalPrice: Joi.number().min(0).max(10000).allow(null),
    level: Joi.string().valid('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'),
    language: Joi.string().max(10),
    tags: Joi.array().items(Joi.string().max(50)).max(10),
    requirements: Joi.array().items(Joi.string().max(200)).max(10),
    whatYouLearn: Joi.array().items(Joi.string().max(200)).max(20),
    targetAudience: Joi.array().items(Joi.string().max(200)).max(10),
    status: Joi.string().valid('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'SUSPENDED', 'ARCHIVED'),
  }),

  // Section schemas
  createSection: Joi.object({
    title: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(1000).allow('', null),
    price: Joi.number().min(0).max(1000).default(0),
    sortOrder: Joi.number().integer().min(0).default(0),
  }),

  updateSection: Joi.object({
    title: Joi.string().min(1).max(200),
    description: Joi.string().max(1000).allow('', null),
    price: Joi.number().min(0).max(1000),
    sortOrder: Joi.number().integer().min(0),
    isActive: Joi.boolean(),
  }),

  // Lesson schemas
  createLesson: Joi.object({
    title: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(1000).allow('', null),
    contentType: Joi.string().valid('VIDEO', 'TEXT', 'QUIZ', 'ASSIGNMENT', 'DOCUMENT', 'INTERACTIVE').required(),
    content: Joi.object().required(),
    videoUrl: Joi.string().uri().allow('', null),
    videoDuration: Joi.number().integer().min(0).allow(null),
    textContent: Joi.string().max(50000).allow('', null),
    attachments: Joi.array().items(Joi.string().uri()).max(10).default([]),
    price: Joi.number().min(0).max(500).default(0),
    isPreview: Joi.boolean().default(false),
    sortOrder: Joi.number().integer().min(0).default(0),
  }),

  updateLesson: Joi.object({
    title: Joi.string().min(1).max(200),
    description: Joi.string().max(1000).allow('', null),
    contentType: Joi.string().valid('VIDEO', 'TEXT', 'QUIZ', 'ASSIGNMENT', 'DOCUMENT', 'INTERACTIVE'),
    content: Joi.object(),
    videoUrl: Joi.string().uri().allow('', null),
    videoDuration: Joi.number().integer().min(0).allow(null),
    textContent: Joi.string().max(50000).allow('', null),
    attachments: Joi.array().items(Joi.string().uri()).max(10),
    price: Joi.number().min(0).max(500),
    isPreview: Joi.boolean(),
    sortOrder: Joi.number().integer().min(0),
    isActive: Joi.boolean(),
  }),

  // Review schemas
  createReview: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    title: Joi.string().max(200).allow('', null),
    content: Joi.string().max(2000).allow('', null),
  }),

  updateReview: Joi.object({
    rating: Joi.number().integer().min(1).max(5),
    title: Joi.string().max(200).allow('', null),
    content: Joi.string().max(2000).allow('', null),
  }),

  // Comment schemas
  createComment: Joi.object({
    content: Joi.string().min(1).max(1000).required(),
    parentId: Joi.string().uuid().allow(null),
  }),

  updateComment: Joi.object({
    content: Joi.string().min(1).max(1000).required(),
  }),

  // Category schemas
  createCategory: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).allow('', null),
    parentId: Joi.string().uuid().allow(null),
    icon: Joi.string().max(100).allow('', null),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).allow('', null),
    sortOrder: Joi.number().integer().min(0).default(0),
  }),

  updateCategory: Joi.object({
    name: Joi.string().min(1).max(100),
    description: Joi.string().max(500).allow('', null),
    parentId: Joi.string().uuid().allow(null),
    icon: Joi.string().max(100).allow('', null),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).allow('', null),
    sortOrder: Joi.number().integer().min(0),
    isActive: Joi.boolean(),
  }),

  // Query parameter schemas
  paginationQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  courseQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().valid('createdAt', 'title', 'price', 'rating', 'enrollments').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    category: Joi.string().uuid(),
    level: Joi.string().valid('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'),
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
    language: Joi.string().max(10),
    search: Joi.string().max(100),
    tags: Joi.array().items(Joi.string().max(50)),
  }),
};

module.exports = {
  validate,
  schemas,
};
