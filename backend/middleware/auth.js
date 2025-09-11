const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided, authorization denied' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database with roles and permissions
    const user = await req.prisma.user.findUnique({
      where: { id: decoded.userId },
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
        message: 'Token is not valid or user is inactive' 
      });
    }

    // Combine role permissions and direct user permissions
    const rolePermissions = user.roles.flatMap(ur => 
      ur.role.permissions.map(rp => rp.permission.name)
    );
    const userPermissions = user.permissions.map(up => up.permission.name);
    
    req.user = {
      ...user,
      permissions: [...new Set([...rolePermissions, ...userPermissions])]
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Token is not valid' 
    });
  }
};

// Check if user has specific permission
const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

// Check if user has any of the specified roles
const hasRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const userRoles = req.user.roles.map(ur => ur.role.name);
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient role privileges' 
      });
    }

    next();
  };
};

// Check if user is a tutor
const isTutor = (req, res, next) => {
  if (!req.user || !req.user.tutorProfile) {
    return res.status(403).json({ 
      success: false, 
      message: 'Tutor access required' 
    });
  }
  next();
};

// Check if user is a student
const isStudent = (req, res, next) => {
  if (!req.user || !req.user.studentProfile) {
    return res.status(403).json({ 
      success: false, 
      message: 'Student access required' 
    });
  }
  next();
};

// Check if user is an admin
const isAdmin = (req, res, next) => {
  if (!req.user || !req.user.adminProfile) {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin access required' 
    });
  }
  next();
};

module.exports = {
  auth,
  hasPermission,
  hasRole,
  isTutor,
  isStudent,
  isAdmin,
};
