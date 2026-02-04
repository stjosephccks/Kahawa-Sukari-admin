import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS } from "@/models/Admin";
import { AdminEmail } from "@/models/Admin";

/**
 * Check if the current user has the required permissions
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Array} requiredPermissions - Array of required permission strings
 * @returns {Promise<{hasAccess: boolean, user: Object|null, error: Object|null}>}
 */
export async function checkPermissions(req, res, requiredPermissions = []) {
  try {
    // Get the session
    const session = await getServerSession(req, res, authOptions);
    
    // If no session, user is not authenticated
    if (!session?.user) {
      return {
        hasAccess: false,
        user: null,
        error: { status: 401, message: 'Authentication required' }
      };
    }

    // Get the user from database to ensure they still exist and have valid permissions
    const user = await AdminEmail.findOne({ email: session.user.email });
    
    // If user not found in database
    if (!user) {
      return {
        hasAccess: false,
        user: null,
        error: { status: 403, message: 'User account not found' }
      };
    }

    // Super admin has all permissions
    if (user.role === ROLES.SUPER_ADMIN) {
      return { hasAccess: true, user, error: null };
    }

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every(permission => 
      user.role === ROLES.SUPER_ADMIN || 
      (ROLE_PERMISSIONS[user.role] || []).includes(permission)
    );

    if (!hasAllPermissions) {
      return {
        hasAccess: false,
        user,
        error: { 
          status: 403, 
          message: 'Insufficient permissions',
          requiredPermissions,
          userRole: user.role
        }
      };
    }

    return { hasAccess: true, user, error: null };
  } catch (error) {
    console.error('Permission check error:', error);
    return {
      hasAccess: false,
      user: null,
      error: { status: 500, message: 'Error checking permissions' }
    };
  }
}

/**
 * Middleware to protect API routes with required permissions
 * @param {Array} requiredPermissions - Array of required permission strings
 * @returns {Function} Express middleware function
 */
export function requirePermissions(requiredPermissions = []) {
  return async (req, res, next) => {
    const { hasAccess, user, error } = await checkPermissions(req, res, requiredPermissions);
    
    if (!hasAccess) {
      return res.status(error.status).json({ 
        error: error.message,
        ...(error.requiredPermissions && { requiredPermissions: error.requiredPermissions }),
        ...(error.userRole && { userRole: error.userRole })
      });
    }

    // Attach user to request for use in route handlers
    req.user = user;
    next();
  };
}

/**
 * Check if a user can modify a resource (creator or admin)
 * @param {Object} resource - The resource being accessed
 * @param {Object} user - The current user
 * @returns {boolean}
 */
export function canModifyResource(resource, user) {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (user.role === ROLES.EDITOR) return true;
  return resource.uploadedBy && resource.uploadedBy.toString() === user._id.toString();
}
