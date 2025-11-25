import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Group,
  Button,
  Stack,
  Table,
  Badge,
  ActionIcon,
  Modal,
  TextInput,
  Select,
  MultiSelect,
  LoadingOverlay,
  Tabs,
  Card,
  Grid,
  Avatar,
  Menu,
  ScrollArea,
  Tooltip,
} from '@mantine/core';
import {
  IconMail,
  IconSend,
  IconRefresh,
  IconX,
  IconTrash,
  IconEdit,
  IconDots,
  IconCheck,
  IconClock,
  IconAlertCircle,
  IconUsers,
  IconUserPlus,
  IconShield,
  IconCrown,
  IconUser,
  IconEye,
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import api from '../../../services/api';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  permissions: UserPermission[];
}

interface UserPermission {
  tabId: string;
  tabName: string;
  hasAccess: boolean;
}

interface Invitation {
  id: number;
  email: string;
  name: string;
  role: string;
  invitedAt: string;
  expiresAt: string;
  invitedBy: string;
  status: string;
  isExpired: boolean;
  isPending: boolean;
  canBeResent: boolean;
  permissions?: UserPermission[];
}

interface InvitationStats {
  totalInvitations: number;
  pendingCount: number;
  expiredCount: number;
  acceptedCount: number;
}

// Available roles
const ROLES = [
  { value: 'SuperAdmin', label: 'Super Admin - System Owner' },
  { value: 'Admin', label: 'Admin - Full Access' },
  { value: 'User', label: 'User - Basic Access' },
  { value: 'Viewer', label: 'Viewer - Read Only' },
];

// Available permissions/features
const AVAILABLE_PERMISSIONS = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'orders', label: 'Orders Management' },
  { value: 'products', label: 'Products Management' },
  { value: 'inventory', label: 'Inventory Management' },
  { value: 'customers', label: 'Customer Management' },
  { value: 'analytics', label: 'Analytics & Reports' },
  { value: 'pdf-tools', label: 'PDF Tools' },
  { value: 'barcode-tools', label: 'Barcode Tools' },
  { value: 'job-management', label: 'Job Management' },
  { value: 'label-management', label: 'Label Management' },
  { value: 'user-management', label: 'User Management' },
  { value: 'settings', label: 'System Settings' },
];

// Role-based default permissions
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SuperAdmin: AVAILABLE_PERMISSIONS.map((p) => p.value),
  Admin: AVAILABLE_PERMISSIONS.map((p) => p.value),
  User: ['dashboard', 'orders', 'products', 'inventory', 'customers', 'pdf-tools'],
  Viewer: ['dashboard', 'orders', 'products', 'customers'],
};

const TeamManagement: React.FC = () => {
  // State
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [stats, setStats] = useState<InvitationStats>({
    totalInvitations: 0,
    pendingCount: 0,
    expiredCount: 0,
    acceptedCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('team');
  const [currentUserRole, setCurrentUserRole] = useState<string>('');

  // Modal states
  const [inviteModalOpened, { open: openInviteModal, close: closeInviteModal }] =
    useDisclosure(false);
  const [
    editPermissionsModalOpened,
    { open: openEditPermissionsModal, close: closeEditPermissionsModal },
  ] = useDisclosure(false);

  // Form states
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    role: 'User',
    permissions: ROLE_PERMISSIONS['User'],
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);

  // Load users
  const loadUsers = useCallback(async () => {
    try {
      const response = await api.get('/usermanagement');
      if (response.data.success) {
        setUsers(response.data.users);
      }
    } catch (_error) {
      console.error('Error loading users:', _error);
    }
  }, []);

  // Load invitations
  const loadInvitations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/invitation/all');
      if (response.data.success) {
        setInvitations(response.data.invitations);

        // Calculate stats
        const pending = response.data.invitations.filter((inv: Invitation) => inv.isPending).length;
        const expired = response.data.invitations.filter((inv: Invitation) => inv.isExpired).length;
        const accepted = response.data.invitations.filter(
          (inv: Invitation) => inv.status === 'Accepted',
        ).length;

        setStats({
          totalInvitations: response.data.invitations.length,
          pendingCount: pending,
          expiredCount: expired,
          acceptedCount: accepted,
        });
      }
    } catch (_error) {
      console.error('Error loading invitations:', _error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load team and invitation data
  const loadTeamData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadUsers(), loadInvitations()]);
    } catch (_error) {
      console.error('Error loading team data:', _error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load team data',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  }, [loadUsers, loadInvitations]);

  // Load data on component mount
  useEffect(() => {
    loadTeamData();
    // Get current user role from localStorage
    const user = JSON.parse(localStorage.getItem('mlt-admin-user') || '{}');
    setCurrentUserRole(user.role || '');
  }, [loadTeamData]);

  // Send invitation
  const sendInvitation = async () => {
    if (!inviteForm.email || !inviteForm.name || !inviteForm.role) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please fill in all required fields',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    setLoading(true);
    try {
      const permissions = inviteForm.permissions.map((permId) => {
        const perm = AVAILABLE_PERMISSIONS.find((p) => p.value === permId);
        return {
          tabId: permId,
          tabName: perm?.label || permId,
          hasAccess: true,
        };
      });

      const response = await api.post('/invitation/send', {
        email: inviteForm.email,
        name: inviteForm.name,
        role: inviteForm.role,
        permissions: permissions,
      });

      if (response.data.success) {
        notifications.show({
          title: 'Invitation Sent',
          message: `Invitation sent to ${inviteForm.email} successfully`,
          color: 'green',
          icon: <IconCheck size={16} />,
        });

        // Reset form and close modal
        setInviteForm({
          email: '',
          name: '',
          role: 'User',
          permissions: ROLE_PERMISSIONS['User'],
        });
        closeInviteModal();

        // Reload invitations
        await loadInvitations();
      } else {
        notifications.show({
          title: 'Error',
          message: response.data.message || 'Failed to send invitation',
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
      }
    } catch (_error: unknown) {
      console.error('Error sending invitation:', _error);
      const errorMessage =
        _error instanceof Error && 'response' in _error
          ? (_error as { response: { data: { message: string } } }).response?.data?.message
          : 'Failed to send invitation';
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  // Resend invitation
  const resendInvitation = async (email: string) => {
    setLoading(true);
    try {
      const response = await api.post('/invitation/resend', { email });

      if (response.data.success) {
        notifications.show({
          title: 'Invitation Resent',
          message: `Invitation resent to ${email} successfully`,
          color: 'green',
          icon: <IconCheck size={16} />,
        });
        await loadInvitations();
      }
    } catch (_error: unknown) {
      console.error('Error resending invitation:', _error);
      const errorMessage =
        _error instanceof Error && 'response' in _error
          ? (_error as { response: { data: { message: string } } }).response?.data?.message
          : 'Failed to resend invitation';
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  // Cancel invitation
  const cancelInvitation = async (invitationId: number) => {
    setLoading(true);
    try {
      const response = await api.post('/invitation/cancel', { invitationId });

      if (response.status === 200) {
        notifications.show({
          title: 'Invitation Cancelled',
          message: 'Invitation cancelled successfully',
          color: 'green',
          icon: <IconCheck size={16} />,
        });
        await loadInvitations();
      }
    } catch (_error: unknown) {
      console.error('Error cancelling invitation:', _error);
      const errorMessage =
        _error instanceof Error && 'response' in _error
          ? (_error as { response: { data: { message: string } } }).response?.data?.message
          : 'Failed to cancel invitation';
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle role change in invite form
  const handleRoleChange = (role: string) => {
    setInviteForm((prev) => ({
      ...prev,
      role,
      permissions: ROLE_PERMISSIONS[role] || [],
    }));
  };

  // Get status badge
  const getStatusBadge = (invitation: Invitation) => {
    if (invitation.status === 'Accepted') {
      return (
        <Badge color="green" variant="light">
          Accepted
        </Badge>
      );
    }
    if (invitation.isExpired) {
      return (
        <Badge color="red" variant="light">
          Expired
        </Badge>
      );
    }
    if (invitation.isPending) {
      return (
        <Badge color="blue" variant="light">
          Pending
        </Badge>
      );
    }
    if (invitation.status === 'Cancelled') {
      return (
        <Badge color="gray" variant="light">
          Cancelled
        </Badge>
      );
    }
    return (
      <Badge color="gray" variant="light">
        {invitation.status}
      </Badge>
    );
  };

  // Get role badge
  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      SuperAdmin: 'violet',
      Admin: 'red',
      Manager: 'orange',
      User: 'blue',
      Viewer: 'gray',
    };

    const icons: Record<string, React.ReactNode> = {
      SuperAdmin: <IconCrown size={12} stroke={2.5} />,
      Admin: <IconCrown size={12} />,
      Manager: <IconShield size={12} />,
      User: <IconUser size={12} />,
      Viewer: <IconEye size={12} />,
    };

    return (
      <Badge color={colors[role] || 'blue'} variant="light" leftSection={icons[role]}>
        {role}
      </Badge>
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Check if current user can manage the target user
  const canManageUser = (targetUserRole: string) => {
    // SuperAdmin can manage everyone
    if (currentUserRole === 'SuperAdmin') {
      return true;
    }

    // Admin can manage everyone except SuperAdmin and other Admins
    if (currentUserRole === 'Admin') {
      return targetUserRole !== 'SuperAdmin' && targetUserRole !== 'Admin';
    }

    // Other roles can't manage anyone
    return false;
  };

  // Check if user can be invited with specific role
  const canInviteWithRole = (role: string) => {
    // SuperAdmin can invite any role except SuperAdmin (SuperAdmin is set manually for the first user)
    if (currentUserRole === 'SuperAdmin') {
      return role !== 'SuperAdmin';
    }

    // Admin can invite User and Viewer roles only
    if (currentUserRole === 'Admin') {
      return role === 'User' || role === 'Viewer';
    }

    // Other roles can't invite anyone
    return false;
  };

  // Deactivate user
  const deactivateUser = async (userId: string) => {
    setLoading(true);
    try {
      const response = await api.post(`/usermanagement/${userId}/deactivate`);

      if (response.status === 200) {
        notifications.show({
          title: 'User Deactivated',
          message: 'User deactivated successfully',
          color: 'green',
          icon: <IconCheck size={16} />,
        });
        await loadUsers();
      } else {
        notifications.show({
          title: 'Error',
          message: response.data?.message || 'Failed to deactivate user',
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
      }
    } catch (_error: unknown) {
      console.error('Error deactivating user:', _error);
      const errorMessage =
        _error instanceof Error && 'response' in _error
          ? (_error as { response: { data: { message: string } } }).response?.data?.message
          : 'Failed to deactivate user';
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  // Activate user
  const activateUser = async (userId: string) => {
    setLoading(true);
    try {
      const response = await api.post(`/usermanagement/${userId}/activate`);

      if (response.status === 200) {
        notifications.show({
          title: 'User Activated',
          message: 'User activated successfully',
          color: 'green',
          icon: <IconCheck size={16} />,
        });
        await loadUsers();
      } else {
        notifications.show({
          title: 'Error',
          message: response.data?.message || 'Failed to activate user',
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
      }
    } catch (_error: unknown) {
      console.error('Error activating user:', _error);
      const errorMessage =
        _error instanceof Error && 'response' in _error
          ? (_error as { response: { data: { message: string } } }).response?.data?.message
          : 'Failed to activate user';
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  // Remove user
  const removeUser = async (userId: string) => {
    if (
      !window.confirm('Are you sure you want to remove this user? This action cannot be undone.')
    ) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.delete(`/usermanagement/${userId}`);

      if (response.status === 200) {
        notifications.show({
          title: 'User Removed',
          message: 'User removed successfully',
          color: 'green',
          icon: <IconCheck size={16} />,
        });
        await loadUsers();
      } else {
        notifications.show({
          title: 'Error',
          message: response.data?.message || 'Failed to remove user',
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
      }
    } catch (_error: unknown) {
      console.error('Error removing user:', _error);
      const errorMessage =
        _error instanceof Error && 'response' in _error
          ? (_error as { response: { data: { message: string } } }).response?.data?.message
          : 'Failed to remove user. You may not have sufficient permissions.';
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  // In the render function, update the available roles dropdown based on current user role
  const availableRolesToInvite = ROLES.filter((role) => canInviteWithRole(role.value));

  return (
    <Container size="xl">
      <LoadingOverlay visible={loading} />

      {/* Header */}
      <Group justify="space-between" mb="md">
        <div>
          <Title order={2}>Team Management</Title>
          <Text c="dimmed" size="sm">
            Manage team members and invitations
          </Text>
        </div>
        <Button leftSection={<IconUserPlus size={16} />} onClick={openInviteModal}>
          Invite Team Member
        </Button>
      </Group>

      {/* Stats Cards */}
      <Grid mb="xl">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  Total Users
                </Text>
                <Text fw={700} size="xl">
                  {users.length + stats.acceptedCount}
                </Text>
              </div>
              <IconUsers size={24} color="var(--mantine-color-blue-6)" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  Pending Invites
                </Text>
                <Text fw={700} size="xl">
                  {stats.pendingCount}
                </Text>
              </div>
              <IconClock size={24} color="var(--mantine-color-orange-6)" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  Expired Invites
                </Text>
                <Text fw={700} size="xl">
                  {stats.expiredCount}
                </Text>
              </div>
              <IconAlertCircle size={24} color="var(--mantine-color-red-6)" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  Total Invites
                </Text>
                <Text fw={700} size="xl">
                  {stats.totalInvitations}
                </Text>
              </div>
              <IconMail size={24} color="var(--mantine-color-green-6)" />
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'team')}>
        <Tabs.List>
          <Tabs.Tab value="team" leftSection={<IconUsers size={16} />}>
            Team Members
          </Tabs.Tab>
          <Tabs.Tab value="invitations" leftSection={<IconMail size={16} />}>
            Invitations ({stats.pendingCount})
          </Tabs.Tab>
        </Tabs.List>

        {/* Team Members Tab */}
        <Tabs.Panel value="team">
          <Paper withBorder mt="md">
            <ScrollArea>
              <Table highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>User</Table.Th>
                    <Table.Th>Role</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Joined</Table.Th>
                    <Table.Th>Last Login</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {users.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={6}>
                        <Text ta="center" c="dimmed" py="xl">
                          No team members found. Start by inviting users!
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    users.map((user) => (
                      <Table.Tr key={user.id}>
                        <Table.Td>
                          <Group gap="sm">
                            <Avatar size={32} radius="xl">
                              {user.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <div>
                              <Text fw={500}>{user.name}</Text>
                              <Text size="xs" c="dimmed">
                                {user.email}
                              </Text>
                            </div>
                          </Group>
                        </Table.Td>
                        <Table.Td>{getRoleBadge(user.role)}</Table.Td>
                        <Table.Td>
                          <Badge color={user.isActive ? 'green' : 'red'} variant="light">
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{formatDate(user.createdAt)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={5}>
                            <Menu shadow="md" width={200} position="bottom-end">
                              <Menu.Target>
                                <ActionIcon variant="subtle" color="gray">
                                  <IconDots size={16} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Label>User Actions</Menu.Label>
                                <Menu.Item
                                  leftSection={<IconEdit size={14} />}
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setEditingPermissions(
                                      user.permissions
                                        .filter((p) => p.hasAccess)
                                        .map((p) => p.tabId),
                                    );
                                    openEditPermissionsModal();
                                  }}
                                  disabled={!canManageUser(user.role)}
                                >
                                  Edit Permissions
                                </Menu.Item>

                                {user.isActive ? (
                                  <Menu.Item
                                    leftSection={<IconX size={14} />}
                                    color="red"
                                    onClick={() => deactivateUser(user.id)}
                                    disabled={!canManageUser(user.role)}
                                  >
                                    Deactivate User
                                  </Menu.Item>
                                ) : (
                                  <Menu.Item
                                    leftSection={<IconCheck size={14} />}
                                    color="green"
                                    onClick={() => activateUser(user.id)}
                                    disabled={!canManageUser(user.role)}
                                  >
                                    Activate User
                                  </Menu.Item>
                                )}

                                <Menu.Divider />

                                <Menu.Item
                                  leftSection={<IconTrash size={14} />}
                                  color="red"
                                  onClick={() => removeUser(user.id)}
                                  disabled={!canManageUser(user.role) || user.role === 'SuperAdmin'}
                                >
                                  Remove User
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Paper>
        </Tabs.Panel>

        {/* Invitations Tab */}
        <Tabs.Panel value="invitations">
          <Group justify="space-between" mt="md" mb="xs">
            <Text size="sm" c="dimmed">
              Manage pending and sent invitations
            </Text>
            <Button
              variant="light"
              size="xs"
              leftSection={<IconRefresh size={14} />}
              onClick={loadInvitations}
            >
              Refresh
            </Button>
          </Group>

          <Paper withBorder>
            <ScrollArea>
              <Table highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Invitee</Table.Th>
                    <Table.Th>Role</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Invited By</Table.Th>
                    <Table.Th>Sent</Table.Th>
                    <Table.Th>Expires</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {invitations.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={7}>
                        <Text ta="center" c="dimmed" py="xl">
                          No invitations found
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    invitations.map((invitation) => (
                      <Table.Tr key={invitation.id}>
                        <Table.Td>
                          <div>
                            <Text fw={500}>{invitation.name}</Text>
                            <Text size="xs" c="dimmed">
                              {invitation.email}
                            </Text>
                          </div>
                        </Table.Td>
                        <Table.Td>{getRoleBadge(invitation.role)}</Table.Td>
                        <Table.Td>{getStatusBadge(invitation)}</Table.Td>
                        <Table.Td>
                          <Text size="sm">{invitation.invitedBy}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{formatDate(invitation.invitedAt)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{formatDate(invitation.expiresAt)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            {invitation.canBeResent && (
                              <Tooltip label="Resend invitation">
                                <ActionIcon
                                  variant="subtle"
                                  color="blue"
                                  onClick={() => resendInvitation(invitation.email)}
                                >
                                  <IconSend size={16} />
                                </ActionIcon>
                              </Tooltip>
                            )}
                            {invitation.isPending && (
                              <Tooltip label="Cancel invitation">
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  onClick={() => cancelInvitation(invitation.id)}
                                >
                                  <IconX size={16} />
                                </ActionIcon>
                              </Tooltip>
                            )}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Paper>
        </Tabs.Panel>
      </Tabs>

      {/* Invite Modal */}
      <Modal
        opened={inviteModalOpened}
        onClose={closeInviteModal}
        title="Invite Team Member"
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Email Address"
            placeholder="colleague@company.com"
            required
            value={inviteForm.email}
            onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
          />

          <TextInput
            label="Full Name"
            placeholder="John Doe"
            required
            value={inviteForm.name}
            onChange={(e) => setInviteForm((prev) => ({ ...prev, name: e.target.value }))}
          />

          <Select
            label="Role"
            placeholder="Select role"
            required
            value={inviteForm.role}
            onChange={(value) => handleRoleChange(value || 'User')}
            data={availableRolesToInvite}
          />

          <MultiSelect
            label="Permissions"
            placeholder="Select permissions"
            value={inviteForm.permissions}
            onChange={(value) => setInviteForm((prev) => ({ ...prev, permissions: value }))}
            data={AVAILABLE_PERMISSIONS}
            searchable
            clearable
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={closeInviteModal}>
              Cancel
            </Button>
            <Button onClick={sendInvitation} loading={loading}>
              Send Invitation
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit Permissions Modal */}
      <Modal
        opened={editPermissionsModalOpened}
        onClose={closeEditPermissionsModal}
        title={`Edit Permissions - ${selectedUser?.name}`}
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Select the features this user can access
          </Text>

          <MultiSelect
            label="Permissions"
            placeholder="Select permissions"
            value={editingPermissions}
            onChange={setEditingPermissions}
            data={AVAILABLE_PERMISSIONS}
            searchable
            clearable
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={closeEditPermissionsModal}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Implement update permissions logic here
                closeEditPermissionsModal();
              }}
            >
              Update Permissions
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};

export default TeamManagement;
