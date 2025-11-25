import React, { useState, useEffect } from 'react';
import { Grid, Card, Text, Badge, Button, Group, Skeleton } from '@mantine/core';
import {
  IconClipboardCheck,
  IconTruckDelivery,
  IconPackageImport,
  IconArrowLeft,
} from '@tabler/icons-react';
import type { Shipment, ShipmentStatus } from '../../types';
import { apiClient } from '../../../../services/api';

interface ShipmentSummaryCardsProps {
  shipment: Shipment;
  saving: boolean;
  updateShipmentStatus: (status: ShipmentStatus) => Promise<void>;
  getStatusColor: (status: ShipmentStatus) => string;
}

const ShipmentSummaryCards: React.FC<ShipmentSummaryCardsProps> = ({
  shipment,
  saving,
  updateShipmentStatus,
  getStatusColor,
}) => {
  const shipmentStatus = shipment.status as ShipmentStatus;
  const [userName, setUserName] = useState<string>('');
  const [loadingUser, setLoadingUser] = useState<boolean>(false);

  // Calculate unique products count based on SKU or barcode
  const uniqueProductsCount = shipment.items
    ? new Set(shipment.items.map((item) => item.sku || item.productBarcode)).size
    : 0;

  // Fetch user name from user ID
  useEffect(() => {
    const fetchUserName = async () => {
      if (!shipment.createdBy) return;

      try {
        setLoadingUser(true);
        // Check if the createdBy is already a UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          shipment.createdBy,
        );

        if (isUuid) {
          // Fetch user details from API
          const response = await apiClient.get(`/UserManagement/${shipment.createdBy}`);
          if (response.data && response.data.success && response.data.user) {
            setUserName(response.data.user.name);
          } else {
            setUserName('Unknown User');
          }
        } else {
          // If not a UUID, just use the value as is
          setUserName(shipment.createdBy);
        }
      } catch (error) {
        console.error('Error fetching user details:', error);
        setUserName('Unknown User');
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUserName();
  }, [shipment.createdBy]);

  return (
    <Grid mb="xl" gutter="md">
      {/* First column: Contains Total Items and Total Products in a nested grid */}
      <Grid.Col span={{ base: 6, sm: 6, md: 3 }}>
        <Grid gutter="md">
          {/* Total Items - 50% width */}
          <Grid.Col span={6}>
            <Card withBorder p="md" h="100%">
              <Text c="dimmed" size="sm">
                Total Items
              </Text>
              <Text fw={700} size="lg">
                {shipment.totalItemsCount || 0}
              </Text>
            </Card>
          </Grid.Col>

          {/* Total Products - 50% width */}
          <Grid.Col span={6}>
            <Card withBorder p="md" h="100%">
              <Text c="dimmed" size="sm">
                Total Products
              </Text>
              <Text fw={700} size="lg">
                {uniqueProductsCount}
              </Text>
            </Card>
          </Grid.Col>
        </Grid>
      </Grid.Col>

      {/* Total Value */}
      <Grid.Col span={{ base: 6, sm: 6, md: 3 }}>
        <Card withBorder p="md" h="100%">
          <Text c="dimmed" size="sm">
            Total Value
          </Text>
          <Text fw={700} size="lg">
            ₹ {shipment.totalValue?.toFixed(2) || '0.00'}
          </Text>
        </Card>
      </Grid.Col>

      {/* Created */}
      <Grid.Col span={{ base: 6, sm: 6, md: 3 }}>
        <Card withBorder p="md" h="100%">
          <Text c="dimmed" size="sm">
            Created
          </Text>
          <Text fw={500} size="sm">
            {new Date(shipment.createdAt).toLocaleDateString()}
          </Text>
          <span>
            {loadingUser ? (
              <Skeleton height={8} width="70%" radius="xl" />
            ) : (
              <Text c="dimmed" size="xs">
                by {userName || 'Unknown User'}
              </Text>
            )}
          </span>
        </Card>
      </Grid.Col>

      {/* Status */}
      <Grid.Col span={{ base: 6, sm: 6, md: 3 }}>
        <Card withBorder p="md" h="100%">
          <Text c="dimmed" size="sm">
            Status
          </Text>
          <Group gap="xs">
            <Badge color={getStatusColor(shipment.status)} size="lg">
              {shipment.status === 'created'
                ? 'READY'
                : shipment.status.toUpperCase().replace('_', ' ')}
            </Badge>

            {/* Status transition buttons */}
            {shipment.items && shipment.items.length > 0 && (
              <>
                {/* Draft -> Created */}
                {shipmentStatus === 'draft' && (
                  <Button
                    size="sm"
                    color="violet"
                    leftSection={<IconClipboardCheck size={16} />}
                    onClick={() => updateShipmentStatus('created')}
                    loading={saving}
                  >
                    Mark Ready
                  </Button>
                )}

                {/* Ready for Dispatch -> Dispatched */}
                {shipmentStatus === 'created' && (
                  <>
                    <Button
                      size="sm"
                      color="orange"
                      leftSection={<IconTruckDelivery size={16} />}
                      onClick={() => updateShipmentStatus('dispatched')}
                      loading={saving}
                    >
                      Dispatch
                    </Button>
                    <Button
                      size="sm"
                      color="blue"
                      variant="light"
                      leftSection={<IconArrowLeft size={16} />}
                      onClick={() => updateShipmentStatus('draft')}
                      loading={saving}
                    >
                      Move to Draft
                    </Button>
                  </>
                )}

                {/* Dispatched -> Received */}
                {shipmentStatus === 'dispatched' && (
                  <Button
                    size="sm"
                    color="green"
                    leftSection={<IconPackageImport size={16} />}
                    onClick={() => updateShipmentStatus('received')}
                    loading={saving}
                  >
                    Mark Received
                  </Button>
                )}
              </>
            )}
          </Group>
        </Card>
      </Grid.Col>
    </Grid>
  );
};

export default ShipmentSummaryCards;
