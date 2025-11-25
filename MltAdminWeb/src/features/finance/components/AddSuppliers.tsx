import React, { useState, useEffect, useCallback } from 'react';
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
  Textarea,
  Avatar,
  Alert,
} from '@mantine/core';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconDownload,
  IconSearch,
  IconBuilding,
  IconPhone,
  IconMail,
  IconTruck,
  IconAlertCircle,
} from '@tabler/icons-react';
import { supplierService } from '../../../services/financeService';
import { Supplier, CreateSupplier, UpdateSupplier } from '../../../types/finance';
import { notifications } from '@mantine/notifications';

const AddSuppliers: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    taxId: '',
    paymentTerms: '',
    notes: '',
  });

  // Load suppliers from database
  const loadSuppliers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const isActiveFilter =
        statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined;
      const suppliersData = await supplierService.getSuppliers(searchTerm, isActiveFilter);
      setSuppliers(suppliersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suppliers');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'green' : 'red';
  };

  const getStatusLabel = (isActive: boolean) => {
    return isActive ? 'Active' : 'Inactive';
  };

  const handleAddSupplier = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      taxId: '',
      paymentTerms: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      taxId: supplier.taxId || '',
      paymentTerms: supplier.paymentTerms || '',
      notes: supplier.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveSupplier = async () => {
    if (!formData.name.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Supplier name is required',
        color: 'red',
      });
      return;
    }

    setIsLoading(true);
    try {
      if (editingSupplier) {
        // Update existing supplier
        const updateData: UpdateSupplier = {
          name: formData.name,
          contactPerson: formData.contactPerson || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          taxId: formData.taxId || undefined,
          paymentTerms: formData.paymentTerms || undefined,
          notes: formData.notes || undefined,
        };

        await supplierService.updateSupplier(editingSupplier.id, updateData);
        notifications.show({
          title: 'Success',
          message: 'Supplier updated successfully',
          color: 'green',
        });
      } else {
        // Add new supplier
        const createData: CreateSupplier = {
          name: formData.name,
          contactPerson: formData.contactPerson || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          taxId: formData.taxId || undefined,
          paymentTerms: formData.paymentTerms || undefined,
          notes: formData.notes || undefined,
          createdBy: 'current-user', // This should come from auth context
        };

        await supplierService.createSupplier(createData);
        notifications.show({
          title: 'Success',
          message: 'Supplier created successfully',
          color: 'green',
        });
      }

      setIsModalOpen(false);
      loadSuppliers(); // Reload the list
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: 'Failed to save supplier. Please try again.',
        color: 'red',
      });
      console.error('Error saving supplier:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) {
      return;
    }

    setIsLoading(true);
    try {
      await supplierService.deleteSupplier(id);
      notifications.show({
        title: 'Success',
        message: 'Supplier deleted successfully',
        color: 'green',
      });
      loadSuppliers(); // Reload the list
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete supplier. Please try again.',
        color: 'red',
      });
      console.error('Error deleting supplier:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const activeSuppliers = suppliers.filter((s) => s.isActive).length;

  return (
    <Container size="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <div>
            <Title order={1}>Supplier Management</Title>
            <Text c="dimmed" size="sm">
              Manage your suppliers and track performance metrics
            </Text>
          </div>
          <Group>
            <Button leftSection={<IconDownload size={16} />} variant="light">
              Export
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={handleAddSupplier}>
              Add Supplier
            </Button>
          </Group>
        </Group>

        {/* Error Alert */}
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
            {error}
          </Alert>
        )}

        {/* Summary Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md">
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Total Suppliers
                </Text>
                <IconBuilding size={16} color="blue" />
              </Group>
              <Text size="xl" fw={700}>
                {suppliers.length}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                {activeSuppliers} active
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md">
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Active Suppliers
                </Text>
                <Badge color="green" variant="light">
                  {activeSuppliers}
                </Badge>
              </Group>
              <Text size="xl" fw={700}>
                {activeSuppliers}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Currently active
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md">
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Inactive Suppliers
                </Text>
                <Badge color="red" variant="light">
                  {suppliers.length - activeSuppliers}
                </Badge>
              </Group>
              <Text size="xl" fw={700}>
                {suppliers.length - activeSuppliers}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Currently inactive
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md">
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Last Updated
                </Text>
                <IconTruck size={16} color="blue" />
              </Group>
              <Text size="xl" fw={700}>
                {suppliers.length > 0
                  ? new Date(
                      Math.max(...suppliers.map((s) => new Date(s.updatedAt).getTime())),
                    ).toLocaleDateString()
                  : 'N/A'}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Most recent update
              </Text>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Filters */}
        <Paper withBorder p="md">
          <Group gap="md">
            <TextInput
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              style={{ flex: 1 }}
            />
            <Select
              placeholder="Status"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value || '')}
              data={[
                { value: '', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              clearable
            />
          </Group>
        </Paper>

        {/* Suppliers Table */}
        <Paper withBorder>
          <LoadingOverlay visible={isLoading} />
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Supplier</Table.Th>
                <Table.Th>Contact</Table.Th>
                <Table.Th>Tax ID</Table.Th>
                <Table.Th>Payment Terms</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {suppliers.map((supplier) => (
                <Table.Tr key={supplier.id}>
                  <Table.Td>
                    <Group gap="sm">
                      <Avatar size="sm" color="blue">
                        {supplier.name.charAt(0)}
                      </Avatar>
                      <div>
                        <Text fw={500}>{supplier.name}</Text>
                        <Text size="xs" c="dimmed">
                          {supplier.address || 'No address'}
                        </Text>
                      </div>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={2}>
                      {supplier.contactPerson && (
                        <Text size="sm" fw={500}>
                          {supplier.contactPerson}
                        </Text>
                      )}
                      {supplier.email && (
                        <Text size="xs" c="dimmed">
                          <IconMail size={12} style={{ display: 'inline', marginRight: 4 }} />
                          {supplier.email}
                        </Text>
                      )}
                      {supplier.phone && (
                        <Text size="xs" c="dimmed">
                          <IconPhone size={12} style={{ display: 'inline', marginRight: 4 }} />
                          {supplier.phone}
                        </Text>
                      )}
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {supplier.taxId || '-'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{supplier.paymentTerms || '-'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={getStatusColor(supplier.isActive)} variant="light">
                      {getStatusLabel(supplier.isActive)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {new Date(supplier.createdAt).toLocaleDateString()}
                    </Text>
                    <Text size="xs" c="dimmed">
                      by {supplier.createdBy}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="Edit supplier">
                        <ActionIcon
                          variant="light"
                          size="sm"
                          onClick={() => handleEditSupplier(supplier)}
                        >
                          <IconEdit size={14} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete supplier">
                        <ActionIcon
                          variant="light"
                          color="red"
                          size="sm"
                          onClick={() => handleDeleteSupplier(supplier.id)}
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
        {suppliers.length > 0 && (
          <Group justify="center">
            <Pagination
              total={Math.ceil(suppliers.length / 10)}
              value={currentPage}
              onChange={setCurrentPage}
            />
          </Group>
        )}
      </Stack>

      {/* Add/Edit Modal */}
      <Modal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Supplier Name"
            placeholder="Enter supplier name"
            value={formData.name}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, name: event.currentTarget.value }))
            }
            required
          />

          <TextInput
            label="Contact Person"
            placeholder="Enter contact person name"
            value={formData.contactPerson}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, contactPerson: event.currentTarget.value }))
            }
          />

          <Group grow>
            <TextInput
              label="Email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, email: event.currentTarget.value }))
              }
              type="email"
            />
            <TextInput
              label="Phone"
              placeholder="Enter phone number"
              value={formData.phone}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, phone: event.currentTarget.value }))
              }
            />
          </Group>

          <TextInput
            label="Tax ID"
            placeholder="Enter tax ID (e.g., GST123456789)"
            value={formData.taxId}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, taxId: event.currentTarget.value }))
            }
          />

          <Textarea
            label="Address"
            placeholder="Enter full address"
            value={formData.address}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, address: event.currentTarget.value }))
            }
            rows={3}
          />

          <Select
            label="Payment Terms"
            placeholder="Select payment terms"
            value={formData.paymentTerms}
            onChange={(value) => setFormData((prev) => ({ ...prev, paymentTerms: value || '' }))}
            data={[
              { value: 'Net 30', label: 'Net 30' },
              { value: 'Net 45', label: 'Net 45' },
              { value: 'Net 60', label: 'Net 60' },
              { value: 'Cash on Delivery', label: 'Cash on Delivery' },
              { value: 'Advance Payment', label: 'Advance Payment' },
            ]}
          />

          <Textarea
            label="Notes"
            placeholder="Enter any additional notes about this supplier"
            value={formData.notes}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, notes: event.currentTarget.value }))
            }
            rows={3}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSupplier} loading={isLoading}>
              {editingSupplier ? 'Update' : 'Add'} Supplier
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};

export default AddSuppliers;
