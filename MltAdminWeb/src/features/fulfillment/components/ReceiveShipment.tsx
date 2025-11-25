import React, { useState, useEffect } from 'react';
import { Stack, Text, Table, Button, Card, Badge, Group, Modal, Grid } from '@mantine/core';
import { IconBuildingWarehouse } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import {
  warehouseShipmentService,
  type WarehouseShipment,
} from '../../../services/warehouseShipmentService';

const ReceiveShipment: React.FC = () => {
  const [shipments, setShipments] = useState<WarehouseShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState<WarehouseShipment | null>(null);
  const [receiveModalOpened, { open: openReceiveModal, close: closeReceiveModal }] =
    useDisclosure(false);

  useEffect(() => {
    loadPendingShipments();
  }, []);

  const loadPendingShipments = async () => {
    try {
      setLoading(true);
      const response = await warehouseShipmentService.getPendingReceiveShipments();
      if (response.success) {
        setShipments(response.data);
      } else {
        notifications.show({
          title: 'Error',
          message: response.error || 'Failed to load pending shipments',
          color: 'red',
        });
      }
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to load pending shipments',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReceive = (shipment: WarehouseShipment) => {
    setSelectedShipment(shipment);
    openReceiveModal();
  };

  const handleReceiveSuccess = () => {
    closeReceiveModal();
    loadPendingShipments();
    notifications.show({
      title: 'Success',
      message: 'Shipment received successfully',
      color: 'green',
    });
  };

  return (
    <Stack gap="md">
      <div>
        <Text size="xl" fw={500}>
          Pending Receive
        </Text>
        <Text size="sm" c="dimmed">
          Shipments that have been dispatched and are waiting to be received
        </Text>
      </div>

      {!loading && shipments.length === 0 && (
        <Card p="xl" style={{ textAlign: 'center' }}>
          <Text c="dimmed" size="lg">
            No shipments pending receive
          </Text>
          <Text c="dimmed" size="sm">
            Dispatch shipments to see them here for receiving
          </Text>
        </Card>
      )}

      {!loading && shipments.length > 0 && (
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Shipment</Table.Th>
              <Table.Th>Items</Table.Th>
              <Table.Th>Total Value</Table.Th>
              <Table.Th>Dispatched</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {shipments.map((shipment) => (
              <Table.Tr key={shipment.id}>
                <Table.Td>
                  <div>
                    <Text fw={500} size="sm">
                      {shipment.shipmentNumber}
                    </Text>
                    <Badge color="yellow" variant="light" size="sm">
                      Dispatched
                    </Badge>
                  </div>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{shipment.totalItemsCount} items</Text>
                  <Text size="xs" c="dimmed">
                    {shipment.totalDispatchedCount} dispatched
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">${shipment.totalValue.toFixed(2)}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed">
                    {shipment.dispatchedAt
                      ? new Date(shipment.dispatchedAt).toLocaleDateString()
                      : 'N/A'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconBuildingWarehouse size={14} />}
                      onClick={() => handleReceive(shipment)}
                    >
                      Receive
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {/* Receive Modal */}
      <Modal
        opened={receiveModalOpened}
        onClose={closeReceiveModal}
        title="Receive Shipment"
        size="xl"
      >
        {selectedShipment && (
          <ReceiveInterface
            shipment={selectedShipment}
            onSuccess={handleReceiveSuccess}
            onCancel={closeReceiveModal}
          />
        )}
      </Modal>
    </Stack>
  );
};

// Receive Interface Component
const ReceiveInterface: React.FC<{
  shipment: WarehouseShipment;
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ shipment, onSuccess, onCancel }) => {
  const [items] = useState(shipment.items || []);
  const [loading, setLoading] = useState(false);

  const handleReceive = async () => {
    try {
      setLoading(true);
      const response = await warehouseShipmentService.receiveShipment({
        shipmentId: shipment.id,
        items: items.map((item) => ({
          itemId: item.id,
          quantityReceived: item.quantityDispatched,
        })),
      });

      if (response.success) {
        onSuccess();
      } else {
        notifications.show({
          title: 'Error',
          message: response.error || 'Failed to receive shipment',
          color: 'red',
        });
      }
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to receive shipment',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="md">
      <Grid>
        <Grid.Col span={6}>
          <Text size="sm" fw={500}>
            Shipment Number:
          </Text>
          <Text size="sm">{shipment.shipmentNumber}</Text>
        </Grid.Col>
        <Grid.Col span={6}>
          <Text size="sm" fw={500}>
            Dispatched Items:
          </Text>
          <Text size="sm">{shipment.totalDispatchedCount}</Text>
        </Grid.Col>
        <Grid.Col span={6}>
          <Text size="sm" fw={500}>
            Dispatched Date:
          </Text>
          <Text size="sm">
            {shipment.dispatchedAt ? new Date(shipment.dispatchedAt).toLocaleString() : 'N/A'}
          </Text>
        </Grid.Col>
        <Grid.Col span={6}>
          <Text size="sm" fw={500}>
            Total Value:
          </Text>
          <Text size="sm">${shipment.totalValue.toFixed(2)}</Text>
        </Grid.Col>
      </Grid>

      {items.length > 0 ? (
        <div>
          <Text size="sm" fw={500} mb="xs">
            Items to Receive:
          </Text>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Product</Table.Th>
                <Table.Th>Barcode</Table.Th>
                <Table.Th>Dispatched</Table.Th>
                <Table.Th>Receiving</Table.Th>
                <Table.Th>Price</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>
                    <div>
                      <Text size="sm">{item.productTitle}</Text>
                      {item.variantTitle && (
                        <Text size="xs" c="dimmed">
                          {item.variantTitle}
                        </Text>
                      )}
                    </div>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">{item.productBarcode}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{item.quantityDispatched}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color="green" variant="light">
                      {item.quantityDispatched}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">${item.unitPrice.toFixed(2)}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          <Card withBorder mt="md" p="md" bg="blue.0">
            <Text size="sm" c="blue">
              <strong>Note:</strong> This will mark all dispatched quantities as received. In a real
              implementation, you would allow manual quantity adjustments for variance tracking.
            </Text>
          </Card>
        </div>
      ) : (
        <Text c="dimmed">No items in this shipment</Text>
      )}

      <Group justify="flex-end" mt="md">
        <Button variant="subtle" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleReceive}
          loading={loading}
          disabled={items.length === 0}
          leftSection={<IconBuildingWarehouse size={16} />}
        >
          Confirm Receipt
        </Button>
      </Group>
    </Stack>
  );
};

export default ReceiveShipment;
