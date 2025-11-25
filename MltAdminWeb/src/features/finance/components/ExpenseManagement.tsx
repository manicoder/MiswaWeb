import {
  Container,
  Paper,
  Title,
  Text,
  Group,
  Button,
  Stack,
  Card,
  Grid,
  LoadingOverlay,
  Badge,
  Alert,
  Table,
  ActionIcon,
  Tooltip,
  Pagination,
  Select,
  TextInput,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconPlus,
  IconReceipt,
  IconCalendar,
  IconDownload,
  IconEdit,
  IconTrash,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExpenseType, Expense } from '../../../types/finance';
import { chartOfAccountsService } from '../../../services/financeService';
import { useExpenses } from '../../../hooks/useFinance';

const ExpenseManagement: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    startDate: null as string | null,
    endDate: null as string | null,
    type: '',
    category: '',
    status: '',
    paymentMode: '',
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    // setChartAccountsLoading(true); // Removed as per edit hint
    chartOfAccountsService
      .getChartOfAccounts()
      .then(() => {
        // This line was not in the edit hint, but should be changed for consistency
        // console.error('Failed to load chart of accounts:', error); // This line was not in the edit hint, but should be changed for consistency
        // Set empty array instead of mock data // This line was not in the edit hint, but should be changed for consistency
        // setChartAccounts([]); // This line was not in the edit hint, but should be changed for consistency
      })
      .catch((error) => {
        console.error('Failed to load chart of accounts:', error);
        // Set empty array instead of mock data
        // setChartAccounts([]); // This line was not in the edit hint, but should be changed for consistency
      })
      .finally(() => {
        // setChartAccountsLoading(false); // Removed as per edit hint
      });
  }, []);

  // Memoize the filter object to prevent infinite re-renders
  const expenseFilter = useMemo(
    () => ({
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      types: filters.type ? [filters.type as ExpenseType] : undefined,
      categories: filters.category ? [filters.category] : undefined,
      status: filters.status as 'pending' | 'approved' | 'rejected' | undefined,
      search: filters.search || undefined,
    }),
    [
      filters.startDate,
      filters.endDate,
      filters.type,
      filters.category,
      filters.status,
      filters.search,
    ],
  );

  const { data, loading, error, deleteExpense, updateExpense, refetch } = useExpenses(
    expenseFilter,
    currentPage,
    20,
  );

  const expenses = data?.data || [];
  const totalPages = data?.pagination?.totalPages || 1;
  const isLoading = loading;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const getStatusColor = (status: string | undefined | null) => {
    if (!status) return 'gray';

    switch (status) {
      case 'approved':
        return 'green';
      case 'rejected':
        return 'red';
      case 'pending':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const getPaymentModeColor = (mode: string | undefined | null) => {
    if (!mode) return 'gray';

    switch (mode.toLowerCase()) {
      case 'cash':
        return 'green';
      case 'card':
        return 'blue';
      case 'bank_transfer':
        return 'purple';
      case 'upi':
        return 'orange';
      case 'cheque':
        return 'teal';
      case 'online':
        return 'indigo';
      default:
        return 'gray';
    }
  };

  const handleEdit = (expense: Expense) => {
    navigate(`/finance/edit-expense/${expense.id}`); // Navigate to edit page
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteExpense(id);
        refetch();
      } catch (error) {
        console.error('Error deleting expense:', error);
      }
    }
  };

  const handleApprove = async (id: string) => {
    if (confirm('Are you sure you want to approve this expense?')) {
      try {
        await updateExpense(id, { status: 'approved' });
        refetch();
      } catch (error) {
        console.error('Error approving expense:', error);
      }
    }
  };

  const handleReject = async (id: string) => {
    if (confirm('Are you sure you want to reject this expense?')) {
      try {
        await updateExpense(id, { status: 'rejected' });
        refetch();
      } catch (error) {
        console.error('Error rejecting expense:', error);
      }
    }
  };

  const handleAddNew = () => {
    navigate('/finance/add-expense'); // Navigate to add page
  };

  if (error) {
    return (
      <Container size="xl">
        <Alert color="red" title="Error">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <div>
            <Title order={1}>Expense Management</Title>
            <Text c="dimmed" size="sm">
              Track and manage your business expenses with detailed categorization
            </Text>
          </div>
          <Group>
            <Button leftSection={<IconDownload size={16} />} variant="light">
              Export
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={handleAddNew}>
              Add Expense
            </Button>
          </Group>
        </Group>

        {/* Filters */}
        <Paper withBorder p="md">
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 3 }}>
              <DatePickerInput
                label="Start Date"
                placeholder="Select start date"
                value={filters.startDate ? new Date(filters.startDate) : null}
                onChange={(date) => {
                  const normalized = date
                    ? typeof date === 'string'
                      ? new Date(date)
                      : (date as Date)
                    : null;
                  const dateString = normalized ? normalized.toISOString().split('T')[0] : null;
                  setFilters((prev) => ({ ...prev, startDate: dateString }));
                }}
                leftSection={<IconCalendar size={16} />}
                clearable
                maxDate={new Date()}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <DatePickerInput
                label="End Date"
                placeholder="Select end date"
                value={filters.endDate ? new Date(filters.endDate) : null}
                onChange={(date) => {
                  const normalized = date
                    ? typeof date === 'string'
                      ? new Date(date)
                      : (date as Date)
                    : null;
                  const dateString = normalized ? normalized.toISOString().split('T')[0] : null;
                  setFilters((prev) => ({ ...prev, endDate: dateString }));
                }}
                leftSection={<IconCalendar size={16} />}
                clearable
                maxDate={new Date()}
                minDate={filters.startDate ? new Date(filters.startDate) : undefined}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <Select
                label="Type"
                placeholder="All Types"
                value={filters.type}
                onChange={(value) => setFilters((prev) => ({ ...prev, type: value || '' }))}
                data={[
                  { value: 'rent', label: 'Rent' },
                  { value: 'utilities', label: 'Utilities' },
                  { value: 'transport', label: 'Transport' },
                  { value: 'advertising', label: 'Advertising' },
                  { value: 'shipping', label: 'Shipping' },
                  { value: 'salaries', label: 'Salaries' },
                  { value: 'tools', label: 'Tools' },
                  { value: 'marketing', label: 'Marketing' },
                  { value: 'software', label: 'Software' },
                  { value: 'inventory', label: 'Inventory' },
                  { value: 'maintenance', label: 'Maintenance' },
                  { value: 'insurance', label: 'Insurance' },
                  { value: 'legal', label: 'Legal' },
                  { value: 'consulting', label: 'Consulting' },
                  { value: 'travel', label: 'Travel' },
                  { value: 'meals', label: 'Meals' },
                  { value: 'office_supplies', label: 'Office Supplies' },
                  { value: 'other', label: 'Other' },
                ]}
                clearable
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <Select
                label="Status"
                placeholder="All Status"
                value={filters.status}
                onChange={(value) => setFilters((prev) => ({ ...prev, status: value || '' }))}
                data={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'rejected', label: 'Rejected' },
                ]}
                clearable
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <Select
                label="Payment Mode"
                placeholder="All Modes"
                value={filters.paymentMode}
                onChange={(value) => setFilters((prev) => ({ ...prev, paymentMode: value || '' }))}
                data={[
                  { value: 'cash', label: 'Cash' },
                  { value: 'card', label: 'Card' },
                  { value: 'bank_transfer', label: 'Bank Transfer' },
                  { value: 'upi', label: 'UPI' },
                  { value: 'cheque', label: 'Cheque' },
                  { value: 'online', label: 'Online Payment' },
                  { value: 'other', label: 'Other' },
                ]}
                clearable
              />
            </Grid.Col>
          </Grid>
          <Group mt="md">
            <TextInput
              placeholder="Search expenses..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              style={{ flex: 1 }}
            />
            <Button variant="light" onClick={refetch}>
              Apply Filters
            </Button>
          </Group>
        </Paper>

        {/* Summary Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md">
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Total Expenses
                </Text>
                <IconReceipt size={16} color="red" />
              </Group>
              <Text size="xl" fw={700}>
                {formatCurrency(
                  expenses?.reduce((sum: number, exp: Expense) => sum + exp.amount, 0) || 0,
                )}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                {expenses?.length || 0} expenses
              </Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md">
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Pending Expenses
                </Text>
                <Badge color="yellow" variant="light">
                  {expenses?.filter((exp: Expense) => exp.status === 'pending').length || 0}
                </Badge>
              </Group>
              <Text size="xl" fw={700}>
                {formatCurrency(
                  expenses
                    ?.filter((exp: Expense) => exp.status === 'pending')
                    .reduce((sum: number, exp: Expense) => sum + exp.amount, 0) || 0,
                )}
              </Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md">
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Approved Expenses
                </Text>
                <Badge color="green" variant="light">
                  {expenses?.filter((exp: Expense) => exp.status === 'approved').length || 0}
                </Badge>
              </Group>
              <Text size="xl" fw={700}>
                {formatCurrency(
                  expenses
                    ?.filter((exp: Expense) => exp.status === 'approved')
                    .reduce((sum: number, exp: Expense) => sum + exp.amount, 0) || 0,
                )}
              </Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md">
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Average Expense
                </Text>
                <IconReceipt size={16} color="blue" />
              </Group>
              <Text size="xl" fw={700}>
                {expenses?.length
                  ? formatCurrency(
                      expenses.reduce((sum: number, exp: Expense) => sum + exp.amount, 0) /
                        expenses.length,
                    )
                  : formatCurrency(0)}
              </Text>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Expenses Table */}
        <Paper withBorder>
          <LoadingOverlay visible={isLoading} />
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Category</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th>Payment Mode</Table.Th>
                <Table.Th>Paid To</Table.Th>
                <Table.Th>Chart of Account</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {expenses?.map((expense: Expense) => (
                <Table.Tr key={expense.id}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {formatDate(expense.date)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {expense.description}
                    </Text>
                    {expense.notes && (
                      <Text size="xs" c="dimmed">
                        {expense.notes}
                      </Text>
                    )}
                    {expense.tags && expense.tags.length > 0 && (
                      <Group gap={4} mt={4}>
                        {expense.tags.slice(0, 2).map((tag, index) => (
                          <Badge key={index} size="xs" variant="light" color="gray">
                            {tag}
                          </Badge>
                        ))}
                        {expense.tags.length > 2 && (
                          <Badge size="xs" variant="light" color="gray">
                            +{expense.tags.length - 2}
                          </Badge>
                        )}
                      </Group>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="blue">
                      {expense.type}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="teal">
                      {expense.category}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={600} size="sm">
                      {formatCurrency(expense.amount)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={getPaymentModeColor(expense.paymentMode)}>
                      {expense.paymentMode}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{expense.paidTo}</Text>
                  </Table.Td>
                  <Table.Td>
                    {expense.chartOfAccountCode ? (
                      <Text size="sm" c="dimmed">
                        {expense.chartOfAccountCode}
                      </Text>
                    ) : (
                      <Text size="sm" c="dimmed">
                        -
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Badge color={getStatusColor(expense.status)} variant="light">
                      {expense.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="Edit">
                        <ActionIcon variant="light" size="sm" onClick={() => handleEdit(expense)}>
                          <IconEdit size={14} />
                        </ActionIcon>
                      </Tooltip>
                      {expense.status === 'pending' && (
                        <>
                          <Tooltip label="Approve">
                            <ActionIcon
                              variant="light"
                              color="green"
                              size="md"
                              onClick={() => handleApprove(expense.id)}
                            >
                              <IconCheck size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Reject">
                            <ActionIcon
                              variant="light"
                              color="red"
                              size="md"
                              onClick={() => handleReject(expense.id)}
                            >
                              <IconX size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip label="Delete">
                        <ActionIcon
                          variant="light"
                          color="red"
                          size="sm"
                          onClick={() => handleDelete(expense.id)}
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
        {totalPages > 1 && (
          <Group justify="center">
            <Pagination total={totalPages} value={currentPage} onChange={setCurrentPage} />
          </Group>
        )}
      </Stack>
    </Container>
  );
};

export default ExpenseManagement;
