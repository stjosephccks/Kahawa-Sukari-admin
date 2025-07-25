import { getServerSession } from 'next-auth';
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS } from '@/models/Admin';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

/**
 * Check if a user has a specific permission
 * @param {string} userRole - The user's role
 * @param {string} requiredPermission - The permission to check for
 * @returns {boolean} Whether the user has the required permission
 */
export function hasPermission(userRole, requiredPermission) {
  if (!userRole) return false;
  if (userRole === ROLES.SUPER_ADMIN) return true;
  return ROLE_PERMISSIONS[userRole]?.includes(requiredPermission) || false;
}

/**
 * Middleware to protect API routes with required permissions
 * @param {Array} requiredPermissions - List of required permissions
 * @returns {Function} Middleware function
 */
export function requirePermissions(requiredPermissions = []) {
  return async (req, res, next) => {
    try {
      const session = await getServerSession(req, res, authOptions);
      
      if (!session?.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Super admin has all permissions
      if (session.user.role === ROLES.SUPER_ADMIN) {
        return next();
      }

      // Check if user has all required permissions
      const hasAllPermissions = requiredPermissions.every(permission => 
        hasPermission(session.user.role, permission)
      );

      if (!hasAllPermissions) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          requiredPermissions,
          userRole: session.user.role,
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Get the current user from the session
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @returns {Promise<Object|null>} The current user or null if not authenticated
 */
export async function getCurrentUser(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    return session?.user || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check if the current user is an admin
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @returns {Promise<boolean>} Whether the current user is an admin
 */
export async function isAdmin(req, res) {
  const user = await getCurrentUser(req, res);
  return !!user?.role; // Any role is considered an admin in this context
}

export {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
};
