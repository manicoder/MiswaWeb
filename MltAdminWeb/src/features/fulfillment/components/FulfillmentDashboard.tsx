import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  Container,
  Paper,
  Title,
  Tabs,
  Badge,
  Group,
  Text,
  Button,
  ActionIcon,
  Grid,
  Card,
  LoadingOverlay,
  Modal,
  Alert,
  Select,
  Drawer,
  Stack,
  ScrollArea,
  Divider,
} from '@mantine/core';
import {
  IconPackage,
  IconTruck,
  IconBuildingWarehouse,
  IconCheck,
  IconPlus,
  IconRefresh,
  IconShield,
  IconAlertCircle,
  IconFileDescription,
  IconClipboardCheck,
  IconMenu2,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate } from 'react-router-dom';
import CreateShipment from './CreateShipment';
import { warehouseShipmentService } from '../../../services/warehouseShipmentService';
import { usePermissions } from '../../../hooks/usePermissions';
import { ShipmentListSkeleton } from './FulfillmentSkeletons';

// Lazy load components
const ShipmentList = lazy(() => import('./ShipmentList'));

interface FulfillmentStats {
  totalShipments: number;
  draftShipments: number;
  pendingDispatch: number;
  pendingReceive: number;
  completed: number;
}

interface StatusBreakdownItem {
  status: string;
  count: number;
}

const FulfillmentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [stats, setStats] = useState<FulfillmentStats>({
    totalShipments: 0,
    draftShipments: 0,
    pendingDispatch: 0,
    pendingReceive: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] =
    useDisclosure(false);
  const [mobileMenuOpened, { open: openMobileMenu, close: closeMobileMenu }] = useDisclosure(false);

  // Permission management
  const {
    permissions,
    userRole,
    loading: permissionsLoading,
    hasPermission,
    hasAnyPermission,
  } = usePermissions();

  // Check if user can access fulfillment
  const canAccessFulfillment = () => {
    return hasAnyPermission(['canViewWarehouse', 'canEditWarehouse']);
  };

  const loadStats = async () => {
    try {
      const analyticsResponse = await warehouseShipmentService.getAnalytics();
      if (analyticsResponse.success) {
        const analytics = analyticsResponse.data;
        const statusBreakdown = (analytics.statusBreakdown as StatusBreakdownItem[]) || [];

        setStats({
          totalShipments: (analytics.totalShipments as number) || 0,
          draftShipments:
            statusBreakdown.find((s: StatusBreakdownItem) => s.status === 'draft')?.count || 0,
          pendingDispatch:
            statusBreakdown.find((s: StatusBreakdownItem) => s.status === 'created')?.count || 0,
          pendingReceive:
            statusBreakdown.find((s: StatusBreakdownItem) => s.status === 'dispatched')?.count || 0,
          completed:
            statusBreakdown.find((s: StatusBreakdownItem) => s.status === 'completed')?.count || 0,
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load fulfillment statistics',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    notifications.show({
      title: 'Refreshed',
      message: 'Data has been refreshed',
      color: 'green',
      autoClose: 2000,
    });
  };

  const handleTabChange = (value: string | null) => {
    if (value) {
      setActiveTab(value);
      closeMobileMenu();
    }
  };

  const handleShipmentCreated = (shipmentId: number) => {
    closeCreateModal();
    setRefreshKey((prev) => prev + 1);

    navigate(`/logistics/warehouse-fulfillment/shipment/${shipmentId}`);
  };

  const statsCards = [
    {
      title: 'Total Shipments',
      value: stats.totalShipments,
      icon: IconPackage,
      color: 'blue',
    },
    {
      title: 'Draft',
      value: stats.draftShipments,
      icon: IconFileDescription,
      color: 'gray',
    },
    {
      title: 'Ready',
      value: stats.pendingDispatch,
      icon: IconClipboardCheck,
      color: 'blue',
    },
    {
      title: 'Dispatched',
      value: stats.pendingReceive,
      icon: IconTruck,
      color: 'yellow',
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: IconCheck,
      color: 'green',
    },
  ];

  // Permission and access checks
  if (permissionsLoading) {
    return (
      <Container size="xl" p="md">
        <LoadingOverlay visible={true} />
      </Container>
    );
  }

  if (!canAccessFulfillment()) {
    return (
      <Container size="xl" p="md">
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          <Text fw={500}>Access Denied</Text>
          <Text size="sm">You don't have permission to access the fulfillment system.</Text>
        </Alert>
      </Container>
    );
  }

  // Render shipment list with appropriate filter
  const renderShipmentList = (status: string | null) => {
    return (
      <Suspense fallback={<ShipmentListSkeleton />}>
        <ShipmentList key={`shipment-list-${refreshKey}-${status}`} statusFilter={status} />
      </Suspense>
    );
  };

  // Tab items for both desktop and mobile
  const tabItems = [
    {
      value: 'all',
      label: 'All Shipments',
      icon: <IconPackage size={16} />,
      count: stats.totalShipments,
      color: 'blue',
    },
    {
      value: 'draft',
      label: 'Draft',
      icon: <IconFileDescription size={16} />,
      count: stats.draftShipments,
      color: 'gray',
    },
    {
      value: 'ready',
      label: 'Ready',
      icon: <IconClipboardCheck size={16} />,
      count: stats.pendingDispatch,
      color: 'blue',
    },
    {
      value: 'dispatched',
      label: 'Dispatched',
      icon: <IconTruck size={16} />,
      count: stats.pendingReceive,
      color: 'yellow',
    },
    {
      value: 'received',
      label: 'Received',
      icon: <IconBuildingWarehouse size={16} />,
      count: 0,
      color: 'orange',
    },
    {
      value: 'completed',
      label: 'Completed',
      icon: <IconCheck size={16} />,
      count: stats.completed,
      color: 'green',
    },
  ];

  return (
    <Container size="xl" p="md">
      <Group justify="space-between" mb={{ base: 'md', sm: 'lg' }} wrap="nowrap">
        <div style={{ flex: 1 }}>
          <Title order={2} size="h3" mb="xs">
            Warehouse Fulfillment
          </Title>
          <Group gap="sm" wrap="nowrap">
            <Text c="dimmed" size="sm" lineClamp={1}>
              Manage shipments
            </Text>
            <Badge
              leftSection={<IconShield size={12} />}
              variant="light"
              color={permissions.canManageUsers ? 'blue' : 'gray'}
              size="sm"
            >
              {userRole.replace('_', ' ').toUpperCase()}
            </Badge>
          </Group>
        </div>
        <Group gap="xs">
          {/* Mobile menu button */}
          <ActionIcon
            variant="subtle"
            size="lg"
            onClick={openMobileMenu}
            display={{ base: 'block', md: 'none' }}
          >
            <IconMenu2 size={20} />
          </ActionIcon>

          {/* Desktop actions */}
          <Group gap="md" display={{ base: 'none', md: 'flex' }}>
            {permissions.canManageUsers && (
              <Select
                placeholder="Switch Role"
                value={userRole}
                onChange={() => {
                  // Role switching functionality will be implemented
                }}
                data={[
                  { value: 'super_admin', label: 'Super Admin' },
                  { value: 'admin', label: 'Admin' },
                  { value: 'manager', label: 'Manager' },
                  { value: 'warehouse_staff', label: 'Warehouse Staff' },
                  { value: 'viewer', label: 'Viewer' },
                ]}
                w={150}
                size="sm"
              />
            )}
            <ActionIcon variant="subtle" size="lg" onClick={handleRefresh} title="Refresh">
              <IconRefresh size={18} />
            </ActionIcon>
            {hasPermission('canEditWarehouse') && (
              <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
                Create Shipment
              </Button>
            )}
          </Group>
        </Group>
      </Group>

      {/* Stats Cards */}
      {loading ? (
        <Grid mb="md">
          {Array(5)
            .fill(0)
            .map((_, index) => (
              <Grid.Col key={index} span={{ base: 6, sm: 6, md: 4, lg: 2.4 }}>
                <Card withBorder padding="md">
                  <Group justify="space-between">
                    <div style={{ width: '70%' }}>
                      <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb={8}>
                        <span style={{ opacity: 0 }}>Loading</span>
                      </Text>
                      <div
                        style={{
                          height: '28px',
                          background: 'var(--mantine-color-gray-2)',
                          borderRadius: '4px',
                        }}
                      ></div>
                    </div>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        background: 'var(--mantine-color-gray-2)',
                        borderRadius: '50%',
                      }}
                    ></div>
                  </Group>
                </Card>
              </Grid.Col>
            ))}
        </Grid>
      ) : (
        <Grid mb="md">
          {statsCards.map((card, index) => (
            <Grid.Col key={index} span={{ base: 6, sm: 6, md: 4, lg: 2.4 }}>
              <Card
                withBorder
                padding="md"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  if (index === 0) setActiveTab('all');
                  else if (index === 1) setActiveTab('draft');
                  else if (index === 2) setActiveTab('ready');
                  else if (index === 3) setActiveTab('dispatched');
                  else if (index === 4) setActiveTab('completed');
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <div>
                    <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                      {card.title}
                    </Text>
                    <Text fw={700} size="lg">
                      {card.value}
                    </Text>
                  </div>
                  <card.icon size={24} color={`var(--mantine-color-${card.color}-6)`} />
                </Group>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      )}

      {/* Mobile Create Button */}
      {hasPermission('canEditWarehouse') && (
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={openCreateModal}
          fullWidth
          mb="md"
          display={{ base: 'block', md: 'none' }}
        >
          Create Shipment
        </Button>
      )}

      {/* Mobile Refresh Button */}
      <Button
        leftSection={<IconRefresh size={16} />}
        variant="light"
        onClick={handleRefresh}
        fullWidth
        mb="md"
        display={{ base: 'block', md: 'none' }}
      >
        Refresh Data
      </Button>

      {/* Desktop Tabs */}
      <Paper withBorder p="md" display={{ base: 'none', sm: 'block' }}>
        <Tabs value={activeTab} onChange={handleTabChange} keepMounted={false}>
          <ScrollArea>
            <Tabs.List>
              {tabItems.map((tab) => (
                <Tabs.Tab key={tab.value} value={tab.value} leftSection={tab.icon}>
                  {tab.label}
                  {tab.count > 0 && (
                    <Badge size="sm" ml="xs" variant="filled" color={tab.color}>
                      {tab.count}
                    </Badge>
                  )}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </ScrollArea>

          <Tabs.Panel value="all" pt="md">
            {renderShipmentList(null)}
          </Tabs.Panel>

          <Tabs.Panel value="draft" pt="md">
            {renderShipmentList('draft')}
          </Tabs.Panel>

          <Tabs.Panel value="ready" pt="md">
            {renderShipmentList('created')}
          </Tabs.Panel>

          <Tabs.Panel value="dispatched" pt="md">
            {renderShipmentList('dispatched')}
          </Tabs.Panel>

          <Tabs.Panel value="received" pt="md">
            {renderShipmentList('received')}
          </Tabs.Panel>

          <Tabs.Panel value="completed" pt="md">
            {renderShipmentList('completed')}
          </Tabs.Panel>
        </Tabs>
      </Paper>

      {/* Mobile Content */}
      <Paper withBorder p="md" display={{ base: 'block', sm: 'none' }}>
        <Text fw={600} mb="xs">
          {tabItems.find((t) => t.value === activeTab)?.label}
        </Text>
        {activeTab === 'all' && renderShipmentList(null)}
        {activeTab === 'draft' && renderShipmentList('draft')}
        {activeTab === 'ready' && renderShipmentList('created')}
        {activeTab === 'dispatched' && renderShipmentList('dispatched')}
        {activeTab === 'received' && renderShipmentList('received')}
        {activeTab === 'completed' && renderShipmentList('completed')}
      </Paper>

      {/* Mobile Menu Drawer */}
      <Drawer
        opened={mobileMenuOpened}
        onClose={closeMobileMenu}
        title="Navigation"
        size="70%"
        position="left"
      >
        <Stack>
          {tabItems.map((tab) => (
            <Button
              key={tab.value}
              variant={activeTab === tab.value ? 'filled' : 'light'}
              leftSection={tab.icon}
              onClick={() => handleTabChange(tab.value)}
              justify="space-between"
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <Badge size="sm" variant="filled" color={tab.color}>
                  {tab.count}
                </Badge>
              )}
            </Button>
          ))}

          <Divider my="md" />

          {permissions.canManageUsers && (
            <Select
              label="Switch Role"
              placeholder="Select role"
              value={userRole}
              onChange={() => {
                // Role switching functionality will be implemented
              }}
              data={[
                { value: 'super_admin', label: 'Super Admin' },
                { value: 'admin', label: 'Admin' },
                { value: 'manager', label: 'Manager' },
                { value: 'warehouse_staff', label: 'Warehouse Staff' },
                { value: 'viewer', label: 'Viewer' },
              ]}
              size="md"
            />
          )}
        </Stack>
      </Drawer>

      {/* Create Shipment Modal */}
      <Modal
        opened={createModalOpened}
        onClose={closeCreateModal}
        title="Create New Shipment"
        size="lg"
        fullScreen={window.innerWidth < 768}
      >
        <CreateShipment
          onSuccess={(shipmentId: number) => handleShipmentCreated(shipmentId)}
          onCancel={closeCreateModal}
        />
      </Modal>
    </Container>
  );
};

export default FulfillmentDashboard;
