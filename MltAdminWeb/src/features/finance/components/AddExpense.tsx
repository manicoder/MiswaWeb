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
} from '@tabler/icons-react';
import { DatePickerInput } from '@mantine/dates';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ExpenseType,
  ChartOfAccount,
  ExpenseCategory,
  PaymentMode,
  ExpenseTag,
} from '../../../types/finance';
import { expenseService, chartOfAccountsService } from '../../../services/financeService';
import { fileUploadService } from '../../../services/fileUploadService';
import { notifications } from '@mantine/notifications';
import { LoadingOverlay } from '@mantine/core';

const AddExpense: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [chartAccounts, setChartAccounts] = useState<ChartOfAccount[]>([]);
  const [chartAccountsLoading, setChartAccountsLoading] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [expenseCategoriesLoading, setExpenseCategoriesLoading] = useState(false);
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
  });

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadChartOfAccounts();
    loadExpenseCategories();
    loadPaymentModes();
    loadExpenseTags();
  }, []);

  const loadChartOfAccounts = async () => {
    setChartAccountsLoading(true);
    try {
      const accounts = await chartOfAccountsService.getChartOfAccounts();
      setChartAccounts(accounts);
    } catch (error) {
      console.error('Failed to load chart of accounts:', error);
      setChartAccounts([]);
    } finally {
      setChartAccountsLoading(false);
    }
  };

  const loadExpenseCategories = async () => {
    setExpenseCategoriesLoading(true);
    try {
      const categories = await expenseService.getExpenseCategories();
      setExpenseCategories(categories);
    } catch (error) {
      console.error('Failed to load expense categories:', error);
      setExpenseCategories([]);
    } finally {
      setExpenseCategoriesLoading(false);
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
        currency: 'INR',
        status: 'pending' as const,
        createdBy: JSON.parse(localStorage.getItem('mlt-admin-user') || '{}').name || 'System User',
      };

      await expenseService.createExpense(expenseData);

      notifications.show({
        title: 'Success',
        message: 'Expense added successfully',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      // Navigate back to expense management
      navigate('/finance/expense-management');
    } catch (error) {
      console.error('Error creating expense:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to add expense. Please try again.',
        color: 'red',
        icon: <IconCheck size={16} />,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
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
      receiptFile: null,
      notes: '',
      tags: [] as string[],
    });
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

  const breadcrumbItems = [
    { title: 'Finance', href: '/finance' },
    { title: 'Expenses', href: '/finance/expense-management' },
    { title: 'Add Expense', href: '#' },
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
                Save Expense
              </Button>
            </Group>
          </Group>

          <Breadcrumbs mb="md">{breadcrumbItems}</Breadcrumbs>

          <Title order={1} mb="xs">
            Add New Expense
          </Title>
          <Text c="dimmed" size="sm">
            Record a new expense with detailed information
          </Text>
        </div>

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
                    Classification
                  </Title>

                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Select
                        label="Expense Type"
                        placeholder={
                          expenseCategoriesLoading ? 'Loading...' : 'Select expense type'
                        }
                        value={formData.type}
                        onChange={(value) =>
                          setFormData((prev) => ({ ...prev, type: value as ExpenseType }))
                        }
                        data={uniqueExpenseTypes}
                        error={errors.type}
                        required
                        searchable
                        disabled={expenseCategoriesLoading}
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
                        searchable
                        disabled={expenseCategoriesLoading || !formData.type}
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
                        label="Account Code"
                        placeholder="Select account code"
                        value={formData.chartOfAccountCode}
                        onChange={(value) => {
                          setFormData((prev) => ({ ...prev, chartOfAccountCode: value || '' }));
                          // Auto-fill account name
                          const account = chartAccounts.find((acc) => acc.code === value);
                          if (account) {
                            setFormData((prev) => ({ ...prev, chartOfAccountName: account.name }));
                          }
                        }}
                        data={chartAccounts.map((acc) => ({
                          value: acc.code,
                          label: `${acc.code} | ${acc.name}`,
                        }))}
                        searchable
                        disabled={chartAccountsLoading}
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="Account Name"
                        placeholder="Account name will be auto-filled"
                        value={formData.chartOfAccountName}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            chartOfAccountName: event.currentTarget.value,
                          }))
                        }
                        disabled
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
                    <Text fw={600} size="lg">
                      ₹{formData.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </Group>

                  {formData.type && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Type:
                      </Text>
                      <Badge color="blue" variant="light">
                        {uniqueExpenseTypes.find((t) => t.value === formData.type)?.label}
                      </Badge>
                    </Group>
                  )}

                  {formData.category && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Category:
                      </Text>
                      <Text size="sm" fw={500}>
                        {formData.category}
                      </Text>
                    </Group>
                  )}

                  {formData.paymentMode && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Payment:
                      </Text>
                      <Badge color="green" variant="light">
                        {paymentModeOptions.find((p) => p.value === formData.paymentMode)?.label}
                      </Badge>
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
                    Clear Form
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

export default AddExpense;
