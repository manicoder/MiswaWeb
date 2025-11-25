import React, { useState, Suspense, lazy } from 'react';
import { Container, Paper, Title, Text, Group, Stack, Tabs, Box } from '@mantine/core';
import { IconBuilding } from '@tabler/icons-react';

// Import all warehouse-related components
import WarehouseManagement from './WarehouseManagement';
import ShipmentAnalytics from './ShipmentAnalytics';
import CreateShipment from './CreateShipment';
import DispatchShipment from './DispatchShipment';
import ReceiveShipment from './ReceiveShipment';
import { ShipmentListSkeleton } from './FulfillmentSkeletons';

// Lazy load ShipmentList to match FulfillmentDashboard pattern
const ShipmentList = lazy(() => import('./ShipmentList'));

const WarehouseManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string | null>('analytics');

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box ta="center">
          <Title order={2} mb="xs">
            <Group justify="center" gap="sm">
              <IconBuilding size={32} color="var(--mantine-color-teal-6)" />
              Warehouse Manager
            </Group>
          </Title>
          <Text c="dimmed" size="lg">
            All your warehouse operations in one place - manage warehouses, shipments, and analytics
          </Text>
          <Text c="dimmed" size="sm" mt="xs">
            Choose a tool from the tabs below to get started
          </Text>
        </Box>

        {/* Main Content */}
        <Paper shadow="md" p="xl" radius="lg">
          {/* Warehouse Tools Tabs */}
          <div style={{ marginBottom: 'var(--mantine-spacing-xl)' }}>
            <Tabs value={activeTab} onChange={setActiveTab}>
              <Tabs.List>
                <Tabs.Tab
                  value="analytics"
                  style={{
                    minHeight: '40px',
                    minWidth: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Analytics
                  </Text>
                </Tabs.Tab>
                <Tabs.Tab
                  value="create"
                  style={{
                    minHeight: '40px',
                    minWidth: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Create Shipment
                  </Text>
                </Tabs.Tab>
                <Tabs.Tab
                  value="dispatch"
                  style={{
                    minHeight: '40px',
                    minWidth: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Dispatch
                  </Text>
                </Tabs.Tab>
                <Tabs.Tab
                  value="receive"
                  style={{
                    minHeight: '40px',
                    minWidth: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Receive
                  </Text>
                </Tabs.Tab>
                <Tabs.Tab
                  value="management"
                  style={{
                    minHeight: '40px',
                    minWidth: '140px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Warehouse Management
                  </Text>
                </Tabs.Tab>
                <Tabs.Tab
                  value="fulfillment"
                  style={{
                    minHeight: '40px',
                    minWidth: '140px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Warehouse Fulfillment
                  </Text>
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="analytics">
                <ShipmentAnalytics />
              </Tabs.Panel>

              <Tabs.Panel value="create">
                <CreateShipment
                  onSuccess={(shipmentId) => {
                    // Handle successful shipment creation
                    console.log('Shipment created:', shipmentId);
                  }}
                  onCancel={() => {
                    // Handle cancellation
                    console.log('Shipment creation cancelled');
                  }}
                />
              </Tabs.Panel>

              <Tabs.Panel value="dispatch">
                <DispatchShipment />
              </Tabs.Panel>

              <Tabs.Panel value="receive">
                <ReceiveShipment />
              </Tabs.Panel>

              <Tabs.Panel value="management">
                <WarehouseManagement />
              </Tabs.Panel>

              <Tabs.Panel value="fulfillment">
                <Suspense fallback={<ShipmentListSkeleton />}>
                  <ShipmentList />
                </Suspense>
              </Tabs.Panel>
            </Tabs>
          </div>
        </Paper>
      </Stack>
    </Container>
  );
};

export default WarehouseManager;
