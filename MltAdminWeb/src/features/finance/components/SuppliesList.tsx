import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Text,
  Group,
  Button,
  Table,
  Badge,
  ActionIcon,
  Tooltip,
  TextInput,
  Select,
  Stack,
  Title,
  Card,
  Grid,
  Pagination,
  LoadingOverlay,
  Modal,
  NumberInput,
} from '@mantine/core';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconDownload,
  IconSearch,
  IconPackage,
  IconCurrencyRupee,
} from '@tabler/icons-react';
import { supplierService } from '../../../services/financeService';
import { Supplier } from '../../../types/finance';

interface Supply {
  id: string;
  name: string;
  category: string;
  supplier: string;
  quantity: number;
  unit: string;
  cost: number;
  lastOrdered: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  reorderPoint: number;
}

const SuppliesList: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading] = useState(false);

  // Mock data - replace with actual API calls
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Load suppliers from database
  const loadSuppliers = async () => {
    try {
      const suppliersData = await supplierService.getSuppliers();
      setSuppliers(suppliersData);
    } catch (err) {
      console.error('Error loading suppliers:', err);
    }
  };

  // Load suppliers on component mount
  useEffect(() => {
    loadSuppliers();
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    supplier: '',
    quantity: 0,
    unit: '',
    cost: 0,
    reorderPoint: 0,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-stock':
        return 'green';
      case 'low-stock':
        return 'yellow';
      case 'out-of-stock':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in-stock':
        return 'In Stock';
      case 'low-stock':
        return 'Low Stock';
      case 'out-of-stock':
        return 'Out of Stock';
      default:
        return status;
    }
  };

  const filteredSupplies = supplies.filter((supply) => {
    const matchesSearch =
      supply.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supply.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || supply.category === categoryFilter;
    const matchesStatus = !statusFilter || supply.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleAddSupply = () => {
    setEditingSupply(null);
    setFormData({
      name: '',
      category: '',
      supplier: '',
      quantity: 0,
      unit: '',
      cost: 0,
      reorderPoint: 0,
    });
    setIsModalOpen(true);
  };

  const handleEditSupply = (supply: Supply) => {
    setEditingSupply(supply);
    setFormData({
      name: supply.name,
      category: supply.category,
      supplier: supply.supplier,
      quantity: supply.quantity,
      unit: supply.unit,
      cost: supply.cost,
      reorderPoint: supply.reorderPoint,
    });
    setIsModalOpen(true);
  };

  const handleSaveSupply = () => {
    if (editingSupply) {
      // Update existing supply
      setSupplies((prev) =>
        prev.map((s) =>
          s.id === editingSupply.id
            ? { ...s, ...formData, lastOrdered: new Date().toISOString().split('T')[0] }
            : s,
        ),
      );
    } else {
      // Add new supply
      const newSupply: Supply = {
        id: Date.now().toString(),
        ...formData,
        lastOrdered: new Date().toISOString().split('T')[0],
        status:
          formData.quantity > formData.reorderPoint
            ? 'in-stock'
            : formData.quantity > 0
              ? 'low-stock'
              : 'out-of-stock',
      };
      setSupplies((prev) => [...prev, newSupply]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteSupply = (id: string) => {
    setSupplies((prev) => prev.filter((s) => s.id !== id));
  };

  const totalValue = supplies.reduce((sum, supply) => sum + supply.quantity * supply.cost, 0);
  const lowStockCount = supplies.filter((s) => s.status === 'low-stock').length;
  const outOfStockCount = supplies.filter((s) => s.status === 'out-of-stock').length;

  return (
    <Container size="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <div>
            <Title order={1}>Supplies Management</Title>
            <Text c="dimmed" size="sm">
              Track and manage your business supplies inventory
            </Text>
          </div>
          <Group>
            <Button leftSection={<IconDownload size={16} />} variant="light">
              Export
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={handleAddSupply}>
              Add Supply
            </Button>
          </Group>
        </Group>

        {/* Summary Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md">
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Total Supplies
                </Text>
                <IconPackage size={16} color="blue" />
              </Group>
              <Text size="xl" fw={700}>
                {supplies.length}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Items tracked
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md">
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Total Value
                </Text>
                <IconCurrencyRupee size={16} color="green" />
              </Group>
              <Text size="xl" fw={700}>
                {formatCurrency(totalValue)}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Inventory value
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md">
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Low Stock
                </Text>
                <Badge color="yellow" variant="light">
                  {lowStockCount}
                </Badge>
              </Group>
              <Text size="xl" fw={700}>
                {lowStockCount}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Needs reorder
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md">
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Out of Stock
                </Text>
                <Badge color="red" variant="light">
                  {outOfStockCount}
                </Badge>
              </Group>
              <Text size="xl" fw={700}>
                {outOfStockCount}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Urgent reorder
              </Text>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Filters */}
        <Paper withBorder p="md">
          <Group gap="md">
            <TextInput
              placeholder="Search supplies..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              style={{ flex: 1 }}
            />
            <Select
              placeholder="Category"
              value={categoryFilter}
              onChange={(value) => setCategoryFilter(value || '')}
              data={[
                { value: 'Packaging', label: 'Packaging' },
                { value: 'Labels', label: 'Labels' },
                { value: 'Tools', label: 'Tools' },
                { value: 'Electronics', label: 'Electronics' },
                { value: 'Office', label: 'Office' },
              ]}
              clearable
            />
            <Select
              placeholder="Status"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value || '')}
              data={[
                { value: 'in-stock', label: 'In Stock' },
                { value: 'low-stock', label: 'Low Stock' },
                { value: 'out-of-stock', label: 'Out of Stock' },
              ]}
              clearable
            />
          </Group>
        </Paper>

        {/* Supplies Table */}
        <Paper withBorder>
          <LoadingOverlay visible={isLoading} />
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Supply Name</Table.Th>
                <Table.Th>Category</Table.Th>
                <Table.Th>Supplier</Table.Th>
                <Table.Th>Quantity</Table.Th>
                <Table.Th>Cost</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Last Ordered</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredSupplies.map((supply) => (
                <Table.Tr key={supply.id}>
                  <Table.Td>
                    <Text fw={500}>{supply.name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="blue">
                      {supply.category}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{supply.supplier}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {supply.quantity} {supply.unit}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {formatCurrency(supply.cost)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={getStatusColor(supply.status)} variant="light">
                      {getStatusLabel(supply.status)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {new Date(supply.lastOrdered).toLocaleDateString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="Edit supply">
                        <ActionIcon
                          variant="light"
                          size="sm"
                          onClick={() => handleEditSupply(supply)}
                        >
                          <IconEdit size={14} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete supply">
                        <ActionIcon
                          variant="light"
                          color="red"
                          size="sm"
                          onClick={() => handleDeleteSupply(supply.id)}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>

        {/* Pagination */}
        <Group justify="center">
          <Pagination
            total={Math.ceil(filteredSupplies.length / 10)}
            value={currentPage}
            onChange={setCurrentPage}
          />
        </Group>
      </Stack>

      {/* Add/Edit Modal */}
      <Modal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupply ? 'Edit Supply' : 'Add New Supply'}
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Supply Name"
            placeholder="Enter supply name"
            value={formData.name}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, name: event.currentTarget.value }))
            }
            required
          />

          <Select
            label="Category"
            placeholder="Select category"
            value={formData.category}
            onChange={(value) => setFormData((prev) => ({ ...prev, category: value || '' }))}
            data={[
              { value: 'Packaging', label: 'Packaging' },
              { value: 'Labels', label: 'Labels' },
              { value: 'Tools', label: 'Tools' },
              { value: 'Electronics', label: 'Electronics' },
              { value: 'Office', label: 'Office' },
            ]}
            required
          />

          <Select
            label="Supplier"
            placeholder="Select supplier"
            data={suppliers.map((supplier) => ({ value: supplier.name, label: supplier.name }))}
            value={formData.supplier}
            onChange={(value) => setFormData((prev) => ({ ...prev, supplier: value || '' }))}
            searchable
            required
          />

          <Group grow>
            <NumberInput
              label="Quantity"
              placeholder="Enter quantity"
              value={formData.quantity}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  quantity: typeof value === 'number' ? value : 0,
                }))
              }
              min={0}
              required
            />
            <TextInput
              label="Unit"
              placeholder="e.g., rolls, boxes"
              value={formData.unit}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, unit: event.currentTarget.value }))
              }
              required
            />
          </Group>

          <Group grow>
            <NumberInput
              label="Cost per Unit"
              placeholder="Enter cost"
              value={formData.cost}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, cost: typeof value === 'number' ? value : 0 }))
              }
              min={0}
              required
            />
            <NumberInput
              label="Reorder Point"
              placeholder="Reorder threshold"
              value={formData.reorderPoint}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  reorderPoint: typeof value === 'number' ? value : 0,
                }))
              }
              min={0}
              required
            />
          </Group>

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSupply}>{editingSupply ? 'Update' : 'Add'} Supply</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};

export default SuppliesList;
