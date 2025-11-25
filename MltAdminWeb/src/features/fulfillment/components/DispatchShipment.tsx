import React, { useState, useEffect } from 'react';
import { Stack, Text, Table, Button, Card, Badge, Group, Modal, Grid } from '@mantine/core';
import { IconTruck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import {
  warehouseShipmentService,
  type WarehouseShipment,
} from '../../../services/warehouseShipmentService';

const DispatchShipment: React.FC = () => {
  const [shipments, setShipments] = useState<WarehouseShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState<WarehouseShipment | null>(null);
  const [dispatchModalOpened, { open: openDispatchModal, close: closeDispatchModal }] =
    useDisclosure(false);

  useEffect(() => {
    loadPendingShipments();
  }, []);

  const loadPendingShipments = async () => {
    try {
      setLoading(true);
      const response = await warehouseShipmentService.getPendingDispatchShipments();
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

  const handleDispatch = (shipment: WarehouseShipment) => {
    setSelectedShipment(shipment);
    openDispatchModal();
  };

  const handleDispatchSuccess = () => {
    closeDispatchModal();
    loadPendingShipments();
    notifications.show({
      title: 'Success',
      message: 'Shipment dispatched successfully',
      color: 'green',
    });
  };

  return (
    <Stack gap="md">
      <div>
        <Text size="xl" fw={500}>
          Ready for Dispatch
        </Text>
        <Text size="sm" c="dimmed">
          Shipments that are ready to be dispatched from the warehouse
        </Text>
      </div>

      {!loading && shipments.length === 0 && (
        <Card p="xl" style={{ textAlign: 'center' }}>
          <Text c="dimmed" size="lg">
            No shipments ready for dispatch
          </Text>
          <Text c="dimmed" size="sm">
            Create shipments and add products to see them here
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
              <Table.Th>Created</Table.Th>
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
                    <Badge color="blue" variant="light" size="sm">
                      Ready to Dispatch
                    </Badge>
                  </div>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{shipment.totalItemsCount} items</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">${shipment.totalValue.toFixed(2)}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed">
                    {new Date(shipment.createdAt).toLocaleDateString()}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconTruck size={14} />}
                      onClick={() => handleDispatch(shipment)}
                    >
                      Dispatch
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {/* Dispatch Modal */}
      <Modal
        opened={dispatchModalOpened}
        onClose={closeDispatchModal}
        title="Dispatch Shipment"
        size="xl"
      >
        {selectedShipment && (
          <DispatchInterface
            shipment={selectedShipment}
            onSuccess={handleDispatchSuccess}
            onCancel={closeDispatchModal}
          />
        )}
      </Modal>
    </Stack>
  );
};

// Dispatch Interface Component
const DispatchInterface: React.FC<{
  shipment: WarehouseShipment;
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ shipment, onSuccess, onCancel }) => {
  const [items] = useState(shipment.items || []);
  const [loading, setLoading] = useState(false);

  const handleDispatch = async () => {
    try {
      setLoading(true);
      const response = await warehouseShipmentService.dispatchShipment({
        shipmentId: shipment.id,
        items: items.map((item) => ({
          itemId: item.id,
          quantityDispatched: item.quantityPlanned,
        })),
      });

      if (response.success) {
        onSuccess();
      } else {
        notifications.show({
          title: 'Error',
          message: response.error || 'Failed to dispatch shipment',
          color: 'red',
        });
      }
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to dispatch shipment',
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
            Total Items:
          </Text>
          <Text size="sm">{shipment.totalItemsCount}</Text>
        </Grid.Col>
      </Grid>

      {items.length > 0 ? (
        <div>
          <Text size="sm" fw={500} mb="xs">
            Items to Dispatch:
          </Text>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Product</Table.Th>
                <Table.Th>Barcode</Table.Th>
                <Table.Th>Quantity</Table.Th>
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
                    <Text size="sm">{item.quantityPlanned}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">${item.unitPrice.toFixed(2)}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      ) : (
        <Text c="dimmed">No items in this shipment</Text>
      )}

      <Group justify="flex-end" mt="md">
        <Button variant="subtle" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleDispatch}
          loading={loading}
          disabled={items.length === 0}
          leftSection={<IconTruck size={16} />}
        >
          Confirm Dispatch
        </Button>
      </Group>
    </Stack>
  );
};

export default DispatchShipment;
