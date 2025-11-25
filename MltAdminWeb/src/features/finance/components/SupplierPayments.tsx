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
  Textarea,
  NumberInput,
  LoadingOverlay,
  Alert,
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
  IconCalendar,
  IconCreditCard,
  IconCash,
  IconBuildingBank,
  IconAlertCircle,
} from '@tabler/icons-react';
import { DatePickerInput } from '@mantine/dates';
import { financeService } from '../../../services/financeService';
import { notifications } from '@mantine/notifications';
import type { SupplierPayment, PurchaseOrder } from '../../../types/finance';

interface LocalSupplierPayment
  extends Omit<SupplierPayment, 'paymentDate' | 'createdAt' | 'updatedAt'> {
  purchaseOrderNumber: string;
  supplierName: string;
  paymentDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface LocalPurchaseOrder extends PurchaseOrder {
  supplierName: string;
}

const SupplierPayments: React.FC = () => {
  const [payments, setPayments] = useState<LocalSupplierPayment[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<LocalPurchaseOrder[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<LocalSupplierPayment | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<LocalSupplierPayment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [filters, setFilters] = useState({
    supplierName: '',
    paymentMethod: '',
    status: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
    search: '',
  });

  // Form state
  const [paymentForm, setPaymentForm] = useState({
    purchaseOrderId: '',
    supplierId: '',
    supplierName: '',
    paymentDate: new Date(),
    amount: 0,
    currency: 'INR',
    paymentMethod: 'Bank Transfer' as string,
    referenceNumber: '',
    notes: '',
  });

  // Convert API data to local format
  const convertPaymentToLocal = (payment: SupplierPayment): LocalSupplierPayment => ({
    ...payment,
    purchaseOrderNumber: '', // Will be filled from purchase order
    supplierName: '', // Will be filled from purchase order
    paymentDate: new Date(payment.paymentDate),
    createdAt: new Date(payment.createdAt),
    updatedAt: new Date(payment.updatedAt),
  });

  const convertPurchaseOrderToLocal = (po: PurchaseOrder): LocalPurchaseOrder => ({
    ...po,
    supplierName: po.supplier.name,
  });

  // Load data from API
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Load purchase orders
      const purchaseOrdersResponse = await financeService.purchaseOrders.getPurchaseOrders({});
      const purchaseOrdersData = (purchaseOrdersResponse.data || []).map(
        convertPurchaseOrderToLocal,
      );
      setPurchaseOrders(purchaseOrdersData);

      // Load supplier payments
      const paymentsResponse = await financeService.supplierPayments.getSupplierPayments({
        purchaseOrderId: filters.search || undefined,
        status: filters.status || undefined,
        startDate: filters.startDate?.toISOString() || undefined,
        endDate: filters.endDate?.toISOString() || undefined,
      });

      const paymentsData = (paymentsResponse.data || []).map(convertPaymentToLocal);

      // Fill in purchase order and supplier information
      const enrichedPayments = paymentsData.map((payment) => {
        const purchaseOrder = purchaseOrdersData.find((po) => po.id === payment.purchaseOrderId);
        return {
          ...payment,
          purchaseOrderNumber: purchaseOrder?.poNumber || '',
          supplierName: purchaseOrder?.supplierName || '',
        };
      });

      setPayments(enrichedPayments);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
      notifications.show({
        title: 'Error',
        message: 'Failed to load supplier payments data',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'yellow';
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      case 'cancelled':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'Cash':
        return <IconCash size={16} />;
      case 'Bank Transfer':
        return <IconBuildingBank size={16} />;
      case 'Card':
        return <IconCreditCard size={16} />;
      default:
        return <IconReceipt size={16} />;
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'Cash':
        return 'green';
      case 'Bank Transfer':
        return 'blue';
      case 'Card':
        return 'purple';
      case 'UPI':
        return 'orange';
      case 'Cheque':
        return 'teal';
      default:
        return 'gray';
    }
  };

  const handleViewDetails = (payment: LocalSupplierPayment) => {
    setSelectedPayment(payment);
    setShowDetails(true);
  };

  const handleEdit = (payment: LocalSupplierPayment) => {
    setEditingPayment(payment);
    setPaymentForm({
      purchaseOrderId: payment.purchaseOrderId,
      supplierId: payment.supplierId,
      supplierName: payment.supplierName,
      paymentDate: payment.paymentDate,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod as 'Cash' | 'Bank Transfer' | 'Card' | 'UPI' | 'Cheque',
      referenceNumber: payment.referenceNumber || '',
      notes: payment.notes || '',
    });
    setShowPaymentModal(true);
  };

  const handleDelete = async (payment: LocalSupplierPayment) => {
    try {
      await financeService.supplierPayments.deleteSupplierPayment(payment.id);
      setPayments((prev) => prev.filter((p) => p.id !== payment.id));
      notifications.show({
        title: 'Success',
        message: 'Payment deleted successfully',
        color: 'green',
      });
    } catch (err) {
      console.error('Error deleting payment:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete payment',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    }
  };

  const handleCreatePayment = () => {
    setEditingPayment(null);
    setPaymentForm({
      purchaseOrderId: '',
      supplierId: '',
      supplierName: '',
      paymentDate: new Date(),
      amount: 0,
      currency: 'INR',
      paymentMethod: 'Bank Transfer',
      referenceNumber: '',
      notes: '',
    });
    setShowPaymentModal(true);
  };

  const handlePurchaseOrderChange = (purchaseOrderId: string) => {
    const purchaseOrder = purchaseOrders.find((po) => po.id === purchaseOrderId);
    if (purchaseOrder) {
      setPaymentForm((prev) => ({
        ...prev,
        purchaseOrderId,
        supplierId: purchaseOrder.supplierId,
        supplierName: purchaseOrder.supplierName,
        amount: purchaseOrder.balanceDue,
        currency: purchaseOrder.currency,
        paymentMethod: prev.paymentMethod, // Keep the existing payment method
      }));
    }
  };

  const handleSavePayment = async () => {
    if (!paymentForm.purchaseOrderId || !paymentForm.amount) {
      return;
    }

    try {
      if (editingPayment) {
        // Update existing payment
        const updatedPayment = await financeService.supplierPayments.updateSupplierPayment(
          editingPayment.id,
          {
            paymentDate: paymentForm.paymentDate.toISOString(),
            amount: paymentForm.amount,
            currency: paymentForm.currency,
            paymentMethod: paymentForm.paymentMethod,
            referenceNumber: paymentForm.referenceNumber,
            notes: paymentForm.notes,
          },
        );

        const localUpdatedPayment = convertPaymentToLocal(updatedPayment);
        const purchaseOrder = purchaseOrders.find(
          (po) => po.id === localUpdatedPayment.purchaseOrderId,
        );

        setPayments((prev) =>
          prev.map((payment) =>
            payment.id === editingPayment.id
              ? {
                  ...localUpdatedPayment,
                  purchaseOrderNumber: purchaseOrder?.poNumber || '',
                  supplierName: purchaseOrder?.supplierName || '',
                  updatedAt: new Date(),
                }
              : payment,
          ),
        );

        notifications.show({
          title: 'Success',
          message: 'Payment updated successfully',
          color: 'green',
        });
      } else {
        // Create new payment
        const newPayment = await financeService.supplierPayments.createSupplierPayment({
          purchaseOrderId: paymentForm.purchaseOrderId,
          supplierId: paymentForm.supplierId,
          paymentDate: paymentForm.paymentDate.toISOString(),
          amount: paymentForm.amount,
          currency: paymentForm.currency,
          paymentMethod: paymentForm.paymentMethod,
          referenceNumber: paymentForm.referenceNumber,
          notes: paymentForm.notes,
          createdBy: 'current-user', // This should come from auth context
        });

        const localNewPayment = convertPaymentToLocal(newPayment);
        const purchaseOrder = purchaseOrders.find(
          (po) => po.id === localNewPayment.purchaseOrderId,
        );

        setPayments((prev) => [
          ...prev,
          {
            ...localNewPayment,
            purchaseOrderNumber: purchaseOrder?.poNumber || '',
            supplierName: purchaseOrder?.supplierName || '',
          },
        ]);

        notifications.show({
          title: 'Success',
          message: 'Payment created successfully',
          color: 'green',
        });
      }

      setShowPaymentModal(false);
    } catch (err) {
      console.error('Error saving payment:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to save payment',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    }
  };

  const filteredPayments = payments.filter((payment) => {
    if (
      filters.supplierName &&
      !payment.supplierName.toLowerCase().includes(filters.supplierName.toLowerCase())
    )
      return false;
    if (filters.paymentMethod && payment.paymentMethod !== filters.paymentMethod) return false;
    if (filters.status && payment.status !== filters.status) return false;
    if (filters.startDate && payment.paymentDate < filters.startDate) return false;
    if (filters.endDate && payment.paymentDate > filters.endDate) return false;
    if (
      filters.search &&
      !payment.paymentNumber.toLowerCase().includes(filters.search.toLowerCase())
    )
      return false;
    return true;
  });

  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const completedPayments = payments.filter((p) => p.status === 'completed').length;
  const pendingPayments = payments.filter((p) => p.status === 'pending').length;

  return (
    <Box p="md" pos="relative">
      <LoadingOverlay visible={loading} />

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" mb="md">
          {error}
        </Alert>
      )}

      <Group justify="space-between" mb="lg">
        <Title order={2}>Supplier Payments</Title>
        <Group>
          <Button
            variant="outline"
            leftSection={<IconFilter size={16} />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={handleCreatePayment}>
            Record Payment
          </Button>
        </Group>
      </Group>

      {/* Summary Cards */}
      <Grid mb="lg">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">
                Total Payments
              </Text>
              <IconReceipt size={16} color="blue" />
            </Group>
            <Text size="xl" fw={700}>
              ${totalPayments.toFixed(2)}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              {payments.length} payments
            </Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">
                Completed
              </Text>
              <Badge color="green" variant="light">
                {completedPayments}
              </Badge>
            </Group>
            <Text size="xl" fw={700}>
              {completedPayments}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Payments completed
            </Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">
                Pending
              </Text>
              <Badge color="yellow" variant="light">
                {pendingPayments}
              </Badge>
            </Group>
            <Text size="xl" fw={700}>
              {pendingPayments}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Payments pending
            </Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder p="md">
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">
                Payment Methods
              </Text>
              <IconCreditCard size={16} color="purple" />
            </Group>
            <Text size="xl" fw={700}>
              {new Set(payments.map((p) => p.paymentMethod)).size}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Different methods used
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Filters */}
      {showFilters && (
        <Card shadow="sm" mb="lg">
          <Title order={4} mb="md">
            Filters
          </Title>
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 3 }}>
              <TextInput
                label="Search"
                placeholder="Payment Number"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                leftSection={<IconSearch size={16} />}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <TextInput
                label="Supplier Name"
                placeholder="Enter supplier name"
                value={filters.supplierName}
                onChange={(e) => setFilters((prev) => ({ ...prev, supplierName: e.target.value }))}
                leftSection={<IconBuilding size={16} />}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Select
                label="Payment Method"
                placeholder="All"
                data={[
                  { value: '', label: 'All' },
                  { value: 'Cash', label: 'Cash' },
                  { value: 'Bank Transfer', label: 'Bank Transfer' },
                  { value: 'Card', label: 'Card' },
                  { value: 'UPI', label: 'UPI' },
                  { value: 'Cheque', label: 'Cheque' },
                ]}
                value={filters.paymentMethod}
                onChange={(value) =>
                  setFilters((prev) => ({ ...prev, paymentMethod: value || '' }))
                }
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Select
                label="Status"
                placeholder="All"
                data={[
                  { value: '', label: 'All' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
                value={filters.status}
                onChange={(value) => setFilters((prev) => ({ ...prev, status: value || '' }))}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DatePickerInput
                label="Start Date"
                placeholder="Select date"
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
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DatePickerInput
                label="End Date"
                placeholder="Select date"
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

      {/* Payments Table */}
      <Card shadow="sm">
        <ScrollArea>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Payment Number</Table.Th>
                <Table.Th>Purchase Order</Table.Th>
                <Table.Th>Supplier</Table.Th>
                <Table.Th>Payment Date</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th>Payment Method</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredPayments.map((payment) => (
                <Table.Tr key={payment.id}>
                  <Table.Td>
                    <Text fw={500} size="sm">
                      {payment.paymentNumber}
                    </Text>
                    {payment.referenceNumber && (
                      <Text size="xs" c="dimmed">
                        Ref: {payment.referenceNumber}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{payment.purchaseOrderNumber}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{payment.supplierName}</Text>
                  </Table.Td>
                  <Table.Td>{payment.paymentDate.toLocaleDateString()}</Table.Td>
                  <Table.Td>
                    <Text fw={500} size="sm">
                      ${payment.amount.toFixed(2)}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {payment.currency}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      {getPaymentMethodIcon(payment.paymentMethod)}
                      <Badge color={getPaymentMethodColor(payment.paymentMethod)} variant="light">
                        {payment.paymentMethod}
                      </Badge>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={getStatusColor(payment.status)}>
                      {getStatusLabel(payment.status)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => handleViewDetails(payment)}
                      >
                        <IconEye size={16} />
                      </ActionIcon>
                      <ActionIcon size="sm" variant="subtle" onClick={() => handleEdit(payment)}>
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="red"
                        onClick={() => handleDelete(payment)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Payment Details Modal */}
      <Modal
        opened={showDetails}
        onClose={() => setShowDetails(false)}
        title={
          <div>
            <Text>Payment Details</Text>
            {selectedPayment && (
              <Text size="xs" c="dimmed">
                {selectedPayment.paymentNumber}
              </Text>
            )}
          </div>
        }
        size="lg"
      >
        {selectedPayment && (
          <Stack gap="lg">
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Title order={5} mb="sm">
                  Payment Information
                </Title>
                <Stack gap="xs">
                  <Text size="sm">
                    <Text span fw={500}>
                      Payment Number:
                    </Text>{' '}
                    {selectedPayment.paymentNumber}
                  </Text>
                  <Text size="sm">
                    <Text span fw={500}>
                      Purchase Order:
                    </Text>{' '}
                    {selectedPayment.purchaseOrderNumber}
                  </Text>
                  <Text size="sm">
                    <Text span fw={500}>
                      Supplier:
                    </Text>{' '}
                    {selectedPayment.supplierName}
                  </Text>
                  <Text size="sm">
                    <Text span fw={500}>
                      Payment Date:
                    </Text>{' '}
                    {selectedPayment.paymentDate.toLocaleDateString()}
                  </Text>
                  <Text size="sm">
                    <Text span fw={500}>
                      Payment Method:
                    </Text>{' '}
                    <Badge
                      color={getPaymentMethodColor(selectedPayment.paymentMethod)}
                      variant="light"
                    >
                      {selectedPayment.paymentMethod}
                    </Badge>
                  </Text>
                  <Text size="sm">
                    <Text span fw={500}>
                      Status:
                    </Text>{' '}
                    {getStatusLabel(selectedPayment.status)}
                  </Text>
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Title order={5} mb="sm">
                  Financial Details
                </Title>
                <Stack gap="xs">
                  <Text size="sm">
                    <Text span fw={500}>
                      Amount:
                    </Text>{' '}
                    ${selectedPayment.amount.toFixed(2)} {selectedPayment.currency}
                  </Text>
                  {selectedPayment.referenceNumber && (
                    <Text size="sm">
                      <Text span fw={500}>
                        Reference:
                      </Text>{' '}
                      {selectedPayment.referenceNumber}
                    </Text>
                  )}
                  <Text size="sm">
                    <Text span fw={500}>
                      Created:
                    </Text>{' '}
                    {selectedPayment.createdAt.toLocaleDateString()}
                  </Text>
                  <Text size="sm">
                    <Text span fw={500}>
                      Updated:
                    </Text>{' '}
                    {selectedPayment.updatedAt.toLocaleDateString()}
                  </Text>
                </Stack>
              </Grid.Col>
            </Grid>

            {selectedPayment.notes && (
              <div>
                <Title order={5} mb="sm">
                  Notes
                </Title>
                <Text size="sm">{selectedPayment.notes}</Text>
              </div>
            )}
          </Stack>
        )}

        <Group justify="flex-end" mt="lg">
          <Button variant="outline" onClick={() => setShowDetails(false)}>
            Close
          </Button>
        </Group>
      </Modal>

      {/* Create/Edit Payment Modal */}
      <Modal
        opened={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title={editingPayment ? 'Edit Payment' : 'Record Payment'}
        size="md"
      >
        <Stack gap="md">
          <Select
            label="Purchase Order"
            placeholder="Select purchase order"
            data={purchaseOrders
              .filter((po) => po.balanceDue > 0)
              .map((po) => ({
                value: po.id,
                label: `${po.poNumber} - ${po.supplierName} (Balance: $${po.balanceDue.toFixed(2)})`,
              }))}
            value={paymentForm.purchaseOrderId}
            onChange={(value) => {
              setPaymentForm((prev) => ({ ...prev, purchaseOrderId: value || '' }));
              if (value) handlePurchaseOrderChange(value);
            }}
            required
          />

          <TextInput
            label="Supplier Name"
            value={paymentForm.supplierName}
            onChange={(e) => setPaymentForm((prev) => ({ ...prev, supplierName: e.target.value }))}
            disabled
          />

          <DatePickerInput
            label="Payment Date"
            placeholder="Select payment date"
            value={paymentForm.paymentDate}
            onChange={(value) =>
              setPaymentForm((prev) => ({
                ...prev,
                paymentDate:
                  value &&
                  typeof value === 'object' &&
                  'getTime' in value &&
                  !isNaN((value as Date).getTime())
                    ? (value as Date)
                    : new Date(),
              }))
            }
            leftSection={<IconCalendar size={16} />}
            required
          />

          <NumberInput
            label="Amount"
            placeholder="Enter payment amount"
            value={paymentForm.amount === 0 ? undefined : paymentForm.amount}
            onChange={(value) =>
              setPaymentForm((prev) => ({ ...prev, amount: typeof value === 'number' ? value : 0 }))
            }
            leftSection="$"
            decimalScale={2}
            min={0}
            required
          />

          <Select
            label="Payment Method"
            placeholder="Select payment method"
            data={[
              { value: 'Cash', label: 'Cash' },
              { value: 'Bank Transfer', label: 'Bank Transfer' },
              { value: 'Card', label: 'Card' },
              { value: 'UPI', label: 'UPI' },
              { value: 'Cheque', label: 'Cheque' },
            ]}
            value={paymentForm.paymentMethod}
            onChange={(value) =>
              setPaymentForm((prev) => ({
                ...prev,
                paymentMethod: value || 'Bank Transfer',
              }))
            }
            required
          />

          <TextInput
            label="Reference Number"
            placeholder="Enter reference number (optional)"
            value={paymentForm.referenceNumber}
            onChange={(e) =>
              setPaymentForm((prev) => ({ ...prev, referenceNumber: e.target.value }))
            }
          />

          <Textarea
            label="Notes"
            placeholder="Enter any additional notes"
            value={paymentForm.notes}
            onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
            rows={3}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSavePayment}
              disabled={!paymentForm.purchaseOrderId || !paymentForm.amount}
            >
              {editingPayment ? 'Update' : 'Record'} Payment
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
};

export default SupplierPayments;
