import React, { useState, useEffect } from 'react';
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
  Divider,
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
  IconCalendar,
  IconFileImport,
  IconAlertCircle,
} from '@tabler/icons-react';
import { DatePickerInput } from '@mantine/dates';
import { purchaseOrderService } from '../../../services/financeService';
import { PurchaseOrder, PurchaseOrderItem as POItem } from '../../../types/finance';
import { supplierService } from '../../../services/financeService';
import { Supplier } from '../../../types/finance';

interface PurchaseEntryItem {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  rate: number;
  gstAmount: number;
  gstRate: number;
  totalPrice: number;
  notes?: string;
}

interface PurchaseEntry {
  id: string;
  entryNumber: string;
  supplierName: string;
  billNumber: string;
  billDate: Date;
  entryDate: Date;
  notes?: string;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  currency: string;
  status: 'draft' | 'confirmed' | 'cancelled';
  items: PurchaseEntryItem[];
  createdAt: Date;
  updatedAt: Date;
  // Link to Purchase Order (optional)
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
}

const PurchaseEntries: React.FC = () => {
  const [purchaseEntries, setPurchaseEntries] = useState<PurchaseEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<PurchaseEntry | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PurchaseEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Purchase Order import state
  const [receivedPurchaseOrders, setReceivedPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [loadingPOs, setLoadingPOs] = useState(false);

  // Suppliers state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Filters state
  const [filters, setFilters] = useState({
    supplierName: '',
    billNumber: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
    status: '',
    search: '',
  });

  // Form state
  const [entryForm, setEntryForm] = useState({
    supplierName: '',
    billNumber: '',
    billDate: new Date(),
    entryDate: new Date(),
    notes: '',
    currency: 'INR',
    items: [] as PurchaseEntryItem[],
  });

  // Load suppliers from database
  const loadSuppliers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const suppliersData = await supplierService.getSuppliers();
      setSuppliers(suppliersData);
    } catch (err) {
      setError('Failed to load suppliers. Please try again.');
      console.error('Error loading suppliers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load suppliers on component mount
  useEffect(() => {
    loadSuppliers();
  }, []);

  // Load received purchase orders for import
  const loadReceivedPurchaseOrders = async () => {
    try {
      setLoadingPOs(true);
      const response = await purchaseOrderService.getPurchaseOrders(
        {
          status: 'received',
          isReceived: true,
        },
        1,
        50, // Load more for selection
      );
      setReceivedPurchaseOrders(response.data);
    } catch (error) {
      console.error('Error loading received purchase orders:', error);
    } finally {
      setLoadingPOs(false);
    }
  };

  // Convert Purchase Order to Purchase Entry
  const convertPOToEntry = (purchaseOrder: PurchaseOrder): PurchaseEntry => {
    const items: PurchaseEntryItem[] = purchaseOrder.items.map((item: POItem) => ({
      id: item.id,
      productId: item.productId,
      sku: item.sku,
      productName: item.productName,
      quantity: item.quantity,
      rate: item.purchasePrice,
      gstAmount: item.gstAmount,
      gstRate: item.gstRate,
      totalPrice: item.totalPrice,
      notes: item.notes,
    }));

    return {
      id: Date.now().toString(),
      entryNumber: `PE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
      supplierName: purchaseOrder.supplier.name,
      billNumber: purchaseOrder.billNumber || `BILL-${purchaseOrder.poNumber}`,
      billDate: purchaseOrder.billDate ? new Date(purchaseOrder.billDate) : new Date(),
      entryDate: new Date(),
      notes: `Imported from Purchase Order: ${purchaseOrder.poNumber}`,
      subtotal: purchaseOrder.subtotal,
      gstAmount: purchaseOrder.gstAmount,
      totalAmount: purchaseOrder.totalAmount,
      currency: purchaseOrder.currency,
      status: 'draft',
      items,
      createdAt: new Date(),
      updatedAt: new Date(),
      purchaseOrderId: purchaseOrder.id,
      purchaseOrderNumber: purchaseOrder.poNumber,
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'gray';
      case 'confirmed':
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
      case 'confirmed':
        return 'Confirmed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const handleViewDetails = (entry: PurchaseEntry) => {
    setSelectedEntry(entry);
    setShowDetails(true);
  };

  const handleEdit = (entry: PurchaseEntry) => {
    setEditingEntry(entry);
    setEntryForm({
      supplierName: entry.supplierName,
      billNumber: entry.billNumber,
      billDate: entry.billDate,
      entryDate: entry.entryDate,
      notes: entry.notes || '',
      currency: entry.currency,
      items: entry.items,
    });
    setShowEntryModal(true);
  };

  const handleDelete = (entry: PurchaseEntry) => {
    setPurchaseEntries((prev) => prev.filter((e) => e.id !== entry.id));
  };

  const handleCreateEntry = () => {
    setEditingEntry(null);
    setEntryForm({
      supplierName: '',
      billNumber: '',
      billDate: new Date(),
      entryDate: new Date(),
      notes: '',
      currency: 'INR',
      items: [],
    });
    setShowEntryModal(true);
  };

  const handleImportFromPO = () => {
    loadReceivedPurchaseOrders();
    setShowImportModal(true);
  };

  const handleSelectPurchaseOrder = (purchaseOrder: PurchaseOrder) => {
    setSelectedPurchaseOrder(purchaseOrder);
  };

  const handleImportPurchaseOrder = () => {
    if (!selectedPurchaseOrder) return;

    const newEntry = convertPOToEntry(selectedPurchaseOrder);
    setPurchaseEntries((prev) => [...prev, newEntry]);
    setShowImportModal(false);
    setSelectedPurchaseOrder(null);
  };

  const filteredEntries = purchaseEntries.filter((entry) => {
    if (
      filters.supplierName &&
      !entry.supplierName.toLowerCase().includes(filters.supplierName.toLowerCase())
    )
      return false;
    if (
      filters.billNumber &&
      !entry.billNumber.toLowerCase().includes(filters.billNumber.toLowerCase())
    )
      return false;
    if (filters.startDate && entry.entryDate < filters.startDate) return false;
    if (filters.endDate && entry.entryDate > filters.endDate) return false;
    if (filters.status && entry.status !== filters.status) return false;
    if (filters.search && !entry.entryNumber.toLowerCase().includes(filters.search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <Box p="md">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Purchase Entries</Title>
        <Group>
          <Button
            variant="outline"
            leftSection={<IconFilter size={16} />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
          <Button
            variant="outline"
            leftSection={<IconFileImport size={16} />}
            onClick={handleImportFromPO}
          >
            Import from PO
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={handleCreateEntry}>
            Create Entry
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
                label="Supplier"
                placeholder="Select supplier"
                data={suppliers.map((supplier) => ({ value: supplier.name, label: supplier.name }))}
                value={filters.supplierName}
                onChange={(value) => setFilters((prev) => ({ ...prev, supplierName: value || '' }))}
                searchable
                clearable
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <TextInput
                label="Bill Number"
                placeholder="Enter bill number"
                value={filters.billNumber}
                onChange={(e) => setFilters((prev) => ({ ...prev, billNumber: e.target.value }))}
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
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Select
                label="Status"
                placeholder="Select status"
                data={[
                  { value: '', label: 'All' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'confirmed', label: 'Confirmed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
                value={filters.status}
                onChange={(value) => setFilters((prev) => ({ ...prev, status: value || '' }))}
                clearable
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <TextInput
                label="Search"
                placeholder="Search by entry number"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                leftSection={<IconSearch size={16} />}
              />
            </Grid.Col>
          </Grid>
        </Card>
      )}

      {/* Purchase Entries Table */}
      <Card shadow="sm">
        <LoadingOverlay visible={isLoading} />
        <ScrollArea>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Entry Number</Table.Th>
                <Table.Th>Supplier</Table.Th>
                <Table.Th>Bill Number</Table.Th>
                <Table.Th>Bill Date</Table.Th>
                <Table.Th>Entry Date</Table.Th>
                <Table.Th>Total Amount</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredEntries.map((entry) => (
                <Table.Tr key={entry.id}>
                  <Table.Td>
                    <Text fw={500} size="sm">
                      {entry.entryNumber}
                    </Text>
                    {entry.purchaseOrderNumber && (
                      <Text size="xs" c="dimmed">
                        From PO: {entry.purchaseOrderNumber}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{entry.supplierName}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{entry.billNumber}</Text>
                  </Table.Td>
                  <Table.Td>{entry.billDate.toLocaleDateString()}</Table.Td>
                  <Table.Td>{entry.entryDate.toLocaleDateString()}</Table.Td>
                  <Table.Td>
                    <Text fw={500} size="sm">
                      ${entry.totalAmount.toFixed(2)}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {entry.currency}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={getStatusColor(entry.status)}>
                      {getStatusLabel(entry.status)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon
                        variant="light"
                        size="sm"
                        onClick={() => handleViewDetails(entry)}
                      >
                        <IconEye size={14} />
                      </ActionIcon>
                      <ActionIcon variant="light" size="sm" onClick={() => handleEdit(entry)}>
                        <IconEdit size={14} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="red"
                        size="sm"
                        onClick={() => handleDelete(entry)}
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

      {/* Entry Details Modal */}
      <Modal
        opened={showDetails}
        onClose={() => setShowDetails(false)}
        title="Purchase Entry Details"
        size="xl"
      >
        {selectedEntry && (
          <Stack gap="lg">
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Card withBorder p="md">
                  <Title order={4} mb="md">
                    Entry Information
                  </Title>
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Entry Number:
                      </Text>
                      <Text fw={500}>{selectedEntry.entryNumber}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Status:
                      </Text>
                      <Badge color={getStatusColor(selectedEntry.status)}>
                        {getStatusLabel(selectedEntry.status)}
                      </Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Supplier:
                      </Text>
                      <Text>{selectedEntry.supplierName}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Bill Number:
                      </Text>
                      <Text>{selectedEntry.billNumber}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Bill Date:
                      </Text>
                      <Text>{selectedEntry.billDate.toLocaleDateString()}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Entry Date:
                      </Text>
                      <Text>{selectedEntry.entryDate.toLocaleDateString()}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Total Amount:
                      </Text>
                      <Text fw={600}>${selectedEntry.totalAmount.toFixed(2)}</Text>
                    </Group>
                  </Stack>
                </Card>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Card withBorder p="md">
                  <Title order={4} mb="md">
                    Financial Summary
                  </Title>
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Text>Subtotal:</Text>
                      <Text fw={500}>${selectedEntry.subtotal.toFixed(2)}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text>GST Amount:</Text>
                      <Text fw={500}>${selectedEntry.gstAmount.toFixed(2)}</Text>
                    </Group>
                    <Divider />
                    <Group justify="space-between">
                      <Text size="lg" fw={600}>
                        Total Amount:
                      </Text>
                      <Text size="lg" fw={600} c="blue">
                        ${selectedEntry.totalAmount.toFixed(2)}
                      </Text>
                    </Group>
                    <Text size="sm" c="dimmed">
                      Currency: {selectedEntry.currency}
                    </Text>
                  </Stack>
                </Card>
              </Grid.Col>
            </Grid>

            <Card withBorder p="md">
              <Title order={4} mb="md">
                Entry Items
              </Title>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Product</Table.Th>
                    <Table.Th>SKU</Table.Th>
                    <Table.Th>Quantity</Table.Th>
                    <Table.Th>Rate</Table.Th>
                    <Table.Th>GST</Table.Th>
                    <Table.Th>Total</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {selectedEntry.items.map((item) => (
                    <Table.Tr key={item.id}>
                      <Table.Td>
                        <Text fw={500}>{item.productName}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{item.sku}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text>{item.quantity}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text>${item.rate.toFixed(2)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text>${item.gstAmount.toFixed(2)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={500}>${item.totalPrice.toFixed(2)}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>

            {selectedEntry.notes && (
              <Card withBorder p="md">
                <Title order={4} mb="md">
                  Notes
                </Title>
                <Text size="sm">{selectedEntry.notes}</Text>
              </Card>
            )}

            <Group justify="flex-end" mt="lg">
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Import from Purchase Order Modal */}
      <Modal
        opened={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import from Purchase Order"
        size="xl"
      >
        <LoadingOverlay visible={loadingPOs} />
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Select a received purchase order to import as a purchase entry:
          </Text>

          <ScrollArea h={400}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>PO Number</Table.Th>
                  <Table.Th>Supplier</Table.Th>
                  <Table.Th>Purchase Date</Table.Th>
                  <Table.Th>Total Amount</Table.Th>
                  <Table.Th>Items</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {receivedPurchaseOrders.map((po) => (
                  <Table.Tr
                    key={po.id}
                    style={{
                      backgroundColor:
                        selectedPurchaseOrder?.id === po.id
                          ? 'var(--mantine-color-blue-0)'
                          : undefined,
                    }}
                  >
                    <Table.Td>
                      <Text fw={500} size="sm">
                        {po.poNumber}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{po.supplier.name}</Text>
                    </Table.Td>
                    <Table.Td>{new Date(po.purchaseDate).toLocaleDateString()}</Table.Td>
                    <Table.Td>
                      <Text fw={500} size="sm">
                        ${po.totalAmount.toFixed(2)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {po.currency}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{po.items.length} items</Text>
                    </Table.Td>
                    <Table.Td>
                      <Button
                        size="xs"
                        variant={selectedPurchaseOrder?.id === po.id ? 'filled' : 'outline'}
                        onClick={() => handleSelectPurchaseOrder(po)}
                      >
                        {selectedPurchaseOrder?.id === po.id ? 'Selected' : 'Select'}
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => setShowImportModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportPurchaseOrder} disabled={!selectedPurchaseOrder}>
              Import Selected PO
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Create/Edit Entry Modal */}
      <Modal
        opened={showEntryModal}
        onClose={() => setShowEntryModal(false)}
        title={editingEntry ? 'Edit Purchase Entry' : 'Create Purchase Entry'}
        size="xl"
      >
        <Stack gap="md">
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Supplier Name"
                placeholder="Select supplier"
                data={suppliers.map((supplier) => ({ value: supplier.name, label: supplier.name }))}
                value={entryForm.supplierName}
                onChange={(value) =>
                  setEntryForm((prev) => ({ ...prev, supplierName: value || '' }))
                }
                leftSection={<IconBuilding size={16} />}
                searchable
                required
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Bill Number"
                placeholder="Enter bill number"
                value={entryForm.billNumber}
                onChange={(e) => setEntryForm((prev) => ({ ...prev, billNumber: e.target.value }))}
                leftSection={<IconReceipt size={16} />}
                required
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DatePickerInput
                label="Bill Date"
                placeholder="Select bill date"
                value={entryForm.billDate}
                onChange={(value) =>
                  setEntryForm((prev) => ({
                    ...prev,
                    billDate:
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
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DatePickerInput
                label="Entry Date"
                placeholder="Select entry date"
                value={entryForm.entryDate}
                onChange={(value) =>
                  setEntryForm((prev) => ({
                    ...prev,
                    entryDate:
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
            </Grid.Col>
          </Grid>

          <Textarea
            label="Notes"
            placeholder="Enter any additional notes"
            value={entryForm.notes}
            onChange={(e) => setEntryForm((prev) => ({ ...prev, notes: e.target.value }))}
            rows={3}
          />

          <Divider />

          <Group justify="space-between">
            <Title order={5}>Entry Items</Title>
            <Button size="sm" leftSection={<IconPlus size={14} />}>
              Add Item
            </Button>
          </Group>

          <ScrollArea h={300}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Product</Table.Th>
                  <Table.Th>SKU</Table.Th>
                  <Table.Th>Quantity</Table.Th>
                  <Table.Th>Rate</Table.Th>
                  <Table.Th>GST Rate (%)</Table.Th>
                  <Table.Th>GST Amount</Table.Th>
                  <Table.Th>Total</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {entryForm.items.map((item, index) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      <TextInput
                        size="xs"
                        placeholder="Product name"
                        value={item.productName}
                        onChange={(e) => {
                          const updatedItems = [...entryForm.items];
                          updatedItems[index].productName = e.target.value;
                          setEntryForm((prev) => ({ ...prev, items: updatedItems }));
                        }}
                      />
                    </Table.Td>
                    <Table.Td>
                      <TextInput
                        size="xs"
                        placeholder="SKU"
                        value={item.sku}
                        onChange={(e) => {
                          const updatedItems = [...entryForm.items];
                          updatedItems[index].sku = e.target.value;
                          setEntryForm((prev) => ({ ...prev, items: updatedItems }));
                        }}
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        size="xs"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(value) => {
                          const updatedItems = [...entryForm.items];
                          const numValue = typeof value === 'number' ? value : 0;
                          updatedItems[index].quantity = numValue;
                          // Recalculate totals
                          const rate = updatedItems[index].rate;
                          const gstRate = updatedItems[index].gstRate;
                          const subtotal = numValue * rate;
                          const gstAmount = subtotal * (gstRate / 100);
                          updatedItems[index].gstAmount = gstAmount;
                          updatedItems[index].totalPrice = subtotal + gstAmount;
                          setEntryForm((prev) => ({ ...prev, items: updatedItems }));
                        }}
                        min={1}
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        size="xs"
                        placeholder="Rate"
                        value={item.rate}
                        onChange={(value) => {
                          const updatedItems = [...entryForm.items];
                          const numValue = typeof value === 'number' ? value : 0;
                          updatedItems[index].rate = numValue;
                          // Recalculate totals
                          const quantity = updatedItems[index].quantity;
                          const gstRate = updatedItems[index].gstRate;
                          const subtotal = quantity * numValue;
                          const gstAmount = subtotal * (gstRate / 100);
                          updatedItems[index].gstAmount = gstAmount;
                          updatedItems[index].totalPrice = subtotal + gstAmount;
                          setEntryForm((prev) => ({ ...prev, items: updatedItems }));
                        }}
                        min={0}
                        decimalScale={2}
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        size="xs"
                        placeholder="GST %"
                        value={item.gstRate}
                        onChange={(value) => {
                          const updatedItems = [...entryForm.items];
                          const numValue = typeof value === 'number' ? value : 0;
                          updatedItems[index].gstRate = numValue;
                          // Recalculate totals
                          const quantity = updatedItems[index].quantity;
                          const rate = updatedItems[index].rate;
                          const subtotal = quantity * rate;
                          const gstAmount = subtotal * (numValue / 100);
                          updatedItems[index].gstAmount = gstAmount;
                          updatedItems[index].totalPrice = subtotal + gstAmount;
                          setEntryForm((prev) => ({ ...prev, items: updatedItems }));
                        }}
                        min={0}
                        max={100}
                        decimalScale={2}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        ${item.gstAmount.toFixed(2)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        ${item.totalPrice.toFixed(2)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="red"
                        onClick={() => {
                          const updatedItems = entryForm.items.filter((_, i) => i !== index);
                          setEntryForm((prev) => ({ ...prev, items: updatedItems }));
                        }}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => setShowEntryModal(false)}>
              Cancel
            </Button>
            <Button>{editingEntry ? 'Update' : 'Create'} Entry</Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
};

export default PurchaseEntries;
