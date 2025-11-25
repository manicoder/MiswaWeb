import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Group,
  Button,
  TextInput,
  Select,
  Badge,
  Card,
  ActionIcon,
  Alert,
  Center,
  Table,
  ScrollArea,
  Tooltip,
  Grid,
  Tabs,
  Skeleton,
  NumberInput,
  Textarea,
  Divider,
  Modal,
  Collapse,
  ThemeIcon,
} from '@mantine/core';
import {
  IconRefresh,
  IconAlertCircle,
  IconPlus,
  IconEye,
  IconEdit,
  IconTrash,
  IconDatabase,
  IconReceipt,
  IconCalculator,
  IconCheck,
  IconX,
  IconInfoCircle,
  IconChartBar,
  IconPackage,
  IconChevronDown,
  IconChevronUp,
  IconBuildingBank,
  IconWallet,
  IconTrendingUp,
  IconReceipt2,
  IconSelector,
  IconFilter,
} from '@tabler/icons-react';
import { apiClient } from '../../../../services/api';
import RealTimeInventory from './RealTimeInventory';

interface AccountGroup {
  id: string;
  name: string;
  type: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  ledgers: Ledger[];
}

interface Ledger {
  id: string;
  name: string;
  groupId: string;
  group: AccountGroup;
  openingBalance: number;
  description?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  currentBalance: number;
}

interface Transaction {
  id: string;
  date: string;
  type: string;
  description?: string;
  createdBy: string;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  entries: TransactionEntry[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

interface TransactionEntry {
  id: string;
  transactionId: string;
  ledgerId: string;
  ledger: Ledger;
  isDebit: boolean;
  amount: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

const AccountingSystem: React.FC = () => {
  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'groups' | 'ledgers' | 'transactions' | 'inventory'>(
    'groups',
  );
  const [error, setError] = useState<string>('');

  // Enhanced form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedAccountGroup, setSelectedAccountGroup] = useState<AccountGroup | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form states
  const [newAccountGroup, setNewAccountGroup] = useState({
    name: '',
    type: '',
    description: '',
  });

  const [newLedger, setNewLedger] = useState({
    name: '',
    groupId: '',
    openingBalance: 0,
    description: '',
    createdBy: 'admin',
  });

  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString(),
    type: 'Payment',
    description: '',
    createdBy: 'admin',
    notes: '',
    entries: [
      { ledgerId: '', isDebit: true, amount: 0, description: '' },
      { ledgerId: '', isDebit: false, amount: 0, description: '' },
    ],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [groupsResponse, ledgersResponse, transactionsResponse] = await Promise.all([
        apiClient.get('/finance/account-groups'),
        apiClient.get('/finance/ledgers'),
        apiClient.get('/finance/transactions'),
      ]);

      if (groupsResponse.data.success) {
        setAccountGroups(groupsResponse.data.data.accountGroups || []);
      }

      if (ledgersResponse.data.success) {
        setLedgers(ledgersResponse.data.data.ledgers || []);
      }

      if (transactionsResponse.data.success) {
        const transactionsData = transactionsResponse.data.data.transactions || [];
        console.log(
          'Transaction statuses:',
          transactionsData.map((t: Transaction) => ({ id: t.id, status: t.status })),
        );
        setTransactions(transactionsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load accounting data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccountGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await apiClient.post('/finance/account-groups', newAccountGroup);
      if (response.data.success) {
        setNewAccountGroup({ name: '', type: '', description: '' });
        setShowCreateForm(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error creating account group:', error);
      setError('Failed to create account group');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await apiClient.post('/finance/ledgers', newLedger);
      if (response.data.success) {
        setNewLedger({
          name: '',
          groupId: '',
          openingBalance: 0,
          description: '',
          createdBy: 'admin',
        });
        setShowCreateForm(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error creating ledger:', error);
      setError('Failed to create ledger');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate transaction entries
    const hasEmptyLedgerIds = newTransaction.entries.some((entry) => !entry.ledgerId);
    const hasZeroAmounts = newTransaction.entries.some((entry) => entry.amount <= 0);
    const hasValidEntries = newTransaction.entries.length >= 2;

    if (hasEmptyLedgerIds) {
      setError('All transaction entries must have a selected ledger');
      return;
    }

    if (hasZeroAmounts) {
      setError('All transaction entries must have amounts greater than zero');
      return;
    }

    if (!hasValidEntries) {
      setError('Transaction must have at least 2 entries');
      return;
    }

    // Validate that debits equal credits
    const totalDebit = newTransaction.entries
      .filter((entry) => entry.isDebit)
      .reduce((sum, entry) => sum + entry.amount, 0);
    const totalCredit = newTransaction.entries
      .filter((entry) => !entry.isDebit)
      .reduce((sum, entry) => sum + entry.amount, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      setError(
        `Transaction must be balanced. Total debits: ${totalDebit}, Total credits: ${totalCredit}`,
      );
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await apiClient.post('/finance/transactions', newTransaction);
      if (response.data.success) {
        setNewTransaction({
          date: new Date().toISOString(),
          type: 'Payment',
          description: '',
          createdBy: 'admin',
          notes: '',
          entries: [
            { ledgerId: '', isDebit: true, amount: 0, description: '' },
            { ledgerId: '', isDebit: false, amount: 0, description: '' },
          ],
        });
        setShowCreateForm(false);
        fetchData();
      }
    } catch (error: unknown) {
      console.error('Error creating transaction:', error);
      const errorMessage =
        (error as { response?: { data?: { error?: string; message?: string } } })?.response?.data
          ?.error ||
        (error as { response?: { data?: { error?: string; message?: string } } })?.response?.data
          ?.message ||
        'Failed to create transaction';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateTransactionEntry = (
    index: number,
    field: string,
    value: string | number | boolean,
  ) => {
    const updatedEntries = [...newTransaction.entries];
    updatedEntries[index] = { ...updatedEntries[index], [field]: value };
    setNewTransaction({ ...newTransaction, entries: updatedEntries });
  };

  const addTransactionEntry = () => {
    setNewTransaction({
      ...newTransaction,
      entries: [
        ...newTransaction.entries,
        { ledgerId: '', isDebit: true, amount: 0, description: '' },
      ],
    });
  };

  const removeTransactionEntry = (index: number) => {
    if (newTransaction.entries.length > 2) {
      const updatedEntries = newTransaction.entries.filter((_, i) => i !== index);
      setNewTransaction({ ...newTransaction, entries: updatedEntries });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getAccountGroupColor = (type: string) => {
    switch (type) {
      case 'Asset':
        return 'blue';
      case 'Liability':
        return 'red';
      case 'Income':
        return 'green';
      case 'Expense':
        return 'orange';
      default:
        return 'gray';
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'Payment':
        return 'red';
      case 'Receipt':
        return 'green';
      case 'Journal':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const getStatusColor = (status: string | undefined | null) => {
    if (!status) return 'gray';

    switch (status.toLowerCase()) {
      case 'completed':
      case 'approved':
        return 'green';
      case 'pending':
      case 'draft':
        return 'yellow';
      case 'failed':
      case 'rejected':
        return 'red';
      default:
        return 'gray';
    }
  };

  // Enhanced helper functions
  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'Asset':
        return <IconBuildingBank size={20} />;
      case 'Liability':
        return <IconWallet size={20} />;
      case 'Income':
        return <IconTrendingUp size={20} />;
      case 'Expense':
        return <IconReceipt2 size={20} />;
      default:
        return <IconDatabase size={20} />;
    }
  };

  const getAccountTypeDescription = (type: string) => {
    switch (type) {
      case 'Asset':
        return 'Resources owned by the business';
      case 'Liability':
        return 'Obligations and debts';
      case 'Income':
        return 'Revenue and earnings';
      case 'Expense':
        return 'Costs and expenditures';
      default:
        return '';
    }
  };

  const filteredAndGroupedAccountGroups = () => {
    let filtered = accountGroups;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (group) =>
          group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          group.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Apply type filter
    if (groupFilter !== 'all') {
      filtered = filtered.filter((group) => group.type === groupFilter);
    }

    // Group by type
    const grouped = filtered.reduce(
      (acc, group) => {
        if (!acc[group.type]) {
          acc[group.type] = [];
        }
        acc[group.type].push(group);
        return acc;
      },
      {} as Record<string, AccountGroup[]>,
    );

    return grouped;
  };

  const toggleGroupExpansion = (type: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedGroups(newExpanded);
  };

  const handleApproveTransaction = async (transactionId: string) => {
    try {
      setLoading(true);
      setError('');

      const response = await apiClient.patch(`/finance/transactions/${transactionId}/approve`);

      if (response.data.success) {
        // Update the transaction status in the local state
        setTransactions((prevTransactions) =>
          prevTransactions.map((transaction) =>
            transaction.id === transactionId ? { ...transaction, status: 'Approved' } : transaction,
          ),
        );
      } else {
        setError('Failed to approve transaction');
      }
    } catch (error) {
      console.error('Error approving transaction:', error);
      setError('Failed to approve transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectTransaction = async (transactionId: string) => {
    try {
      setLoading(true);
      setError('');

      const response = await apiClient.patch(`/finance/transactions/${transactionId}/reject`);

      if (response.data.success) {
        // Update the transaction status in the local state
        setTransactions((prevTransactions) =>
          prevTransactions.map((transaction) =>
            transaction.id === transactionId ? { ...transaction, status: 'Rejected' } : transaction,
          ),
        );
      } else {
        setError('Failed to reject transaction');
      }
    } catch (error) {
      console.error('Error rejecting transaction:', error);
      setError('Failed to reject transaction');
    } finally {
      setLoading(false);
    }
  };

  if (loading && accountGroups.length === 0) {
    return (
      <Container size="xl">
        <Stack gap="lg">
          <Skeleton height={60} />
          <Skeleton height={400} />
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <div>
            <Title order={1}>Accounting System</Title>
            <Text c="dimmed" size="sm">
              Manage your chart of accounts, ledgers, and financial transactions
            </Text>
          </div>
          <Group>
            <Tooltip label="Refresh data">
              <ActionIcon variant="light" onClick={fetchData} loading={loading}>
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
            <Button
              variant="light"
              leftSection={<IconChartBar size={16} />}
              onClick={() => (window.location.href = '/finance/accounting/reports')}
            >
              View Reports
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setShowCreateForm(true)}
              disabled={loading}
            >
              Create New
            </Button>
          </Group>
        </Group>

        {/* Error Alert */}
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            {error}
          </Alert>
        )}

        {/* Main Content */}
        <Tabs
          value={activeTab}
          onChange={(value) =>
            setActiveTab(value as 'groups' | 'ledgers' | 'transactions' | 'inventory')
          }
        >
          <Tabs.List>
            <Tabs.Tab value="groups" leftSection={<IconDatabase size={16} />}>
              Account Groups ({accountGroups.length})
            </Tabs.Tab>
            <Tabs.Tab value="ledgers" leftSection={<IconCalculator size={16} />}>
              Ledgers ({ledgers.length})
            </Tabs.Tab>
            <Tabs.Tab value="transactions" leftSection={<IconReceipt size={16} />}>
              Transactions ({transactions.length})
            </Tabs.Tab>
            <Tabs.Tab value="inventory" leftSection={<IconPackage size={16} />}>
              Real-Time Inventory
            </Tabs.Tab>
          </Tabs.List>

          {/* Enhanced Account Groups Tab */}
          <Tabs.Panel value="groups" pt="md">
            <Paper withBorder p="md">
              <Group justify="space-between" mb="md">
                <Title order={3}>Account Groups</Title>
                <Text size="sm" c="dimmed">
                  Categorize your accounts into Assets, Liabilities, Income, and Expenses
                </Text>
              </Group>

              {/* Enhanced Filters */}
              <Card withBorder p="md" mb="md">
                <Group gap="md">
                  <TextInput
                    placeholder="Search account groups..."
                    leftSection={<IconSelector size={16} />}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <Select
                    placeholder="Filter by type"
                    leftSection={<IconFilter size={16} />}
                    data={[
                      { value: 'all', label: 'All Types' },
                      { value: 'Asset', label: 'Assets' },
                      { value: 'Liability', label: 'Liabilities' },
                      { value: 'Income', label: 'Income' },
                      { value: 'Expense', label: 'Expenses' },
                    ]}
                    value={groupFilter}
                    onChange={(value) => setGroupFilter(value || 'all')}
                    clearable
                  />
                  <Button
                    variant="light"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setGroupFilter('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                  <Button
                    variant="light"
                    size="sm"
                    onClick={() => {
                      if (accountGroups.length > 0) {
                        setSelectedAccountGroup(accountGroups[0]);
                        console.log('Test: Set selected group to', accountGroups[0].name);
                      }
                    }}
                  >
                    Test Select First Group
                  </Button>
                </Group>
              </Card>

              {accountGroups.length === 0 ? (
                <Center py="xl">
                  <Stack align="center" gap="md">
                    <IconDatabase size={48} color="gray" />
                    <Text c="dimmed">No account groups found</Text>
                    <Button onClick={() => setShowCreateForm(true)}>
                      Create First Account Group
                    </Button>
                  </Stack>
                </Center>
              ) : (
                <Stack gap="lg">
                  {Object.entries(filteredAndGroupedAccountGroups()).map(([type, groups]) => (
                    <Paper key={type} withBorder p="md">
                      <Group
                        justify="space-between"
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleGroupExpansion(type)}
                      >
                        <Group gap="md">
                          <ThemeIcon size="lg" color={getAccountGroupColor(type)} variant="light">
                            {getAccountTypeIcon(type)}
                          </ThemeIcon>
                          <div>
                            <Text fw={600} size="lg">
                              {type}s
                            </Text>
                            <Text size="sm" c="dimmed">
                              {groups.length} group{groups.length !== 1 ? 's' : ''} •{' '}
                              {getAccountTypeDescription(type)}
                            </Text>
                          </div>
                        </Group>
                        <Group gap="xs">
                          <Badge color={getAccountGroupColor(type)} variant="light">
                            {groups.length}
                          </Badge>
                          <ActionIcon variant="light" size="sm">
                            {expandedGroups.has(type) ? (
                              <IconChevronUp size={16} />
                            ) : (
                              <IconChevronDown size={16} />
                            )}
                          </ActionIcon>
                        </Group>
                      </Group>

                      <Collapse in={expandedGroups.has(type)}>
                        <Divider my="md" />

                        {/* Selected Group Details in Main Row */}
                        {selectedAccountGroup &&
                          groups.some((g) => g.id === selectedAccountGroup.id) && (
                            <Card
                              withBorder
                              p="md"
                              mb="md"
                              style={{ borderColor: 'var(--mantine-color-blue-6)', borderWidth: 2 }}
                            >
                              <Group justify="space-between" mb="md">
                                <Group gap="md">
                                  <ThemeIcon
                                    size="lg"
                                    color={getAccountGroupColor(selectedAccountGroup.type)}
                                    variant="light"
                                  >
                                    {getAccountTypeIcon(selectedAccountGroup.type)}
                                  </ThemeIcon>
                                  <div>
                                    <Title order={4}>{selectedAccountGroup.name}</Title>
                                    <Text size="sm" c="dimmed">
                                      {selectedAccountGroup.type} •{' '}
                                      {selectedAccountGroup.ledgers.length} ledgers
                                    </Text>
                                  </div>
                                </Group>
                                <Group gap="xs">
                                  <Badge
                                    color={getAccountGroupColor(selectedAccountGroup.type)}
                                    variant="light"
                                  >
                                    {selectedAccountGroup.type}
                                  </Badge>
                                  <Button
                                    variant="light"
                                    size="sm"
                                    onClick={() => setSelectedAccountGroup(null)}
                                  >
                                    Close Details
                                  </Button>
                                </Group>
                              </Group>

                              {/* Group Information Grid */}
                              <Grid mb="md">
                                <Grid.Col span={{ base: 12, md: 6 }}>
                                  <Card withBorder p="md">
                                    <Text size="sm" fw={500} mb="xs">
                                      Group Information
                                    </Text>
                                    <Stack gap="xs">
                                      <Group justify="space-between">
                                        <Text size="xs" c="dimmed">
                                          Type
                                        </Text>
                                        <Badge
                                          color={getAccountGroupColor(selectedAccountGroup.type)}
                                          variant="light"
                                        >
                                          {selectedAccountGroup.type}
                                        </Badge>
                                      </Group>
                                      <Group justify="space-between">
                                        <Text size="xs" c="dimmed">
                                          Status
                                        </Text>
                                        <Badge
                                          size="xs"
                                          variant="dot"
                                          color={selectedAccountGroup.isActive ? 'green' : 'red'}
                                        >
                                          {selectedAccountGroup.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                      </Group>
                                      <Group justify="space-between">
                                        <Text size="xs" c="dimmed">
                                          Ledgers
                                        </Text>
                                        <Text size="sm" fw={500}>
                                          {selectedAccountGroup.ledgers.length}
                                        </Text>
                                      </Group>
                                      {selectedAccountGroup.description && (
                                        <div>
                                          <Text size="xs" c="dimmed">
                                            Description
                                          </Text>
                                          <Text size="sm">{selectedAccountGroup.description}</Text>
                                        </div>
                                      )}
                                    </Stack>
                                  </Card>
                                </Grid.Col>

                                <Grid.Col span={{ base: 12, md: 6 }}>
                                  <Card withBorder p="md">
                                    <Text size="sm" fw={500} mb="xs">
                                      Balance Summary
                                    </Text>
                                    {selectedAccountGroup.ledgers.length > 0 ? (
                                      <Stack gap="xs">
                                        <Group justify="space-between">
                                          <Text size="xs" c="dimmed">
                                            Total Balance
                                          </Text>
                                          <Text size="sm" fw={600}>
                                            {formatCurrency(
                                              selectedAccountGroup.ledgers.reduce(
                                                (sum, ledger) => sum + ledger.currentBalance,
                                                0,
                                              ),
                                            )}
                                          </Text>
                                        </Group>
                                        <Group justify="space-between">
                                          <Text size="xs" c="dimmed">
                                            Active Ledgers
                                          </Text>
                                          <Text size="sm">
                                            {
                                              selectedAccountGroup.ledgers.filter((l) => l.isActive)
                                                .length
                                            }
                                          </Text>
                                        </Group>
                                        <Group justify="space-between">
                                          <Text size="xs" c="dimmed">
                                            Inactive Ledgers
                                          </Text>
                                          <Text size="sm">
                                            {
                                              selectedAccountGroup.ledgers.filter(
                                                (l) => !l.isActive,
                                              ).length
                                            }
                                          </Text>
                                        </Group>
                                      </Stack>
                                    ) : (
                                      <Text size="sm" c="dimmed">
                                        No ledgers in this group
                                      </Text>
                                    )}
                                  </Card>
                                </Grid.Col>
                              </Grid>
                            </Card>
                          )}

                        {/* Group Cards - No Selection */}
                        <Grid mb="md">
                          {groups.map((group) => (
                            <Grid.Col key={group.id} span={{ base: 12, sm: 6, md: 4 }}>
                              <Card
                                withBorder
                                p="md"
                                style={{
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                }}
                                onClick={() => setSelectedAccountGroup(group)}
                                shadow="sm"
                              >
                                <Group justify="space-between" mb="xs">
                                  <Text fw={600} size="sm" style={{ flex: 1 }}>
                                    {group.name}
                                  </Text>
                                </Group>

                                {group.description && (
                                  <Text size="xs" c="dimmed" mb="xs" lineClamp={2}>
                                    {group.description}
                                  </Text>
                                )}

                                <Group gap="xs" mb="xs">
                                  <Badge
                                    size="xs"
                                    variant="dot"
                                    color={group.isActive ? 'green' : 'red'}
                                  >
                                    {group.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                  <Text size="xs" c="dimmed">
                                    {group.ledgers.length} ledger
                                    {group.ledgers.length !== 1 ? 's' : ''}
                                  </Text>
                                </Group>

                                {/* Balance Summary */}
                                {group.ledgers.length > 0 && (
                                  <Group gap="xs" mt="xs">
                                    <Text size="xs" c="dimmed">
                                      Total Balance:
                                    </Text>
                                    <Text size="xs" fw={600}>
                                      {formatCurrency(
                                        group.ledgers.reduce(
                                          (sum, ledger) => sum + ledger.currentBalance,
                                          0,
                                        ),
                                      )}
                                    </Text>
                                  </Group>
                                )}
                              </Card>
                            </Grid.Col>
                          ))}
                        </Grid>

                        {/* Ledgers Table - Direct Display */}
                        <Card withBorder p="md">
                          <Group justify="space-between" mb="md">
                            <div>
                              <Text size="sm" fw={500}>
                                Associated Ledgers
                              </Text>
                              <Text size="xs" c="dimmed">
                                Individual accounts within {type} groups
                              </Text>
                            </div>
                            <Group gap="xs">
                              <Badge size="xs" variant="light">
                                {groups.reduce((sum, group) => sum + group.ledgers.length, 0)} total
                                ledgers
                              </Badge>
                              <Button
                                size="xs"
                                variant="light"
                                leftSection={<IconPlus size={12} />}
                              >
                                Add Ledger
                              </Button>
                            </Group>
                          </Group>

                          {groups.reduce((sum, group) => sum + group.ledgers.length, 0) === 0 ? (
                            <Center py="md">
                              <Stack align="center" gap="xs">
                                <IconCalculator size={32} color="gray" />
                                <Text size="sm" c="dimmed">
                                  No ledgers in {type} groups
                                </Text>
                                <Text size="xs" c="dimmed">
                                  Create ledgers to start tracking individual accounts
                                </Text>
                                <Button size="xs" variant="light">
                                  Add First Ledger
                                </Button>
                              </Stack>
                            </Center>
                          ) : (
                            <ScrollArea>
                              <Table striped highlightOnHover withTableBorder withColumnBorders>
                                <Table.Thead>
                                  <Table.Tr>
                                    <Table.Th style={{ minWidth: 120 }}>Ledger Name</Table.Th>
                                    <Table.Th style={{ minWidth: 150 }}>Group</Table.Th>
                                    <Table.Th style={{ minWidth: 100 }}>Opening</Table.Th>
                                    <Table.Th style={{ minWidth: 100 }}>Current</Table.Th>
                                    <Table.Th style={{ minWidth: 60 }}>Status</Table.Th>
                                    <Table.Th style={{ minWidth: 80 }}>Created</Table.Th>
                                    <Table.Th style={{ minWidth: 100 }}>Actions</Table.Th>
                                  </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                  {groups
                                    .flatMap((group) =>
                                      group.ledgers.map((ledger) => ({
                                        ...ledger,
                                        groupName: group.name,
                                      })),
                                    )
                                    .map((ledger) => (
                                      <Table.Tr key={ledger.id}>
                                        <Table.Td>
                                          <Stack gap="xs">
                                            <Text size="sm" fw={600}>
                                              {ledger.name}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                              ID: {ledger.id.slice(0, 8)}...
                                            </Text>
                                          </Stack>
                                        </Table.Td>
                                        <Table.Td>
                                          <Badge color={getAccountGroupColor(type)} variant="light">
                                            {ledger.groupName}
                                          </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                          <Text
                                            size="sm"
                                            fw={600}
                                            c={
                                              ledger.openingBalance < 0
                                                ? 'red'
                                                : ledger.openingBalance > 0
                                                  ? 'green'
                                                  : 'dimmed'
                                            }
                                          >
                                            {formatCurrency(ledger.openingBalance)}
                                          </Text>
                                        </Table.Td>
                                        <Table.Td>
                                          <Stack gap="xs">
                                            <Text
                                              size="sm"
                                              fw={600}
                                              c={
                                                ledger.currentBalance < 0
                                                  ? 'red'
                                                  : ledger.currentBalance > 0
                                                    ? 'green'
                                                    : 'dimmed'
                                              }
                                            >
                                              {formatCurrency(ledger.currentBalance)}
                                            </Text>
                                            {ledger.currentBalance !== ledger.openingBalance && (
                                              <Text size="xs" c="dimmed">
                                                {ledger.currentBalance > ledger.openingBalance
                                                  ? '+'
                                                  : ''}
                                                {formatCurrency(
                                                  ledger.currentBalance - ledger.openingBalance,
                                                )}
                                              </Text>
                                            )}
                                          </Stack>
                                        </Table.Td>
                                        <Table.Td>
                                          <Badge
                                            size="xs"
                                            variant="dot"
                                            color={ledger.isActive ? 'green' : 'red'}
                                            fullWidth
                                          >
                                            {ledger.isActive ? 'Active' : 'Inactive'}
                                          </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                          <Text size="xs" c="dimmed">
                                            {formatDate(ledger.createdAt)}
                                          </Text>
                                        </Table.Td>
                                        <Table.Td>
                                          <Group gap="xs" wrap="nowrap">
                                            <Tooltip label="View ledger details">
                                              <ActionIcon size="sm" variant="light" color="blue">
                                                <IconEye size={14} />
                                              </ActionIcon>
                                            </Tooltip>
                                            <Tooltip label="Edit ledger">
                                              <ActionIcon size="sm" variant="light" color="orange">
                                                <IconEdit size={14} />
                                              </ActionIcon>
                                            </Tooltip>
                                            <Tooltip label="View transactions">
                                              <ActionIcon size="sm" variant="light" color="green">
                                                <IconReceipt size={14} />
                                              </ActionIcon>
                                            </Tooltip>
                                          </Group>
                                        </Table.Td>
                                      </Table.Tr>
                                    ))}
                                </Table.Tbody>
                              </Table>
                            </ScrollArea>
                          )}

                          {/* Summary Footer */}
                          <Divider my="md" />
                          <Group justify="space-between">
                            <Group gap="lg">
                              <div>
                                <Text size="xs" c="dimmed">
                                  Total Opening
                                </Text>
                                <Text size="sm" fw={600}>
                                  {formatCurrency(
                                    groups
                                      .flatMap((g) => g.ledgers)
                                      .reduce((sum, ledger) => sum + ledger.openingBalance, 0),
                                  )}
                                </Text>
                              </div>
                              <div>
                                <Text size="xs" c="dimmed">
                                  Total Current
                                </Text>
                                <Text size="sm" fw={600}>
                                  {formatCurrency(
                                    groups
                                      .flatMap((g) => g.ledgers)
                                      .reduce((sum, ledger) => sum + ledger.currentBalance, 0),
                                  )}
                                </Text>
                              </div>
                              <div>
                                <Text size="xs" c="dimmed">
                                  Active
                                </Text>
                                <Text size="sm" fw={600}>
                                  {
                                    groups.flatMap((g) => g.ledgers).filter((l) => l.isActive)
                                      .length
                                  }
                                </Text>
                              </div>
                            </Group>
                            <Button size="xs" variant="light" leftSection={<IconPlus size={12} />}>
                              Add New Ledger
                            </Button>
                          </Group>
                        </Card>
                      </Collapse>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>
          </Tabs.Panel>

          {/* Ledgers Tab */}
          <Tabs.Panel value="ledgers" pt="md">
            <Paper withBorder p="md">
              <Group justify="space-between" mb="md">
                <Title order={3}>Ledgers</Title>
                <Text size="sm" c="dimmed">
                  Individual accounts with opening balances and current balances
                </Text>
              </Group>

              {ledgers.length === 0 ? (
                <Center py="xl">
                  <Stack align="center" gap="md">
                    <IconCalculator size={48} color="gray" />
                    <Text c="dimmed">No ledgers found</Text>
                    <Button onClick={() => setShowCreateForm(true)}>Create First Ledger</Button>
                  </Stack>
                </Center>
              ) : (
                <ScrollArea>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Group</Table.Th>
                        <Table.Th>Opening Balance</Table.Th>
                        <Table.Th>Current Balance</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {ledgers.map((ledger) => (
                        <Table.Tr key={ledger.id}>
                          <Table.Td>
                            <Text fw={500} size="sm">
                              {ledger.name}
                            </Text>
                            {ledger.description && (
                              <Text size="xs" c="dimmed">
                                {ledger.description}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Badge color={getAccountGroupColor(ledger.group.type)} variant="light">
                              {ledger.group.name}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600}>
                              {formatCurrency(ledger.openingBalance)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text
                              size="sm"
                              fw={600}
                              c={ledger.currentBalance >= 0 ? 'green' : 'red'}
                            >
                              {formatCurrency(ledger.currentBalance)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              size="xs"
                              variant="dot"
                              color={ledger.isActive ? 'green' : 'red'}
                            >
                              {ledger.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <Tooltip label="View details">
                                <ActionIcon variant="light" size="sm">
                                  <IconEye size={14} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Edit">
                                <ActionIcon variant="light" size="sm">
                                  <IconEdit size={14} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              )}
            </Paper>
          </Tabs.Panel>

          {/* Transactions Tab */}
          <Tabs.Panel value="transactions" pt="md">
            <Paper withBorder p="md">
              <Group justify="space-between" mb="md">
                <Title order={3}>Transactions</Title>
                <Text size="sm" c="dimmed">
                  Double-entry bookkeeping transactions with debit and credit entries
                </Text>
              </Group>

              {transactions.length === 0 ? (
                <Center py="xl">
                  <Stack align="center" gap="md">
                    <IconReceipt size={48} color="gray" />
                    <Text c="dimmed">No transactions found</Text>
                    <Button onClick={() => setShowCreateForm(true)}>
                      Create First Transaction
                    </Button>
                  </Stack>
                </Center>
              ) : (
                <ScrollArea>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Date</Table.Th>
                        <Table.Th>Type</Table.Th>
                        <Table.Th>Description</Table.Th>
                        <Table.Th>Debit</Table.Th>
                        <Table.Th>Credit</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {transactions.map((transaction) => (
                        <Table.Tr key={transaction.id}>
                          <Table.Td>
                            <Text size="sm">{formatDate(transaction.date)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              color={getTransactionTypeColor(transaction.type)}
                              variant="light"
                            >
                              {transaction.type}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={500}>
                              {transaction.description}
                            </Text>
                            {transaction.notes && (
                              <Text size="xs" c="dimmed">
                                {transaction.notes}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600} c="red">
                              {formatCurrency(transaction.totalDebit)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600} c="green">
                              {formatCurrency(transaction.totalCredit)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <Badge
                                size="xs"
                                variant="dot"
                                color={getStatusColor(transaction.status)}
                              >
                                {transaction.status}
                              </Badge>
                              {transaction.isBalanced ? (
                                <IconCheck size={12} color="green" />
                              ) : (
                                <IconX size={12} color="red" />
                              )}
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <Tooltip label="View details">
                                <ActionIcon variant="light" size="sm">
                                  <IconEye size={14} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Edit">
                                <ActionIcon variant="light" size="sm">
                                  <IconEdit size={14} />
                                </ActionIcon>
                              </Tooltip>
                              {(transaction.status?.toLowerCase() === 'draft' ||
                                transaction.status?.toLowerCase() === 'pending') && (
                                <>
                                  <Tooltip label="Approve transaction">
                                    <ActionIcon
                                      variant="light"
                                      size="sm"
                                      color="green"
                                      onClick={() => handleApproveTransaction(transaction.id)}
                                      loading={loading}
                                    >
                                      <IconCheck size={14} />
                                    </ActionIcon>
                                  </Tooltip>
                                  <Tooltip label="Reject transaction">
                                    <ActionIcon
                                      variant="light"
                                      size="sm"
                                      color="red"
                                      onClick={() => handleRejectTransaction(transaction.id)}
                                      loading={loading}
                                    >
                                      <IconX size={14} />
                                    </ActionIcon>
                                  </Tooltip>
                                </>
                              )}
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              )}
            </Paper>
          </Tabs.Panel>

          {/* Inventory Tab */}
          <Tabs.Panel value="inventory" pt="md">
            <RealTimeInventory />
          </Tabs.Panel>
        </Tabs>

        {/* Create Forms Modal */}
        <Modal
          opened={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          title={
            <Title order={3}>
              Create New{' '}
              {activeTab === 'groups'
                ? 'Account Group'
                : activeTab === 'ledgers'
                  ? 'Ledger'
                  : activeTab === 'transactions'
                    ? 'Transaction'
                    : 'Inventory'}
            </Title>
          }
          size="lg"
          centered
        >
          {activeTab === 'groups' && (
            <form onSubmit={handleCreateAccountGroup}>
              <Stack gap="md">
                <TextInput
                  label="Name"
                  placeholder="e.g., Assets, Liabilities"
                  value={newAccountGroup.name}
                  onChange={(e) => setNewAccountGroup({ ...newAccountGroup, name: e.target.value })}
                  required
                />
                <Select
                  label="Type"
                  placeholder="Select account type"
                  data={[
                    { value: 'Asset', label: 'Asset' },
                    { value: 'Liability', label: 'Liability' },
                    { value: 'Income', label: 'Income' },
                    { value: 'Expense', label: 'Expense' },
                  ]}
                  value={newAccountGroup.type}
                  onChange={(value) =>
                    setNewAccountGroup({ ...newAccountGroup, type: value || '' })
                  }
                  required
                />
                <Textarea
                  label="Description"
                  placeholder="Optional description"
                  value={newAccountGroup.description}
                  onChange={(e) =>
                    setNewAccountGroup({ ...newAccountGroup, description: e.target.value })
                  }
                />
                <Group justify="flex-end">
                  <Button variant="light" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={loading}>
                    Create Account Group
                  </Button>
                </Group>
              </Stack>
            </form>
          )}

          {activeTab === 'ledgers' && (
            <form onSubmit={handleCreateLedger}>
              <Stack gap="md">
                <TextInput
                  label="Name"
                  placeholder="e.g., Cash Account, Bank Account"
                  value={newLedger.name}
                  onChange={(e) => setNewLedger({ ...newLedger, name: e.target.value })}
                  required
                />
                <Select
                  label="Account Group"
                  placeholder="Select account group"
                  data={accountGroups.map((group) => ({ value: group.id, label: group.name }))}
                  value={newLedger.groupId}
                  onChange={(value) => setNewLedger({ ...newLedger, groupId: value || '' })}
                  required
                />
                <NumberInput
                  label="Opening Balance"
                  placeholder="0.00"
                  value={newLedger.openingBalance}
                  onChange={(value) =>
                    setNewLedger({ ...newLedger, openingBalance: Number(value) || 0 })
                  }
                  decimalScale={2}
                  min={0}
                  required
                />
                <Textarea
                  label="Description"
                  placeholder="Optional description"
                  value={newLedger.description}
                  onChange={(e) => setNewLedger({ ...newLedger, description: e.target.value })}
                />
                <Group justify="flex-end">
                  <Button variant="light" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={loading}>
                    Create Ledger
                  </Button>
                </Group>
              </Stack>
            </form>
          )}

          {activeTab === 'transactions' && (
            <form onSubmit={handleCreateTransaction}>
              <Stack gap="md">
                <Grid>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Date"
                      type="datetime-local"
                      value={newTransaction.date.slice(0, 16)}
                      onChange={(e) => {
                        const dateValue = e.target.value;
                        const isoString = new Date(dateValue).toISOString();
                        setNewTransaction({ ...newTransaction, date: isoString });
                      }}
                      required
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                      label="Type"
                      placeholder="Select transaction type"
                      data={[
                        { value: 'Payment', label: 'Payment' },
                        { value: 'Receipt', label: 'Receipt' },
                        { value: 'Journal', label: 'Journal Entry' },
                      ]}
                      value={newTransaction.type}
                      onChange={(value) =>
                        setNewTransaction({ ...newTransaction, type: value || 'Payment' })
                      }
                      required
                    />
                  </Grid.Col>
                </Grid>

                <TextInput
                  label="Description"
                  placeholder="Transaction description"
                  value={newTransaction.description}
                  onChange={(e) =>
                    setNewTransaction({ ...newTransaction, description: e.target.value })
                  }
                  required
                />

                <Textarea
                  label="Notes"
                  placeholder="Optional notes"
                  value={newTransaction.notes}
                  onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })}
                />

                <Divider label="Transaction Entries" labelPosition="center" />

                <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
                  <Text size="sm">
                    <strong>Double-entry bookkeeping:</strong> Each transaction must have at least
                    one debit and one credit entry with equal amounts.
                  </Text>
                </Alert>

                {newTransaction.entries.map((entry, index) => (
                  <Paper key={index} withBorder p="md">
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={500}>
                        Entry {index + 1}
                      </Text>
                      {newTransaction.entries.length > 2 && (
                        <ActionIcon
                          variant="light"
                          color="red"
                          size="sm"
                          onClick={() => removeTransactionEntry(index)}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      )}
                    </Group>

                    <Grid>
                      <Grid.Col span={{ base: 12, sm: 6 }}>
                        <Select
                          label="Ledger"
                          placeholder="Select ledger"
                          data={ledgers.map((ledger) => ({
                            value: ledger.id,
                            label: ledger.name,
                          }))}
                          value={entry.ledgerId}
                          onChange={(value) =>
                            updateTransactionEntry(index, 'ledgerId', value || '')
                          }
                          required
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, sm: 3 }}>
                        <Select
                          label="Type"
                          data={[
                            { value: 'true', label: 'Debit' },
                            { value: 'false', label: 'Credit' },
                          ]}
                          value={entry.isDebit.toString()}
                          onChange={(value) =>
                            updateTransactionEntry(index, 'isDebit', value === 'true')
                          }
                          required
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, sm: 3 }}>
                        <NumberInput
                          label="Amount"
                          placeholder="0.00"
                          value={entry.amount === 0 ? undefined : entry.amount}
                          onChange={(value) =>
                            updateTransactionEntry(index, 'amount', Number(value) || 0)
                          }
                          decimalScale={2}
                          min={0}
                          required
                        />
                      </Grid.Col>
                    </Grid>

                    <TextInput
                      label="Description"
                      placeholder="Entry description"
                      value={entry.description}
                      onChange={(e) => updateTransactionEntry(index, 'description', e.target.value)}
                      mt="xs"
                    />
                  </Paper>
                ))}

                <Button
                  variant="light"
                  leftSection={<IconPlus size={16} />}
                  onClick={addTransactionEntry}
                >
                  Add Entry
                </Button>

                {/* Balance Summary */}
                {(() => {
                  const totalDebit = newTransaction.entries
                    .filter((entry) => entry.isDebit)
                    .reduce((sum, entry) => sum + entry.amount, 0);
                  const totalCredit = newTransaction.entries
                    .filter((entry) => !entry.isDebit)
                    .reduce((sum, entry) => sum + entry.amount, 0);
                  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

                  return (
                    <Paper withBorder p="md" bg={isBalanced ? 'green.0' : 'red.0'}>
                      <Group justify="space-between">
                        <Text size="sm" fw={500}>
                          Transaction Balance
                        </Text>
                        <Badge color={isBalanced ? 'green' : 'red'} variant="light">
                          {isBalanced ? 'Balanced' : 'Unbalanced'}
                        </Badge>
                      </Group>
                      <Group gap="lg" mt="xs">
                        <Text size="sm">
                          <strong>Total Debits:</strong> ₹{totalDebit.toFixed(2)}
                        </Text>
                        <Text size="sm">
                          <strong>Total Credits:</strong> ₹{totalCredit.toFixed(2)}
                        </Text>
                        <Text size="sm" c={isBalanced ? 'green' : 'red'}>
                          <strong>Difference:</strong> ₹
                          {Math.abs(totalDebit - totalCredit).toFixed(2)}
                        </Text>
                      </Group>
                    </Paper>
                  );
                })()}

                <Group justify="flex-end">
                  <Button variant="light" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={loading}>
                    Create Transaction
                  </Button>
                </Group>
              </Stack>
            </form>
          )}
        </Modal>
      </Stack>
    </Container>
  );
};

export default AccountingSystem;
