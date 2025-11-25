import { useState, useEffect } from 'react';

export interface UserPermissions {
  canViewDashboard: boolean;
  canViewOrders: boolean;
  canViewProducts: boolean;
  canViewCustomers: boolean;
  canViewInventory: boolean;
  canViewFinance: boolean;
  canViewWarehouse: boolean;
  canViewSettings: boolean;
  canEditOrders: boolean;
  canEditProducts: boolean;
  canEditCustomers: boolean;
  canEditInventory: boolean;
  canEditFinance: boolean;
  canEditWarehouse: boolean;
  canEditSettings: boolean;
  canDeleteOrders: boolean;
  canDeleteProducts: boolean;
  canDeleteCustomers: boolean;
  canDeleteInventory: boolean;
  canDeleteFinance: boolean;
  canDeleteWarehouse: boolean;
  canInviteUsers: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canExportData: boolean;
}

const DEFAULT_PERMISSIONS: UserPermissions = {
  canViewDashboard: true,
  canViewOrders: true,
  canViewProducts: true,
  canViewCustomers: true,
  canViewInventory: true,
  canViewFinance: true,
  canViewWarehouse: true,
  canViewSettings: true,
  canEditOrders: false,
  canEditProducts: false,
  canEditCustomers: false,
  canEditInventory: false,
  canEditFinance: false,
  canEditWarehouse: false,
  canEditSettings: false,
  canDeleteOrders: false,
  canDeleteProducts: false,
  canDeleteCustomers: false,
  canDeleteInventory: false,
  canDeleteFinance: false,
  canDeleteWarehouse: false,
  canInviteUsers: false,
  canManageUsers: false,
  canViewReports: true,
  canExportData: true,
};

const ROLE_PERMISSIONS: Record<string, UserPermissions> = {
  admin: {
    ...DEFAULT_PERMISSIONS,
    canEditOrders: true,
    canEditProducts: true,
    canEditCustomers: true,
    canEditInventory: true,
    canEditFinance: true,
    canEditWarehouse: true,
    canEditSettings: true,
    canDeleteOrders: true,
    canDeleteProducts: true,
    canDeleteCustomers: true,
    canDeleteInventory: true,
    canDeleteFinance: true,
    canDeleteWarehouse: true,
    canInviteUsers: true,
    canManageUsers: true,
  },
  manager: {
    ...DEFAULT_PERMISSIONS,
    canEditOrders: true,
    canEditProducts: true,
    canEditCustomers: true,
    canEditInventory: true,
    canEditFinance: true,
    canEditWarehouse: true,
    canDeleteOrders: false,
    canDeleteProducts: false,
    canDeleteCustomers: false,
    canDeleteInventory: false,
    canDeleteFinance: false,
    canDeleteWarehouse: false,
    canInviteUsers: true,
    canManageUsers: false,
  },
  editor: {
    ...DEFAULT_PERMISSIONS,
    canEditOrders: true,
    canEditProducts: true,
    canEditCustomers: true,
    canEditInventory: true,
    canEditFinance: false,
    canEditWarehouse: true,
    canDeleteOrders: false,
    canDeleteProducts: false,
    canDeleteCustomers: false,
    canDeleteInventory: false,
    canDeleteFinance: false,
    canDeleteWarehouse: false,
    canInviteUsers: false,
    canManageUsers: false,
  },
  viewer: DEFAULT_PERMISSIONS,
};

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('viewer');

  useEffect(() => {
    loadUserPermissions();
  }, []);

  const loadUserPermissions = async () => {
    try {
      // In a real implementation, you would fetch this from the API
      // For now, we'll try to get it from localStorage or default to admin
      const storedRole = localStorage.getItem('mlt-user-role') || 'admin';
      const rolePermissions = ROLE_PERMISSIONS[storedRole] || DEFAULT_PERMISSIONS;

      setUserRole(storedRole);
      setPermissions(rolePermissions);
    } catch {
      setPermissions(DEFAULT_PERMISSIONS);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: keyof UserPermissions): boolean => {
    return permissions[permission] || false;
  };

  const hasAnyPermission = (permissionsToCheck: (keyof UserPermissions)[]): boolean => {
    return permissionsToCheck.some((permission) => hasPermission(permission));
  };

  const hasAllPermissions = (permissionsToCheck: (keyof UserPermissions)[]): boolean => {
    return permissionsToCheck.every((permission) => hasPermission(permission));
  };

  return {
    permissions,
    loading,
    userRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
};
