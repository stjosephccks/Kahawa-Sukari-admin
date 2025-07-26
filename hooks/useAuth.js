import { useSession } from 'next-auth/react';
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS } from '@/models/Admin';

/**
 * Custom hook for authentication and permission checks
 * @returns {Object} Authentication and permission utilities
 */
export function useAuth() {
  const { data: session, status } = useSession();
  const user = session?.user || {};
  
  /**
   * Check if the current user has a specific permission
   * @param {string} permission - The permission to check
   * @returns {boolean} Whether the user has the permission
   */
  const hasPermission = (permission) => {
    if (!user?.role) return false;
    if (user.role === 'super_admin') return true;
    return ROLE_PERMISSIONS[user.role]?.includes(permission) || false;
  };

  /**
   * Check if the current user has all of the specified permissions
   * @param {Array} permissions - List of permissions to check
   * @returns {boolean} Whether the user has all permissions
   */
  const hasAllPermissions = (permissions = []) => {
    if (!user?.role) return false;
    if (user.role === ROLES.SUPER_ADMIN) return true;
    return permissions.every(permission => hasPermission(permission));
  };

  /**
   * Check if the current user has any of the specified permissions
   * @param {Array} permissions - List of permissions to check
   * @returns {boolean} Whether the user has any of the permissions
   */
  const hasAnyPermission = (permissions = []) => {
    if (!user?.role) return false;
    if (user.role === ROLES.SUPER_ADMIN) return true;
    return permissions.some(permission => hasPermission(permission));
  };

  // Common permission checks
  const canEdit = hasPermission(PERMISSIONS.EDIT);
  const canDelete = hasPermission(PERMISSIONS.DELETE);
  const canPublish = hasPermission(PERMISSIONS.PUBLISH);

  return {
    // Auth state
    user,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    role: user?.role,
    
    // Permission checkers
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    
    // Common permission shortcuts
    canEdit,
    canDelete,
    canPublish,
    
    // Roles and permissions constants
    ROLES,
    PERMISSIONS,
  };
}

/**
 * Higher-Order Component to protect routes based on permissions
 * @param {React.Component} Component - The component to protect
 * @param {Object} options - Options for the HOC
 * @param {Array} options.requiredPermissions - Required permissions to access the component
 * @param {React.Component} options.LoadingComponent - Component to show while loading
 * @param {React.Component} options.AccessDeniedComponent - Component to show if access is denied
 * @returns {React.Component} Protected component
 */
export function withAuth(Component, options = {}) {
  const {
    requiredPermissions = [],
    LoadingComponent = () => <div>Loading...</div>,
    AccessDeniedComponent = () => <div>Access Denied</div>,
  } = options;

  return function WithAuth(props) {
    const { user, isAuthenticated, isLoading, hasAllPermissions } = useAuth();

    if (isLoading) {
      return <LoadingComponent />;
    }

    if (!isAuthenticated) {
      return <AccessDeniedComponent />;
    }

    if (requiredPermissions.length > 0 && !hasAllPermissions(requiredPermissions)) {
      return <AccessDeniedComponent />;
    }

    return <Component {...props} user={user} />;
  };
}

export default useAuth;
