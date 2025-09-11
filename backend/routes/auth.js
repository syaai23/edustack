const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { auth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', validate(schemas.register), async (req, res, next) => {
  try {
    const { email, username, firstName, lastName, password, userType } = req.body;

    // Check if user already exists
    const existingUser = await req.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email 
          ? 'User with this email already exists' 
          : 'Username already taken'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Get default role
    const defaultRole = await req.prisma.role.findUnique({
      where: { name: userType }
    });

    if (!defaultRole) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type'
      });
    }

    // Create user
    const user = await req.prisma.user.create({
      data: {
        email,
        username,
        firstName,
        lastName,
        password: hashedPassword,
        roles: {
          create: {
            roleId: defaultRole.id
          }
        },
        ...(userType === 'student' && {
          studentProfile: {
            create: {}
          }
        }),
        ...(userType === 'tutor' && {
          tutorProfile: {
            create: {}
          }
        })
      },
      include: {
        roles: {
          include: {
            role: true
          }
        },
        studentProfile: true,
        tutorProfile: true,
      }
    });

    // Generate token
    const token = generateToken(user.id);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validate(schemas.login), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user with roles and profiles
    const user = await req.prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        },
        permissions: {
          include: {
            permission: true
          }
        },
        studentProfile: true,
        tutorProfile: true,
        adminProfile: true,
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    await req.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate token
    const token = generateToken(user.id);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        },
        permissions: {
          include: {
            permission: true
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

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', auth, validate(schemas.changePassword), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get current user
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id }
    });

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await req.prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedNewPassword }
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await req.prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.'
      });
    }

    // In a real application, you would:
    // 1. Generate a secure reset token
    // 2. Store it in the database with an expiration time
    // 3. Send an email with the reset link

    // For now, just return success
    res.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.'
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/verify-email
// @desc    Verify user email
// @access  Public
router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body;

    // In a real application, you would:
    // 1. Verify the token
    // 2. Mark the user's email as verified

    // For now, just return success
    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (invalidate token on client side)
// @access  Private
router.post('/logout', auth, (req, res) => {
  // In a stateless JWT setup, logout is handled client-side
  // In a more advanced setup, you might maintain a token blacklist
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
