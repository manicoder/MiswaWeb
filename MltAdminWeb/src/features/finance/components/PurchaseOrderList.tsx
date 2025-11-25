import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  Text,
  Table,
  ActionIcon,
  Modal,
  Badge,
  Grid,
  Stack,
  Title,
  Group,
  TextInput,
  Select,
  ScrollArea,
  Alert,
  LoadingOverlay,
} from '@mantine/core';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconEye,
  IconReceipt,
  IconFilter,
  IconSearch,
  IconBuilding,
  IconUser,
  IconMail,
  IconPhone,
  IconMapPin,
  IconReceipt2,
  IconAlertCircle,
  IconHistory,
} from '@tabler/icons-react';
import { DatePickerInput } from '@mantine/dates';
import { useNavigate } from 'react-router-dom';
import { supplierService, purchaseOrderService } from '../../../services/financeService';
import { PurchaseOrder } from '../../../types/finance';

const PurchaseOrderList: React.FC = () => {
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [filters, setFilters] = useState({
    status: '',
    supplierId: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
    search: '',
  });

  // Load suppliers from database
  const loadSuppliers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const suppliersData = await supplierService.getSuppliers();
      // We don't need to store suppliers in state since we're not using them
      console.log('Suppliers loaded:', suppliersData.length);
    } catch (err) {
      setError('Failed to load suppliers. Please try again.');
      console.error('Error loading suppliers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load purchase orders from API
  const loadPurchaseOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await purchaseOrderService.getPurchaseOrders(
        {
          status: filters.status || undefined,
          supplierId: filters.supplierId || undefined,
          startDate: filters.startDate?.toISOString().split('T')[0] || undefined,
          endDate: filters.endDate?.toISOString().split('T')[0] || undefined,
          search: filters.search || undefined,
        },
        1,
        50,
      );
      setPurchaseOrders(response.data);
    } catch (err) {
      setError('Failed to load purchase orders. Please try again.');
      console.error('Error loading purchase orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters.status, filters.supplierId, filters.startDate, filters.endDate, filters.search]);

  // Load suppliers and purchase orders on component mount
  useEffect(() => {
    loadSuppliers();
    loadPurchaseOrders();
  }, [loadPurchaseOrders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'gray';
      case 'ordered':
        return 'blue';
      case 'received':
        return 'green';
      case 'cancelled':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'ordered':
        return 'Ordered';
      case 'received':
        return 'Received';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const handleViewDetails = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  const handleEdit = (order: PurchaseOrder) => {
    // Navigate to edit page or open edit dialog
    console.log('Edit order:', order.id);
  };

  const handleDelete = (order: PurchaseOrder) => {
    // Show confirmation dialog and delete
    console.log('Delete order:', order.id);
  };

  const handleReceive = (order: PurchaseOrder) => {
    // Open receive dialog
    console.log('Receive order:', order.id);
  };

  const handleViewJourney = (order: PurchaseOrder) => {
    navigate(`/finance/purchase-orders/${order.id}/journey`);
  };

  const handleCreatePurchaseOrder = () => {
    navigate('/finance/purchase-orders/create');
  };

  const filteredOrders = purchaseOrders.filter((order) => {
    if (filters.status && order.status !== filters.status) return false;
    if (filters.supplierId && order.supplierId !== filters.supplierId) return false;
    if (filters.startDate && new Date(order.purchaseDate) < filters.startDate) return false;
    if (filters.endDate && new Date(order.purchaseDate) > filters.endDate) return false;
    if (
      filters.search &&
      !order.poNumber.toLowerCase().includes(filters.search.toLowerCase()) &&
      !order.referenceNumber?.toLowerCase().includes(filters.search.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <Box p="md">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Purchase Orders</Title>
        <Group>
          <Button
            variant="outline"
            leftSection={<IconFilter size={16} />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>

          <Button leftSection={<IconPlus size={16} />} onClick={handleCreatePurchaseOrder}>
            Create Purchase Order
          </Button>
        </Group>
      </Group>

      {/* Error Alert */}
      {error && (
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" mb="md">
          {error}
        </Alert>
      )}

      {/* Filters */}
      {showFilters && (
        <Card shadow="sm" mb="lg">
          <Title order={4} mb="md">
            Filters
          </Title>
          <Grid>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Select
                label="Status"
                placeholder="Select status"
                value={filters.status}
                onChange={(value) => setFilters((prev) => ({ ...prev, status: value || '' }))}
                data={[
                  { value: '', label: 'All' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'ordered', label: 'Ordered' },
                  { value: 'received', label: 'Received' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
                clearable
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <TextInput
                label="Search"
                placeholder="Search by PO number or reference"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                leftSection={<IconSearch size={16} />}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <DatePickerInput
                label="Start Date"
                placeholder="Select start date"
                value={filters.startDate}
                onChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    startDate:
                      value &&
                      typeof value === 'object' &&
                      'getTime' in value &&
                      !isNaN((value as Date).getTime())
                        ? (value as Date)
                        : null,
                  }))
                }
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <DatePickerInput
                label="End Date"
                placeholder="Select end date"
                value={filters.endDate}
                onChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    endDate:
                      value &&
                      typeof value === 'object' &&
                      'getTime' in value &&
                      !isNaN((value as Date).getTime())
                        ? (value as Date)
                        : null,
                  }))
                }
              />
            </Grid.Col>
          </Grid>
        </Card>
      )}

      {/* Purchase Orders Table */}
      <Card shadow="sm">
        <LoadingOverlay visible={isLoading} />
        <ScrollArea>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>PO Number</Table.Th>
                <Table.Th>Supplier</Table.Th>
                <Table.Th>Purchase Date</Table.Th>
                <Table.Th>Expected Delivery</Table.Th>
                <Table.Th>Total Amount</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredOrders.map((order) => (
                <Table.Tr key={order.id}>
                  <Table.Td>
                    <Text fw={500} size="sm">
                      {order.poNumber}
                    </Text>
                    {order.referenceNumber && (
                      <Text size="xs" c="dimmed">
                        Ref: {order.referenceNumber}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {order.supplier.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {order.supplier.contactPerson}
                    </Text>
                  </Table.Td>
                  <Table.Td>{new Date(order.purchaseDate).toLocaleDateString()}</Table.Td>
                  <Table.Td>
                    {order.expectedDeliveryDate
                      ? new Date(order.expectedDeliveryDate).toLocaleDateString()
                      : '-'}
                  </Table.Td>
                  <Table.Td>
                    <Text fw={500} size="sm">
                      ${order.totalAmount.toFixed(2)}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {order.currency}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={getStatusColor(order.status)}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon
                        variant="light"
                        size="sm"
                        onClick={() => handleViewDetails(order)}
                      >
                        <IconEye size={14} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="indigo"
                        size="sm"
                        onClick={() => handleViewJourney(order)}
                        title="View Journey"
                      >
                        <IconHistory size={14} />
                      </ActionIcon>
                      <ActionIcon variant="light" size="sm" onClick={() => handleEdit(order)}>
                        <IconEdit size={14} />
                      </ActionIcon>
                      {order.status === 'ordered' && !order.isReceived && (
                        <ActionIcon
                          variant="light"
                          color="green"
                          size="sm"
                          onClick={() => handleReceive(order)}
                        >
                          <IconReceipt size={14} />
                        </ActionIcon>
                      )}
                      <ActionIcon
                        variant="light"
                        color="red"
                        size="sm"
                        onClick={() => handleDelete(order)}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Order Details Modal */}
      <Modal
        opened={showDetails}
        onClose={() => setShowDetails(false)}
        title="Purchase Order Details"
        size="xl"
      >
        {selectedOrder && (
          <Stack gap="lg">
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Card withBorder p="md">
                  <Title order={4} mb="md">
                    Order Information
                  </Title>
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        PO Number:
                      </Text>
                      <Text fw={500}>{selectedOrder.poNumber}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Status:
                      </Text>
                      <Badge color={getStatusColor(selectedOrder.status)}>
                        {getStatusLabel(selectedOrder.status)}
                      </Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Purchase Date:
                      </Text>
                      <Text>{new Date(selectedOrder.purchaseDate).toLocaleDateString()}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Expected Delivery:
                      </Text>
                      <Text>
                        {selectedOrder.expectedDeliveryDate
                          ? new Date(selectedOrder.expectedDeliveryDate).toLocaleDateString()
                          : '-'}
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Total Amount:
                      </Text>
                      <Text fw={600}>${selectedOrder.totalAmount.toFixed(2)}</Text>
                    </Group>
                  </Stack>
                </Card>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Card withBorder p="md">
                  <Title order={4} mb="md">
                    Supplier Information
                  </Title>
                  <Stack gap="sm">
                    <Group>
                      <IconBuilding size={16} />
                      <Text fw={500}>{selectedOrder.supplier.name}</Text>
                    </Group>
                    {selectedOrder.supplier.contactPerson && (
                      <Group>
                        <IconUser size={16} />
                        <Text size="sm">{selectedOrder.supplier.contactPerson}</Text>
                      </Group>
                    )}
                    {selectedOrder.supplier.email && (
                      <Group>
                        <IconMail size={16} />
                        <Text size="sm">{selectedOrder.supplier.email}</Text>
                      </Group>
                    )}
                    {selectedOrder.supplier.phone && (
                      <Group>
                        <IconPhone size={16} />
                        <Text size="sm">{selectedOrder.supplier.phone}</Text>
                      </Group>
                    )}
                    {selectedOrder.supplier.address && (
                      <Group>
                        <IconMapPin size={16} />
                        <Text size="sm">{selectedOrder.supplier.address}</Text>
                      </Group>
                    )}
                    {selectedOrder.supplier.taxId && (
                      <Group>
                        <IconReceipt2 size={16} />
                        <Text size="sm">{selectedOrder.supplier.taxId}</Text>
                      </Group>
                    )}
                  </Stack>
                </Card>
              </Grid.Col>
            </Grid>

            <Card withBorder p="md">
              <Title order={4} mb="md">
                Order Items
              </Title>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Product</Table.Th>
                    <Table.Th>SKU</Table.Th>
                    <Table.Th>Quantity</Table.Th>
                    <Table.Th>Price</Table.Th>
                    <Table.Th>GST</Table.Th>
                    <Table.Th>Total</Table.Th>
                    {selectedOrder.isReceived && <Table.Th>Received</Table.Th>}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {selectedOrder.items.map((item) => (
                    <Table.Tr key={item.id}>
                      <Table.Td>
                        <Text fw={500}>{item.productName}</Text>
                        <Text size="xs" c="dimmed">
                          {item.variantTitle}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{item.sku}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text>{item.quantity}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text>${item.purchasePrice.toFixed(2)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text>${item.gstAmount.toFixed(2)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={500}>${item.totalPrice.toFixed(2)}</Text>
                      </Table.Td>
                      {selectedOrder.isReceived && (
                        <Table.Td>
                          <Text>{item.quantityReceived}</Text>
                        </Table.Td>
                      )}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>

            <Group justify="flex-end" mt="lg">
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                Close
              </Button>
              {selectedOrder && selectedOrder.status === 'ordered' && !selectedOrder.isReceived && (
                <Button
                  leftSection={<IconReceipt size={16} />}
                  onClick={() => {
                    handleReceive(selectedOrder);
                    setShowDetails(false);
                  }}
                >
                  Receive Order
                </Button>
              )}
            </Group>
          </Stack>
        )}
      </Modal>
    </Box>
  );
};

export default PurchaseOrderList;
