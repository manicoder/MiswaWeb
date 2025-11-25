import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Group,
  Text,
  Badge,
  ActionIcon,
  Select,
  TextInput,
  Pagination,
  Paper,
  Stack,
  Card,
  Grid,
  Modal,
  Tooltip,
  Alert,
} from '@mantine/core';
import {
  IconSearch,
  IconEye,
  IconTruck,
  IconBuildingWarehouse,
  IconCheck,
  IconTrash,
  IconRefresh,
  IconPlus,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import {
  warehouseShipmentService,
  type WarehouseShipment,
} from '../../../services/warehouseShipmentService';
import { useNavigate } from 'react-router-dom';

interface ShipmentListProps {
  statusFilter?: string | null;
}

interface ProductInfo {
  productTitle: string;
  variantTitle?: string;
  sku?: string;
  price: number;
  imageUrl?: string;
}

const ShipmentList: React.FC<ShipmentListProps> = ({ statusFilter = null }) => {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<WarehouseShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // Filtering state
  const [internalStatusFilter, setInternalStatusFilter] = useState<string>(statusFilter || '');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal and collapse state
  const [selectedShipment, setSelectedShipment] = useState<WarehouseShipment | null>(null);
  const [expandedShipments, setExpandedShipments] = useState<Set<number>>(new Set());
  const [addProductsModalOpened, { open: openAddProductsModal, close: closeAddProductsModal }] =
    useDisclosure(false);
  const [dispatchModalOpened, { open: openDispatchModal, close: closeDispatchModal }] =
    useDisclosure(false);
  const [receiveModalOpened, { open: openReceiveModal, close: closeReceiveModal }] =
    useDisclosure(false);

  // Update internal filter when prop changes
  useEffect(() => {
    setInternalStatusFilter(statusFilter || '');
  }, [statusFilter]);

  const loadShipments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await warehouseShipmentService.getShipments({
        pageNumber: currentPage,
        pageSize: pageSize,
        status: internalStatusFilter || undefined,
      });

      if (response.success) {
        setShipments(response.data.shipments);
        setTotalCount(response.data.totalCount);
        setTotalPages(Math.ceil(response.data.totalCount / pageSize));
      } else {
        setError(response.error || 'Failed to load shipments');
      }
    } catch (err) {
      setError('Failed to load shipments');
      console.error('Error loading shipments:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, internalStatusFilter, pageSize]);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  const handleRefresh = () => {
    loadShipments();
    notifications.show({
      title: 'Refreshed',
      message: 'Shipment list has been refreshed',
      color: 'green',
      autoClose: 2000,
    });
  };

  const handleToggleDetails = (shipment: WarehouseShipment) => {
    const newExpanded = new Set(expandedShipments);
    if (newExpanded.has(shipment.id)) {
      newExpanded.delete(shipment.id);
    } else {
      newExpanded.add(shipment.id);
    }
    setExpandedShipments(newExpanded);
  };

  const handleAddProducts = (shipment: WarehouseShipment) => {
    setSelectedShipment(shipment);
    openAddProductsModal();
  };

  const handleDispatch = (shipment: WarehouseShipment) => {
    setSelectedShipment(shipment);
    openDispatchModal();
  };

  const handleReceive = (shipment: WarehouseShipment) => {
    setSelectedShipment(shipment);
    openReceiveModal();
  };

  const handleDeleteShipment = async (shipment: WarehouseShipment) => {
    if (shipment.status !== 'draft') {
      notifications.show({
        title: 'Cannot Delete',
        message: 'Only draft shipments can be deleted',
        color: 'red',
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete shipment ${shipment.shipmentNumber}?`)) {
      return;
    }

    try {
      const response = await warehouseShipmentService.deleteShipment(shipment.id);
      if (response.success) {
        notifications.show({
          title: 'Success',
          message: 'Shipment deleted successfully',
          color: 'green',
        });
        loadShipments();
      } else {
        notifications.show({
          title: 'Error',
          message: response.error || 'Failed to delete shipment',
          color: 'red',
        });
      }
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete shipment',
        color: 'red',
      });
    }
  };

  const handleShipmentClick = (shipment: WarehouseShipment) => {
    navigate(`/logistics/warehouse-fulfillment/shipment/${shipment.id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'gray';
      case 'created':
        return 'blue';
      case 'dispatched':
        return 'yellow';
      case 'received':
        return 'orange';
      case 'completed':
        return 'green';
      default:
        return 'gray';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'created':
        return 'Ready';
      case 'dispatched':
        return 'Dispatched';
      case 'received':
        return 'Received';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const getActionButtons = (shipment: WarehouseShipment) => {
    const buttons = [];

    // View Details (always available)
    buttons.push(
      <Tooltip
        key="view"
        label={expandedShipments.has(shipment.id) ? 'Hide Details' : 'View Details'}
      >
        <ActionIcon
          variant="subtle"
          color="blue"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleDetails(shipment);
          }}
        >
          <IconEye size={16} />
        </ActionIcon>
      </Tooltip>,
    );

    // Status-specific actions
    switch (shipment.status) {
      case 'draft':
        buttons.push(
          <Tooltip key="add-products" label="Add Products">
            <ActionIcon
              variant="subtle"
              color="blue"
              onClick={(e) => {
                e.stopPropagation();
                handleAddProducts(shipment);
              }}
            >
              <IconPlus size={16} />
            </ActionIcon>
          </Tooltip>,
        );
        buttons.push(
          <Tooltip key="delete" label="Delete">
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteShipment(shipment);
              }}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>,
        );
        break;

      case 'created':
        buttons.push(
          <Tooltip key="add-products" label="Add Products">
            <ActionIcon
              variant="subtle"
              color="blue"
              onClick={(e) => {
                e.stopPropagation();
                handleAddProducts(shipment);
              }}
            >
              <IconPlus size={16} />
            </ActionIcon>
          </Tooltip>,
        );
        buttons.push(
          <Tooltip key="dispatch" label="Dispatch">
            <ActionIcon
              variant="subtle"
              color="orange"
              onClick={(e) => {
                e.stopPropagation();
                handleDispatch(shipment);
              }}
            >
              <IconTruck size={16} />
            </ActionIcon>
          </Tooltip>,
        );
        break;

      case 'dispatched':
        buttons.push(
          <Tooltip key="receive" label="Receive">
            <ActionIcon
              variant="subtle"
              color="yellow"
              onClick={(e) => {
                e.stopPropagation();
                handleReceive(shipment);
              }}
            >
              <IconBuildingWarehouse size={16} />
            </ActionIcon>
          </Tooltip>,
        );
        break;

      case 'received':
        buttons.push(
          <Tooltip key="complete" label="Complete">
            <ActionIcon
              variant="subtle"
              color="green"
              onClick={(e) => {
                e.stopPropagation();
                // Handle complete action
              }}
            >
              <IconCheck size={16} />
            </ActionIcon>
          </Tooltip>,
        );
        break;
    }

    return buttons;
  };

  // Simple shipment details component
  const ShipmentDetails: React.FC<{ shipment: WarehouseShipment }> = ({ shipment }) => {
    return (
      <Card withBorder={false} p="md" bg="gray.0">
        <Grid>
          <Grid.Col span={6}>
            <Text size="sm" fw={500}>
              Shipment Number:
            </Text>
            <Text size="sm">{shipment.shipmentNumber}</Text>
          </Grid.Col>
          <Grid.Col span={6}>
            <Text size="sm" fw={500}>
              Status:
            </Text>
            <Badge color={getStatusColor(shipment.status)} variant="light">
              {getStatusLabel(shipment.status)}
            </Badge>
          </Grid.Col>
          <Grid.Col span={6}>
            <Text size="sm" fw={500}>
              Total Items:
            </Text>
            <Text size="sm">{shipment.totalItemsCount}</Text>
          </Grid.Col>
          <Grid.Col span={6}>
            <Text size="sm" fw={500}>
              Total Value:
            </Text>
            <Text size="sm">${shipment.totalValue.toFixed(2)}</Text>
          </Grid.Col>
          <Grid.Col span={6}>
            <Text size="sm" fw={500}>
              Source:
            </Text>
            <Text size="sm">{shipment.sourceWarehouse?.name || 'N/A'}</Text>
          </Grid.Col>
          <Grid.Col span={6}>
            <Text size="sm" fw={500}>
              Destination:
            </Text>
            <Text size="sm">{shipment.destinationWarehouse?.name || 'N/A'}</Text>
          </Grid.Col>
        </Grid>

        {shipment.items && shipment.items.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <Text size="sm" fw={500} mb="xs">
              Items:
            </Text>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Product</Table.Th>
                  <Table.Th>Quantity</Table.Th>
                  <Table.Th>Price</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {shipment.items.map((item) => (
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
        )}
      </Card>
    );
  };

  return (
    <Stack gap="md">
      {/* Filters */}
      <Paper p="md" withBorder>
        <Group justify="space-between">
          <Group>
            <Select
              placeholder="Filter by Status"
              value={internalStatusFilter}
              onChange={(value) => setInternalStatusFilter(value || '')}
              data={[
                { value: '', label: 'All Statuses' },
                { value: 'draft', label: 'Draft' },
                { value: 'created', label: 'Ready' },
                { value: 'dispatched', label: 'Dispatched' },
                { value: 'received', label: 'Received' },
                { value: 'completed', label: 'Completed' },
              ]}
              w={200}
              clearable
            />
            <TextInput
              placeholder="Search shipments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftSection={<IconSearch size={16} />}
              w={250}
            />
          </Group>
          <Button variant="subtle" leftSection={<IconRefresh size={16} />} onClick={handleRefresh}>
            Refresh
          </Button>
        </Group>
      </Paper>

      {/* Error Message */}
      {error && <Alert color="red">{error}</Alert>}

      {/* Shipments Table */}
      {!loading && shipments.length === 0 ? (
        <Card p="xl" style={{ textAlign: 'center' }}>
          <Text c="dimmed" size="lg">
            No shipments found
          </Text>
          <Text c="dimmed" size="sm">
            Try changing your filters or create a new shipment
          </Text>
        </Card>
      ) : (
        <div>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Shipment</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Items</Table.Th>
                <Table.Th>Total Value</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {shipments.map((shipment) => (
                <React.Fragment key={shipment.id}>
                  <Table.Tr style={{ cursor: 'pointer' }}>
                    <Table.Td onClick={() => handleShipmentClick(shipment)}>
                      <div>
                        <Text fw={500} size="sm">
                          {shipment.shipmentNumber}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {shipment.sourceWarehouse?.name || 'N/A'} →{' '}
                          {shipment.destinationWarehouse?.name || 'N/A'}
                        </Text>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(shipment.status)} variant="light">
                        {getStatusLabel(shipment.status)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{shipment.totalItemsCount} items</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">${shipment.totalValue?.toFixed(2) || '0.00'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {new Date(shipment.createdAt).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">{getActionButtons(shipment)}</Group>
                    </Table.Td>
                  </Table.Tr>
                  {expandedShipments.has(shipment.id) && (
                    <Table.Tr>
                      <Table.Td colSpan={6}>
                        <ShipmentDetails shipment={shipment} />
                      </Table.Td>
                    </Table.Tr>
                  )}
                </React.Fragment>
              ))}
            </Table.Tbody>
          </Table>

          {/* Pagination */}
          <Group justify="space-between" mt="md">
            <Text size="sm" c="dimmed">
              Showing {shipments.length} of {totalCount} shipments
            </Text>
            <Pagination
              value={currentPage}
              onChange={setCurrentPage}
              total={totalPages}
              withEdges
            />
          </Group>
        </div>
      )}

      {/* Add Products Modal */}
      <Modal
        opened={addProductsModalOpened}
        onClose={closeAddProductsModal}
        title="Add Products to Shipment"
        size="xl"
      >
        {selectedShipment && (
          <AddProductsInterface
            shipment={selectedShipment}
            onSuccess={() => {
              closeAddProductsModal();
              loadShipments();
            }}
            onCancel={closeAddProductsModal}
          />
        )}
      </Modal>

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
            onSuccess={() => {
              closeDispatchModal();
              loadShipments();
            }}
            onCancel={closeDispatchModal}
          />
        )}
      </Modal>

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
            onSuccess={() => {
              closeReceiveModal();
              loadShipments();
            }}
            onCancel={closeReceiveModal}
          />
        )}
      </Modal>
    </Stack>
  );
};

// Add Products Interface Component
const AddProductsInterface: React.FC<{
  shipment: WarehouseShipment;
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ shipment, onSuccess, onCancel }) => {
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);

  const handleBarcodeSearch = async () => {
    if (!barcode.trim()) return;

    try {
      setLoading(true);
      const response = await warehouseShipmentService.getProductByBarcode(barcode);
      if (response.success) {
        setProductInfo(response.data);
      } else {
        notifications.show({
          title: 'Product Not Found',
          message: response.error || 'Product not found with this barcode',
          color: 'red',
        });
        setProductInfo(null);
      }
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to search for product',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!productInfo) return;

    try {
      setLoading(true);
      const response = await warehouseShipmentService.addProductToShipment({
        shipmentId: shipment.id,
        barcode: barcode,
        quantity: quantity,
      });

      if (response.success) {
        setBarcode('');
        setQuantity(1);
        setProductInfo(null);
        onSuccess();
      } else {
        notifications.show({
          title: 'Error',
          message: response.error || 'Failed to add product',
          color: 'red',
        });
      }
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to add product to shipment',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Shipment: {shipment.shipmentNumber}
      </Text>

      <Group>
        <TextInput
          label="Barcode"
          placeholder="Scan or enter barcode"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          style={{ flex: 1 }}
          onKeyPress={(e) => e.key === 'Enter' && handleBarcodeSearch()}
        />
        <Button onClick={handleBarcodeSearch} loading={loading} mt="xl">
          Search
        </Button>
      </Group>

      {productInfo && (
        <Card withBorder p="md">
          <Grid>
            <Grid.Col span={8}>
              <Text fw={500}>{productInfo.productTitle}</Text>
              {productInfo.variantTitle && (
                <Text size="sm" c="dimmed">
                  {productInfo.variantTitle}
                </Text>
              )}
              <Text size="sm">SKU: {productInfo.sku}</Text>
              <Text size="sm">Price: ${productInfo.price}</Text>
            </Grid.Col>
            <Grid.Col span={4}>
              {productInfo.imageUrl && (
                <img
                  src={productInfo.imageUrl}
                  alt="Product"
                  style={{ width: '100%', maxWidth: 80, height: 'auto' }}
                />
              )}
            </Grid.Col>
          </Grid>

          <Group mt="md">
            <TextInput
              label="Quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              min={1}
              style={{ width: 100 }}
            />
            <Button onClick={handleAddProduct} loading={loading} mt="xl">
              Add to Shipment
            </Button>
          </Group>
        </Card>
      )}

      <Group justify="flex-end" mt="md">
        <Button variant="subtle" onClick={onCancel}>
          Close
        </Button>
      </Group>
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
        notifications.show({
          title: 'Success',
          message: 'Shipment dispatched successfully',
          color: 'green',
        });
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
      <Text size="sm" c="dimmed">
        Dispatching shipment: {shipment.shipmentNumber}
      </Text>

      {items.length > 0 ? (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Product</Table.Th>
              <Table.Th>Planned Qty</Table.Th>
              <Table.Th>Dispatch Qty</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>
                  <Text size="sm">{item.productTitle}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{item.quantityPlanned}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{item.quantityPlanned}</Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      ) : (
        <Text c="dimmed">No items in this shipment</Text>
      )}

      <Group justify="flex-end" mt="md">
        <Button variant="subtle" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleDispatch} loading={loading} disabled={items.length === 0}>
          Dispatch Shipment
        </Button>
      </Group>
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
        notifications.show({
          title: 'Success',
          message: 'Shipment received successfully',
          color: 'green',
        });
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
      <Text size="sm" c="dimmed">
        Receiving shipment: {shipment.shipmentNumber}
      </Text>

      {items.length > 0 ? (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Product</Table.Th>
              <Table.Th>Dispatched</Table.Th>
              <Table.Th>Receive Qty</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>
                  <Text size="sm">{item.productTitle}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{item.quantityDispatched}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{item.quantityDispatched}</Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      ) : (
        <Text c="dimmed">No items in this shipment</Text>
      )}

      <Group justify="flex-end" mt="md">
        <Button variant="subtle" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleReceive} loading={loading} disabled={items.length === 0}>
          Receive Shipment
        </Button>
      </Group>
    </Stack>
  );
};

export default ShipmentList;
