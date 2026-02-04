import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { AdminEmail, ROLES } from "@/models/Admin";
import { mongooseConnect } from "./mongoose";

/**
 * Ensures the request is from an authenticated admin.
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @returns {Promise<Object|null>} The user object if authenticated, otherwise null (response sent)
 */
export async function requireAdmin(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user || !session.user.email) {
      if (!res.writableEnded) {
        res.status(401).json({ error: "Authentication required" });
      }
      return null;
    }

    await mongooseConnect();
    const user = await AdminEmail.findOne({ email: session.user.email });
    
    if (!user) {
      if (!res.writableEnded) {
        res.status(403).json({ error: "Account not found or access denied" });
      }
      return null;
    }

    if (user.status === 'inactive') {
      if (!res.writableEnded) {
        res.status(403).json({ error: "Account is inactive" });
      }
      return null;
    }

    return user;
  } catch (error) {
    console.error("requireAdmin error:", error);
    if (!res.writableEnded) {
      res.status(500).json({ error: "Internal server error during authentication" });
    }
    return null;
  }
}

/**
 * Check if the user has a specific permission or role.
 * Super admins always have access.
 * @param {Object} user - The user object from requireAdmin
 * @param {string|Array} roles - Allowed role(s)
 * @returns {boolean}
 */
export function hasRole(user, roles) {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  
  if (Array.isArray(roles)) {
    return roles.includes(user.role);
  }
  return user.role === roles;
}
