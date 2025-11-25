import {
  Container,
  Paper,
  Title,
  TextInput,
  Select,
  NumberInput,
  Textarea,
  Button,
  Group,
  Stack,
  Text,
  Badge,
  Breadcrumbs,
  Anchor,
  Grid,
  Card,
  MultiSelect,
  FileInput,
  Alert,
} from '@mantine/core';
import {
  IconUpload,
  IconCalendar,
  IconReceipt,
  IconTag,
  IconBuilding,
  IconCreditCard,
  IconNotes,
  IconArrowLeft,
  IconCheck,
  IconCategory,
  IconUser,
  IconX,
  IconAlertCircle,
} from '@tabler/icons-react';
import { DatePickerInput } from '@mantine/dates';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ExpenseType,
  ChartOfAccount,
  ExpenseCategory,
  PaymentMode,
  ExpenseTag,
  Expense,
} from '../../../types/finance';
import { expenseService, chartOfAccountsService } from '../../../services/financeService';
import { fileUploadService } from '../../../services/fileUploadService';
import { notifications } from '@mantine/notifications';
import { LoadingOverlay } from '@mantine/core';

const EditExpense: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingExpense, setIsLoadingExpense] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expense, setExpense] = useState<Expense | null>(null);

  const [chartAccounts, setChartAccounts] = useState<ChartOfAccount[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [paymentModesData, setPaymentModesData] = useState<PaymentMode[]>([]);
  const [expenseTagsData, setExpenseTagsData] = useState<ExpenseTag[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    description: '',
    type: '' as ExpenseType | '',
    category: '',
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    paymentMode: '',
    paidTo: '',
    chartOfAccountCode: '',
    chartOfAccountName: '',
    receiptUrl: '',
    receiptFile: null as File | null,
    notes: '',
    tags: [] as string[],
    status: 'pending' as 'pending' | 'approved' | 'rejected',
  });

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      loadExpense();
    }
    loadChartOfAccounts();
    loadExpenseCategories();
    loadPaymentModes();
    loadExpenseTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadExpense = async () => {
    if (!id) return;

    setIsLoadingExpense(true);
    setError(null);
    try {
      const expenseData = await expenseService.getExpense(id);
      setExpense(expenseData);
      setFormData({
        description: expenseData.description,
        type: expenseData.type,
        category: expenseData.category,
        amount: expenseData.amount,
        date: expenseData.date,
        paymentMode: expenseData.paymentMode,
        paidTo: expenseData.paidTo,
        chartOfAccountCode: expenseData.chartOfAccountCode || '',
        chartOfAccountName: expenseData.chartOfAccountName || '',
        receiptUrl: expenseData.receiptUrl || '',
        receiptFile: null,
        notes: expenseData.notes || '',
        tags: expenseData.tags || [],
        status: expenseData.status,
      });
    } catch (err) {
      setError('Failed to load expense. Please try again.');
      console.error('Error loading expense:', err);
    } finally {
      setIsLoadingExpense(false);
    }
  };

  const loadChartOfAccounts = async () => {
    try {
      const accounts = await chartOfAccountsService.getChartOfAccounts();
      setChartAccounts(accounts);
    } catch (error) {
      console.error('Failed to load chart of accounts:', error);
      setChartAccounts([]);
    }
  };

  const loadExpenseCategories = async () => {
    try {
      const categories = await expenseService.getExpenseCategories();
      setExpenseCategories(categories);
    } catch (error) {
      console.error('Failed to load expense categories:', error);
      setExpenseCategories([]);
    }
  };

  const loadPaymentModes = async () => {
    try {
      const modes = await expenseService.getPaymentModes();
      setPaymentModesData(modes);
    } catch (error) {
      console.error('Failed to load payment modes:', error);
      setPaymentModesData([]);
    }
  };

  const loadExpenseTags = async () => {
    try {
      const tags = await expenseService.getExpenseTags();
      setExpenseTagsData(tags);
    } catch (error) {
      console.error('Failed to load expense tags:', error);
      setExpenseTagsData([]);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.type) {
      newErrors.type = 'Expense type is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.paymentMode) {
      newErrors.paymentMode = 'Payment mode is required';
    }

    if (!formData.paidTo.trim()) {
      newErrors.paidTo = 'Paid to is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please fix the errors in the form',
        color: 'red',
      });
      return;
    }

    if (!id) return;

    setIsLoading(true);
    try {
      let receiptUrl = formData.receiptUrl;

      // Upload file if provided
      if (formData.receiptFile) {
        try {
          const uploadResult = await fileUploadService.uploadReceipt(formData.receiptFile);
          receiptUrl = uploadResult.url;
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
        }
      }

      const expenseData = {
        description: formData.description,
        type: formData.type as ExpenseType,
        category: formData.category,
        amount: formData.amount,
        date: formData.date,
        paymentMode: formData.paymentMode,
        paidTo: formData.paidTo,
        chartOfAccountCode: formData.chartOfAccountCode || undefined,
        chartOfAccountName: formData.chartOfAccountName || undefined,
        receiptUrl: receiptUrl,
        notes: formData.notes,
        tags: formData.tags,
        status: formData.status,
      };

      await expenseService.updateExpense(id, expenseData);

      notifications.show({
        title: 'Success',
        message: 'Expense updated successfully',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      // Navigate back to expense management
      navigate('/finance/expense-management');
    } catch (error) {
      console.error('Error updating expense:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to update expense. Please try again.',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      await expenseService.updateExpense(id, { status: 'approved' });

      notifications.show({
        title: 'Success',
        message: 'Expense approved successfully',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      // Reload the expense to update the status
      await loadExpense();
    } catch (error) {
      console.error('Error approving expense:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to approve expense. Please try again.',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      await expenseService.updateExpense(id, { status: 'rejected' });

      notifications.show({
        title: 'Success',
        message: 'Expense rejected successfully',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      // Reload the expense to update the status
      await loadExpense();
    } catch (error) {
      console.error('Error rejecting expense:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to reject expense. Please try again.',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (expense) {
      setFormData({
        description: expense.description,
        type: expense.type,
        category: expense.category,
        amount: expense.amount,
        date: expense.date,
        paymentMode: expense.paymentMode,
        paidTo: expense.paidTo,
        chartOfAccountCode: expense.chartOfAccountCode || '',
        chartOfAccountName: expense.chartOfAccountName || '',
        receiptUrl: expense.receiptUrl || '',
        receiptFile: null,
        notes: expense.notes || '',
        tags: expense.tags || [],
        status: expense.status,
      });
    }
    setErrors({});
  };

  // Get unique expense types from categories
  const uniqueExpenseTypes = Array.from(new Set(expenseCategories.map((cat) => cat.type))).map(
    (type) => ({
      value: type,
      label: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '),
    }),
  );

  // Transform payment modes from database to select options
  const paymentModeOptions = paymentModesData.map((mode) => ({
    value: mode.name,
    label: mode.displayName,
  }));

  // Transform expense tags from database to select options
  const expenseTagOptions = expenseTagsData.map((tag) => ({
    value: tag.name,
    label: tag.displayName,
  }));

  const getStatusColor = (status: string) => {
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

  const breadcrumbItems = [
    { title: 'Finance', href: '/finance' },
    { title: 'Expenses', href: '/finance/expense-management' },
    { title: 'Edit Expense', href: '#' },
  ].map((item, index) => (
    <Anchor
      key={index}
      href={item.href}
      onClick={(e) => {
        e.preventDefault();
        if (item.href !== '#') {
          navigate(item.href);
        }
      }}
    >
      {item.title}
    </Anchor>
  ));

  if (isLoadingExpense) {
    return (
      <Container size="xl" py="md">
        <LoadingOverlay visible={true} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="md">
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          {error}
        </Alert>
      </Container>
    );
  }

  if (!expense) {
    return (
      <Container size="xl" py="md">
        <Alert icon={<IconAlertCircle size={16} />} title="Not Found" color="red">
          Expense not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" py="md">
      <LoadingOverlay visible={isLoading} />

      <Stack gap="lg">
        {/* Header */}
        <div>
          <Group justify="space-between" align="center" mb="md">
            <Button
              variant="light"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/finance/expense-management')}
            >
              Back to Expenses
            </Button>
            <Group>
              <Button variant="light" onClick={handleReset}>
                Reset Form
              </Button>
              <Button onClick={handleSubmit} loading={isLoading}>
                Update Expense
              </Button>
            </Group>
          </Group>

          <Breadcrumbs mb="md">{breadcrumbItems}</Breadcrumbs>

          <Group justify="space-between" align="center">
            <div>
              <Title order={1} mb="xs">
                Edit Expense
              </Title>
              <Text c="dimmed" size="sm">
                Update expense details and manage approval status
              </Text>
            </div>
            <Badge size="lg" color={getStatusColor(formData.status)} variant="light">
              {formData.status.toUpperCase()}
            </Badge>
          </Group>
        </div>

        {/* Status Actions */}
        {formData.status === 'pending' && (
          <Paper withBorder p="md">
            <Title order={4} mb="md">
              Approval Actions
            </Title>
            <Group>
              <Button
                color="green"
                leftSection={<IconCheck size={16} />}
                onClick={handleApprove}
                loading={isLoading}
              >
                Approve Expense
              </Button>
              <Button
                color="red"
                leftSection={<IconX size={16} />}
                onClick={handleReject}
                loading={isLoading}
              >
                Reject Expense
              </Button>
            </Group>
          </Paper>
        )}

        {/* Main Form */}
        <Grid>
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <Paper withBorder p="xl">
              <Stack gap="xl">
                {/* Basic Information */}
                <div>
                  <Title order={3} mb="md">
                    <IconReceipt size={20} style={{ marginRight: 8 }} />
                    Basic Information
                  </Title>

                  <Grid>
                    <Grid.Col span={{ base: 12, md: 8 }}>
                      <TextInput
                        label="Description"
                        placeholder="Enter expense description"
                        value={formData.description}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            description: event.currentTarget.value,
                          }))
                        }
                        error={errors.description}
                        required
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <NumberInput
                        label="Amount (₹)"
                        placeholder="0.00"
                        value={formData.amount === 0 ? undefined : formData.amount}
                        onChange={(value) =>
                          setFormData((prev) => ({ ...prev, amount: Number(value) || 0 }))
                        }
                        error={errors.amount}
                        required
                        min={0}
                        decimalScale={2}
                        leftSection="₹"
                      />
                    </Grid.Col>
                  </Grid>
                </div>

                {/* Category and Type */}
                <div>
                  <Title order={3} mb="md">
                    <IconCategory size={20} style={{ marginRight: 8 }} />
                    Category & Type
                  </Title>

                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Select
                        label="Expense Type"
                        placeholder="Select expense type"
                        value={formData.type}
                        onChange={(value) =>
                          setFormData((prev) => ({ ...prev, type: (value as ExpenseType) || '' }))
                        }
                        data={uniqueExpenseTypes}
                        error={errors.type}
                        required
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Select
                        label="Category"
                        placeholder="Select category"
                        value={formData.category}
                        onChange={(value) =>
                          setFormData((prev) => ({ ...prev, category: value || '' }))
                        }
                        data={expenseCategories
                          .filter((cat) => cat.type === formData.type)
                          .map((cat) => ({
                            value: cat.name,
                            label: cat.name,
                          }))}
                        error={errors.category}
                        required
                        disabled={!formData.type}
                      />
                    </Grid.Col>
                  </Grid>
                </div>

                {/* Payment Information */}
                <div>
                  <Title order={3} mb="md">
                    <IconCreditCard size={20} style={{ marginRight: 8 }} />
                    Payment Information
                  </Title>

                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Select
                        label="Payment Mode"
                        placeholder="Select payment mode"
                        value={formData.paymentMode}
                        onChange={(value) =>
                          setFormData((prev) => ({ ...prev, paymentMode: value || '' }))
                        }
                        data={paymentModeOptions}
                        error={errors.paymentMode}
                        required
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="Paid To"
                        placeholder="Enter recipient name"
                        value={formData.paidTo}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, paidTo: event.currentTarget.value }))
                        }
                        error={errors.paidTo}
                        required
                        leftSection={<IconUser size={16} />}
                      />
                    </Grid.Col>
                  </Grid>
                </div>

                {/* Date and Receipt */}
                <div>
                  <Title order={3} mb="md">
                    <IconCalendar size={20} style={{ marginRight: 8 }} />
                    Date & Receipt
                  </Title>

                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <DatePickerInput
                        label="Expense Date"
                        placeholder="Select date"
                        value={formData.date ? new Date(formData.date) : null}
                        onChange={(date: string | null) =>
                          setFormData((prev) => ({
                            ...prev,
                            date: date || '',
                          }))
                        }
                        error={errors.date}
                        required
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <FileInput
                        label="Receipt File"
                        placeholder="Upload receipt (PDF, JPG, PNG)"
                        value={formData.receiptFile}
                        onChange={(file) =>
                          setFormData((prev) => ({
                            ...prev,
                            receiptFile: file,
                          }))
                        }
                        accept=".pdf,.jpg,.jpeg,.png"
                        leftSection={<IconUpload size={16} />}
                        clearable
                      />
                      <Text size="xs" c="dimmed" mt="xs">
                        Accepted formats: PDF, JPG, PNG (Max 10MB)
                      </Text>
                    </Grid.Col>
                  </Grid>
                </div>

                {/* Chart of Accounts */}
                <div>
                  <Title order={3} mb="md">
                    <IconBuilding size={20} style={{ marginRight: 8 }} />
                    Chart of Accounts
                  </Title>

                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Select
                        label="Chart of Account"
                        placeholder="Select account"
                        value={formData.chartOfAccountCode}
                        onChange={(value) => {
                          const account = chartAccounts.find((acc) => acc.code === value);
                          setFormData((prev) => ({
                            ...prev,
                            chartOfAccountCode: value || '',
                            chartOfAccountName: account?.name || '',
                          }));
                        }}
                        data={chartAccounts.map((account) => ({
                          value: account.code,
                          label: `${account.code} - ${account.name}`,
                        }))}
                        searchable
                        clearable
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="Account Name"
                        value={formData.chartOfAccountName}
                        disabled
                        leftSection={<IconBuilding size={16} />}
                      />
                    </Grid.Col>
                  </Grid>
                </div>

                {/* Tags and Notes */}
                <div>
                  <Title order={3} mb="md">
                    <IconTag size={20} style={{ marginRight: 8 }} />
                    Tags & Notes
                  </Title>

                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <MultiSelect
                        label="Tags"
                        placeholder="Select or add tags"
                        value={formData.tags}
                        onChange={(value) => setFormData((prev) => ({ ...prev, tags: value }))}
                        data={expenseTagOptions}
                        searchable
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Textarea
                        label="Notes"
                        placeholder="Add any additional notes"
                        value={formData.notes}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, notes: event.currentTarget.value }))
                        }
                        rows={3}
                        leftSection={<IconNotes size={16} />}
                      />
                    </Grid.Col>
                  </Grid>
                </div>
              </Stack>
            </Paper>
          </Grid.Col>

          {/* Sidebar */}
          <Grid.Col span={{ base: 12, lg: 4 }}>
            <Stack gap="md">
              {/* Summary Card */}
              <Card withBorder p="md">
                <Title order={4} mb="md">
                  Expense Summary
                </Title>

                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Amount:
                    </Text>
                    <Text size="sm" fw={600}>
                      ₹{formData.amount.toLocaleString()}
                    </Text>
                  </Group>

                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Type:
                    </Text>
                    <Badge size="sm" variant="light" color="blue">
                      {formData.type}
                    </Badge>
                  </Group>

                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Category:
                    </Text>
                    <Badge size="sm" variant="light" color="teal">
                      {formData.category}
                    </Badge>
                  </Group>

                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Payment Mode:
                    </Text>
                    <Text size="sm">{formData.paymentMode}</Text>
                  </Group>

                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Paid To:
                    </Text>
                    <Text size="sm">{formData.paidTo}</Text>
                  </Group>

                  {formData.chartOfAccountCode && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Chart of Account:
                      </Text>
                      <Text size="sm" c="dimmed">
                        {formData.chartOfAccountCode}
                      </Text>
                    </Group>
                  )}

                  {formData.tags.length > 0 && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Tags:
                      </Text>
                      <Group gap="xs">
                        {formData.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} size="xs" variant="outline">
                            {tag}
                          </Badge>
                        ))}
                        {formData.tags.length > 2 && (
                          <Badge size="xs" variant="outline">
                            +{formData.tags.length - 2}
                          </Badge>
                        )}
                      </Group>
                    </Group>
                  )}
                </Stack>
              </Card>

              {/* Quick Actions */}
              <Card withBorder p="md">
                <Title order={4} mb="md">
                  Quick Actions
                </Title>

                <Stack gap="sm">
                  <Button
                    variant="light"
                    fullWidth
                    onClick={handleReset}
                    leftSection={<IconX size={16} />}
                  >
                    Reset Form
                  </Button>

                  <Button
                    variant="light"
                    fullWidth
                    onClick={() => navigate('/finance/expense-management')}
                    leftSection={<IconArrowLeft size={16} />}
                  >
                    Back to List
                  </Button>
                </Stack>
              </Card>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
};

export default EditExpense;
