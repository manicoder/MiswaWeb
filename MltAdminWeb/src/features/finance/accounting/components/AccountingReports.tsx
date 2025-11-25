import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Group,
  Button,
  Select,
  Badge,
  ActionIcon,
  Alert,
  Table,
  ScrollArea,
  Tooltip,
  Grid,
  Tabs,
  Divider,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  IconRefresh,
  IconAlertCircle,
  IconReceipt,
  IconCalculator,
  IconCheck,
  IconX,
  IconDownload,
  IconCalendar,
  IconScale,
  IconTrendingUp,
  IconBuilding,
  IconCreditCard,
} from '@tabler/icons-react';
import { apiClient } from '../../../../services/api';

interface DayBookEntry {
  id: string;
  date: string;
  type: string;
  description: string;
  ledgerName: string;
  groupName: string;
  isDebit: boolean;
  amount: number;
  runningBalance: number;
}

interface LedgerReportEntry {
  id: string;
  date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
}

interface TrialBalanceEntry {
  ledgerId: string;
  ledgerName: string;
  groupName: string;
  groupType: string;
  openingBalance: number;
  debitTotal: number;
  creditTotal: number;
  closingBalance: number;
}

interface ProfitLossEntry {
  category: string;
  amount: number;
  percentage: number;
  type: 'income' | 'expense';
}

interface BalanceSheetEntry {
  category: string;
  amount: number;
  percentage: number;
  type: 'asset' | 'liability' | 'equity';
}

interface DayBookReport {
  startDate: string;
  endDate: string;
  entries: DayBookEntry[];
  totalDebit: number;
  totalCredit: number;
  openingBalance: number;
  closingBalance: number;
}

interface LedgerReport {
  ledgerId: string;
  ledgerName: string;
  groupName: string;
  openingBalance: number;
  entries: LedgerReportEntry[];
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
}

interface TrialBalanceReport {
  asOfDate: string;
  entries: TrialBalanceEntry[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

interface ProfitLossReport {
  startDate: string;
  endDate: string;
  income: ProfitLossEntry[];
  expenses: ProfitLossEntry[];
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  grossMargin: number;
}

interface BalanceSheetReport {
  asOfDate: string;
  assets: BalanceSheetEntry[];
  liabilities: BalanceSheetEntry[];
  equity: BalanceSheetEntry[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  isBalanced: boolean;
}

interface Ledger {
  id: string;
  name: string;
  groupId: string;
  group: {
    id: string;
    name: string;
    type: string;
  };
  openingBalance: number;
  currentBalance: number;
  description?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ExpenseReportEntry {
  id: string;
  date: string;
  description: string;
  type: string;
  category: string;
  amount: number;
  paymentMode: string;
  paidTo: string;
  status: string;
  chartOfAccountName?: string;
  notes?: string;
}

interface ExpenseReport {
  startDate: string;
  endDate: string;
  entries: ExpenseReportEntry[];
  totalAmount: number;
  totalExpenses: number;
  averageExpense: number;
  breakdownByType: {
    type: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  breakdownByStatus: {
    status: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
}

const AccountingReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'daybook' | 'ledger' | 'trialbalance' | 'pnl' | 'balancesheet' | 'expenses'
  >('daybook');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Day Book filters
  const [dayBookFilters, setDayBookFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    type: '',
    ledgerId: '',
  });

  // Ledger Report filters
  const [ledgerReportFilters, setLedgerReportFilters] = useState({
    ledgerId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  // Trial Balance filters
  const [trialBalanceFilters, setTrialBalanceFilters] = useState({
    asOfDate: new Date().toISOString().split('T')[0],
  });

  // P&L filters
  const [pnlFilters, setPnlFilters] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
    endDate: new Date().toISOString().split('T')[0],
  });

  // Balance Sheet filters
  const [balanceSheetFilters, setBalanceSheetFilters] = useState({
    asOfDate: new Date().toISOString().split('T')[0],
  });

  // Expenses filters
  const [expensesFilters, setExpensesFilters] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
    endDate: new Date().toISOString().split('T')[0],
    type: '',
    status: '',
    paymentMode: '',
  });

  // Data states
  const [dayBookData, setDayBookData] = useState<DayBookReport | null>(null);
  const [ledgerReportData, setLedgerReportData] = useState<LedgerReport | null>(null);
  const [trialBalanceData, setTrialBalanceData] = useState<TrialBalanceReport | null>(null);
  const [pnlData, setPnlData] = useState<ProfitLossReport | null>(null);
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetReport | null>(null);
  // Expenses data state
  const [expensesData, setExpensesData] = useState<ExpenseReport | null>(null);

  // Supporting data
  const [ledgers, setLedgers] = useState<Ledger[]>([]);

  useEffect(() => {
    fetchSupportingData();
  }, []);

  const fetchSupportingData = async () => {
    try {
      const ledgersResponse = await apiClient.get('/finance/ledgers');

      if (ledgersResponse.data.success) {
        setLedgers(ledgersResponse.data.data.ledgers || []);
      }
    } catch (error) {
      console.error('Error fetching supporting data:', error);
    }
  };

  const fetchDayBookReport = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        startDate: dayBookFilters.startDate,
        endDate: dayBookFilters.endDate,
        ...(dayBookFilters.type && { type: dayBookFilters.type }),
        ...(dayBookFilters.ledgerId && { ledgerId: dayBookFilters.ledgerId }),
      });

      const response = await apiClient.get(`/finance/reports/daybook?${params}`);
      if (response.data.success) {
        setDayBookData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching day book report:', error);
      setError('Failed to load day book report');
    } finally {
      setLoading(false);
    }
  };

  const fetchLedgerReport = async () => {
    if (!ledgerReportFilters.ledgerId) {
      setError('Please select a ledger');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        ledgerId: ledgerReportFilters.ledgerId,
        startDate: ledgerReportFilters.startDate,
        endDate: ledgerReportFilters.endDate,
      });

      const response = await apiClient.get(`/finance/reports/ledger?${params}`);
      if (response.data.success) {
        setLedgerReportData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching ledger report:', error);
      setError('Failed to load ledger report');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrialBalanceReport = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await apiClient.get(
        `/finance/trial-balance?asOfDate=${trialBalanceFilters.asOfDate}`,
      );
      if (response.data.success) {
        setTrialBalanceData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching trial balance report:', error);
      setError('Failed to load trial balance report');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfitLossReport = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        startDate: pnlFilters.startDate,
        endDate: pnlFilters.endDate,
      });

      const response = await apiClient.get(`/finance/reports/profit-loss?${params}`);
      if (response.data.success) {
        setPnlData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching profit & loss report:', error);
      setError('Failed to load profit & loss report');
    } finally {
      setLoading(false);
    }
  };

  const fetchBalanceSheetReport = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await apiClient.get(
        `/finance/reports/balance-sheet?asOfDate=${balanceSheetFilters.asOfDate}`,
      );
      if (response.data.success) {
        setBalanceSheetData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching balance sheet report:', error);
      setError('Failed to load balance sheet report');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpensesReport = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        startDate: expensesFilters.startDate,
        endDate: expensesFilters.endDate,
        ...(expensesFilters.type && { type: expensesFilters.type }),
        ...(expensesFilters.status && { status: expensesFilters.status }),
        ...(expensesFilters.paymentMode && { paymentMode: expensesFilters.paymentMode }),
      });

      const response = await apiClient.get(`/finance/reports/expenses?${params}`);
      if (response.data.success) {
        setExpensesData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching expenses report:', error);
      setError('Failed to load expenses report');
    } finally {
      setLoading(false);
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

  const handleGenerateReport = () => {
    switch (activeTab) {
      case 'daybook':
        fetchDayBookReport();
        break;
      case 'ledger':
        fetchLedgerReport();
        break;
      case 'trialbalance':
        fetchTrialBalanceReport();
        break;
      case 'pnl':
        fetchProfitLossReport();
        break;
      case 'balancesheet':
        fetchBalanceSheetReport();
        break;
      case 'expenses':
        fetchExpensesReport();
        break;
    }
  };

  const handleExportReport = () => {
    // TODO: Implement export functionality
  };

  return (
    <Container size="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <div>
            <Title order={1}>Accounting Reports</Title>
            <Text c="dimmed" size="sm">
              Generate comprehensive financial reports and statements
            </Text>
          </div>
          <Group>
            <Tooltip label="Refresh data">
              <ActionIcon variant="light" onClick={handleGenerateReport} loading={loading}>
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
            <Button
              leftSection={<IconDownload size={16} />}
              variant="light"
              onClick={handleExportReport}
            >
              Export Report
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
            setActiveTab(
              value as 'daybook' | 'ledger' | 'trialbalance' | 'pnl' | 'balancesheet' | 'expenses',
            )
          }
        >
          <Tabs.List>
            <Tabs.Tab value="daybook" leftSection={<IconReceipt size={16} />}>
              Day Book
            </Tabs.Tab>
            <Tabs.Tab value="ledger" leftSection={<IconCalculator size={16} />}>
              Ledger Report
            </Tabs.Tab>
            <Tabs.Tab value="trialbalance" leftSection={<IconScale size={16} />}>
              Trial Balance
            </Tabs.Tab>
            <Tabs.Tab value="pnl" leftSection={<IconTrendingUp size={16} />}>
              Profit & Loss
            </Tabs.Tab>
            <Tabs.Tab value="balancesheet" leftSection={<IconBuilding size={16} />}>
              Balance Sheet
            </Tabs.Tab>
            <Tabs.Tab value="expenses" leftSection={<IconCreditCard size={16} />}>
              Expenses
            </Tabs.Tab>
          </Tabs.List>

          {/* Day Book Tab */}
          <Tabs.Panel value="daybook" pt="md">
            <Paper withBorder p="md">
              <Group justify="space-between" mb="md">
                <Title order={3}>Day Book</Title>
                <Text size="sm" c="dimmed">
                  Shows all transactions for a given day or date range
                </Text>
              </Group>

              {/* Filters */}
              <Grid mb="lg">
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <DateInput
                    label="Start Date"
                    value={dayBookFilters.startDate ? new Date(dayBookFilters.startDate) : null}
                    onChange={(value: string | null) =>
                      setDayBookFilters({
                        ...dayBookFilters,
                        startDate: value || '',
                      })
                    }
                    leftSection={<IconCalendar size={16} />}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <DateInput
                    label="End Date"
                    value={dayBookFilters.endDate ? new Date(dayBookFilters.endDate) : null}
                    onChange={(value: string | null) =>
                      setDayBookFilters({
                        ...dayBookFilters,
                        endDate: value || '',
                      })
                    }
                    leftSection={<IconCalendar size={16} />}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <Select
                    label="Transaction Type"
                    placeholder="All types"
                    data={[
                      { value: 'Payment', label: 'Payment' },
                      { value: 'Receipt', label: 'Receipt' },
                      { value: 'Journal', label: 'Journal Entry' },
                    ]}
                    value={dayBookFilters.type}
                    onChange={(value) =>
                      setDayBookFilters({ ...dayBookFilters, type: value || '' })
                    }
                    clearable
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <Select
                    label="Ledger"
                    placeholder="All ledgers"
                    data={ledgers.map((ledger) => ({
                      value: ledger.id,
                      label: ledger.name,
                    }))}
                    value={dayBookFilters.ledgerId}
                    onChange={(value) =>
                      setDayBookFilters({ ...dayBookFilters, ledgerId: value || '' })
                    }
                    clearable
                  />
                </Grid.Col>
              </Grid>

              <Button onClick={handleGenerateReport} loading={loading} mb="md">
                Generate Day Book Report
              </Button>

              {/* Day Book Report */}
              {dayBookData && (
                <Paper withBorder p="md">
                  <Group justify="space-between" mb="md">
                    <div>
                      <Text fw={600} size="lg">
                        Day Book Report
                      </Text>
                      <Text size="sm" c="dimmed">
                        {formatDate(dayBookData.startDate)} - {formatDate(dayBookData.endDate)}
                      </Text>
                    </div>
                    <Group>
                      <Badge color="blue" variant="light">
                        Opening: {formatCurrency(dayBookData.openingBalance)}
                      </Badge>
                      <Badge color="green" variant="light">
                        Closing: {formatCurrency(dayBookData.closingBalance)}
                      </Badge>
                    </Group>
                  </Group>

                  <ScrollArea>
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Date</Table.Th>
                          <Table.Th>Type</Table.Th>
                          <Table.Th>Description</Table.Th>
                          <Table.Th>Ledger</Table.Th>
                          <Table.Th>Debit</Table.Th>
                          <Table.Th>Credit</Table.Th>
                          <Table.Th>Balance</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {dayBookData.entries.map((entry) => (
                          <Table.Tr key={entry.id}>
                            <Table.Td>
                              <Text size="sm">{formatDate(entry.date)}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge
                                color={getTransactionTypeColor(entry.type)}
                                variant="light"
                                size="sm"
                              >
                                {entry.type}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" fw={500}>
                                {entry.description}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{entry.ledgerName}</Text>
                              <Text size="xs" c="dimmed">
                                {entry.groupName}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              {entry.isDebit ? (
                                <Text size="sm" fw={600} c="red">
                                  {formatCurrency(entry.amount)}
                                </Text>
                              ) : (
                                <Text size="sm">-</Text>
                              )}
                            </Table.Td>
                            <Table.Td>
                              {!entry.isDebit ? (
                                <Text size="sm" fw={600} c="green">
                                  {formatCurrency(entry.amount)}
                                </Text>
                              ) : (
                                <Text size="sm">-</Text>
                              )}
                            </Table.Td>
                            <Table.Td>
                              <Text
                                size="sm"
                                fw={600}
                                c={entry.runningBalance >= 0 ? 'green' : 'red'}
                              >
                                {formatCurrency(entry.runningBalance)}
                              </Text>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>

                  <Divider my="md" />

                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Total Entries: {dayBookData.entries.length}
                    </Text>
                    <Group>
                      <Text size="sm">
                        <strong>Total Debit:</strong> {formatCurrency(dayBookData.totalDebit)}
                      </Text>
                      <Text size="sm">
                        <strong>Total Credit:</strong> {formatCurrency(dayBookData.totalCredit)}
                      </Text>
                    </Group>
                  </Group>
                </Paper>
              )}
            </Paper>
          </Tabs.Panel>

          {/* Ledger Report Tab */}
          <Tabs.Panel value="ledger" pt="md">
            <Paper withBorder p="md">
              <Group justify="space-between" mb="md">
                <Title order={3}>Ledger Report</Title>
                <Text size="sm" c="dimmed">
                  Shows all debit and credit entries for a single ledger
                </Text>
              </Group>

              {/* Filters */}
              <Grid mb="lg">
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <Select
                    label="Ledger"
                    placeholder="Select ledger"
                    data={ledgers.map((ledger) => ({
                      value: ledger.id,
                      label: ledger.name,
                    }))}
                    value={ledgerReportFilters.ledgerId}
                    onChange={(value) =>
                      setLedgerReportFilters({ ...ledgerReportFilters, ledgerId: value || '' })
                    }
                    required
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <DateInput
                    label="Start Date"
                    value={
                      ledgerReportFilters.startDate ? new Date(ledgerReportFilters.startDate) : null
                    }
                    onChange={(value: string | null) =>
                      setLedgerReportFilters({
                        ...ledgerReportFilters,
                        startDate: value || '',
                      })
                    }
                    leftSection={<IconCalendar size={16} />}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <DateInput
                    label="End Date"
                    value={
                      ledgerReportFilters.endDate ? new Date(ledgerReportFilters.endDate) : null
                    }
                    onChange={(value: string | null) =>
                      setLedgerReportFilters({
                        ...ledgerReportFilters,
                        endDate: value || '',
                      })
                    }
                    leftSection={<IconCalendar size={16} />}
                  />
                </Grid.Col>
              </Grid>

              <Button onClick={handleGenerateReport} loading={loading} mb="md">
                Generate Ledger Report
              </Button>

              {/* Ledger Report */}
              {ledgerReportData && (
                <Paper withBorder p="md">
                  <Group justify="space-between" mb="md">
                    <div>
                      <Text fw={600} size="lg">
                        Ledger Report: {ledgerReportData.ledgerName}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {ledgerReportData.groupName}
                      </Text>
                    </div>
                    <Group>
                      <Badge color="blue" variant="light">
                        Opening: {formatCurrency(ledgerReportData.openingBalance)}
                      </Badge>
                      <Badge color="green" variant="light">
                        Closing: {formatCurrency(ledgerReportData.closingBalance)}
                      </Badge>
                    </Group>
                  </Group>

                  <ScrollArea>
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Date</Table.Th>
                          <Table.Th>Description</Table.Th>
                          <Table.Th>Reference</Table.Th>
                          <Table.Th>Debit</Table.Th>
                          <Table.Th>Credit</Table.Th>
                          <Table.Th>Balance</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {ledgerReportData.entries.map((entry) => (
                          <Table.Tr key={entry.id}>
                            <Table.Td>
                              <Text size="sm">{formatDate(entry.date)}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" fw={500}>
                                {entry.description}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{entry.reference}</Text>
                            </Table.Td>
                            <Table.Td>
                              {entry.debit > 0 ? (
                                <Text size="sm" fw={600} c="red">
                                  {formatCurrency(entry.debit)}
                                </Text>
                              ) : (
                                <Text size="sm">-</Text>
                              )}
                            </Table.Td>
                            <Table.Td>
                              {entry.credit > 0 ? (
                                <Text size="sm" fw={600} c="green">
                                  {formatCurrency(entry.credit)}
                                </Text>
                              ) : (
                                <Text size="sm">-</Text>
                              )}
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" fw={600} c={entry.balance >= 0 ? 'green' : 'red'}>
                                {formatCurrency(entry.balance)}
                              </Text>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>

                  <Divider my="md" />

                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Total Entries: {ledgerReportData.entries.length}
                    </Text>
                    <Group>
                      <Text size="sm">
                        <strong>Total Debit:</strong> {formatCurrency(ledgerReportData.totalDebit)}
                      </Text>
                      <Text size="sm">
                        <strong>Total Credit:</strong>{' '}
                        {formatCurrency(ledgerReportData.totalCredit)}
                      </Text>
                    </Group>
                  </Group>
                </Paper>
              )}
            </Paper>
          </Tabs.Panel>

          {/* Trial Balance Tab */}
          <Tabs.Panel value="trialbalance" pt="md">
            <Paper withBorder p="md">
              <Group justify="space-between" mb="md">
                <Title order={3}>Trial Balance</Title>
                <Text size="sm" c="dimmed">
                  Shows closing balance of every ledger as of a specific date
                </Text>
              </Group>

              {/* Filters */}
              <Grid mb="lg">
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <DateInput
                    label="As of Date"
                    value={
                      trialBalanceFilters.asOfDate ? new Date(trialBalanceFilters.asOfDate) : null
                    }
                    onChange={(value: string | null) =>
                      setTrialBalanceFilters({
                        ...trialBalanceFilters,
                        asOfDate: value || '',
                      })
                    }
                    leftSection={<IconCalendar size={16} />}
                  />
                </Grid.Col>
              </Grid>

              <Button onClick={handleGenerateReport} loading={loading} mb="md">
                Generate Trial Balance
              </Button>

              {/* Trial Balance Report */}
              {trialBalanceData && (
                <Paper withBorder p="md">
                  <Group justify="space-between" mb="md">
                    <div>
                      <Text fw={600} size="lg">
                        Trial Balance
                      </Text>
                      <Text size="sm" c="dimmed">
                        As of {formatDate(trialBalanceData.asOfDate)}
                      </Text>
                    </div>
                    <Group>
                      <Badge
                        color={trialBalanceData.isBalanced ? 'green' : 'red'}
                        variant="light"
                        leftSection={
                          trialBalanceData.isBalanced ? (
                            <IconCheck size={12} />
                          ) : (
                            <IconX size={12} />
                          )
                        }
                      >
                        {trialBalanceData.isBalanced ? 'Balanced' : 'Unbalanced'}
                      </Badge>
                    </Group>
                  </Group>

                  <ScrollArea>
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Ledger</Table.Th>
                          <Table.Th>Group</Table.Th>
                          <Table.Th>Opening Balance</Table.Th>
                          <Table.Th>Debit Total</Table.Th>
                          <Table.Th>Credit Total</Table.Th>
                          <Table.Th>Closing Balance</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {trialBalanceData.entries.map((entry) => (
                          <Table.Tr key={entry.ledgerId}>
                            <Table.Td>
                              <Text size="sm" fw={500}>
                                {entry.ledgerName}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge
                                color={getAccountGroupColor(entry.groupType)}
                                variant="light"
                                size="sm"
                              >
                                {entry.groupName}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{formatCurrency(entry.openingBalance)}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" fw={600} c="red">
                                {formatCurrency(entry.debitTotal)}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" fw={600} c="green">
                                {formatCurrency(entry.creditTotal)}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text
                                size="sm"
                                fw={600}
                                c={entry.closingBalance >= 0 ? 'green' : 'red'}
                              >
                                {formatCurrency(entry.closingBalance)}
                              </Text>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>

                  <Divider my="md" />

                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Total Ledgers: {trialBalanceData.entries.length}
                    </Text>
                    <Group>
                      <Text size="sm">
                        <strong>Total Debit:</strong> {formatCurrency(trialBalanceData.totalDebit)}
                      </Text>
                      <Text size="sm">
                        <strong>Total Credit:</strong>{' '}
                        {formatCurrency(trialBalanceData.totalCredit)}
                      </Text>
                    </Group>
                  </Group>
                </Paper>
              )}
            </Paper>
          </Tabs.Panel>

          {/* Profit & Loss Tab */}
          <Tabs.Panel value="pnl" pt="md">
            <Paper withBorder p="md">
              <Group justify="space-between" mb="md">
                <Title order={3}>Profit & Loss Statement</Title>
                <Text size="sm" c="dimmed">
                  Shows net profit or loss for a date range
                </Text>
              </Group>

              {/* Filters */}
              <Grid mb="lg">
                <Grid.Col span={{ base: 12, sm: 6, md: 6 }}>
                  <DateInput
                    label="Start Date"
                    value={pnlFilters.startDate ? new Date(pnlFilters.startDate) : null}
                    onChange={(value: string | null) =>
                      setPnlFilters({
                        ...pnlFilters,
                        startDate: value || '',
                      })
                    }
                    leftSection={<IconCalendar size={16} />}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 6 }}>
                  <DateInput
                    label="End Date"
                    value={pnlFilters.endDate ? new Date(pnlFilters.endDate) : null}
                    onChange={(value: string | null) =>
                      setPnlFilters({
                        ...pnlFilters,
                        endDate: value || '',
                      })
                    }
                    leftSection={<IconCalendar size={16} />}
                  />
                </Grid.Col>
              </Grid>

              <Button onClick={handleGenerateReport} loading={loading} mb="md">
                Generate P&L Statement
              </Button>

              {/* P&L Report */}
              {pnlData && (
                <Paper withBorder p="md">
                  <Group justify="space-between" mb="md">
                    <div>
                      <Text fw={600} size="lg">
                        Profit & Loss Statement
                      </Text>
                      <Text size="sm" c="dimmed">
                        {formatDate(pnlData.startDate)} - {formatDate(pnlData.endDate)}
                      </Text>
                    </div>
                    <Badge
                      color={pnlData.netProfit >= 0 ? 'green' : 'red'}
                      variant="light"
                      size="lg"
                    >
                      Net {pnlData.netProfit >= 0 ? 'Profit' : 'Loss'}:{' '}
                      {formatCurrency(Math.abs(pnlData.netProfit))}
                    </Badge>
                  </Group>

                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper withBorder p="md" bg="green.0">
                        <Title order={4} mb="md" c="green">
                          Income
                        </Title>
                        <Stack gap="xs">
                          {pnlData.income.map((item) => (
                            <Group key={item.category} justify="space-between">
                              <Text size="sm">{item.category}</Text>
                              <Text size="sm" fw={600} c="green">
                                {formatCurrency(item.amount)}
                              </Text>
                            </Group>
                          ))}
                          <Divider />
                          <Group justify="space-between">
                            <Text fw={600}>Total Income</Text>
                            <Text fw={700} c="green">
                              {formatCurrency(pnlData.totalIncome)}
                            </Text>
                          </Group>
                        </Stack>
                      </Paper>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper withBorder p="md" bg="red.0">
                        <Title order={4} mb="md" c="red">
                          Expenses
                        </Title>
                        <Stack gap="xs">
                          {pnlData.expenses.map((item) => (
                            <Group key={item.category} justify="space-between">
                              <Text size="sm">{item.category}</Text>
                              <Text size="sm" fw={600} c="red">
                                {formatCurrency(item.amount)}
                              </Text>
                            </Group>
                          ))}
                          <Divider />
                          <Group justify="space-between">
                            <Text fw={600}>Total Expenses</Text>
                            <Text fw={700} c="red">
                              {formatCurrency(pnlData.totalExpenses)}
                            </Text>
                          </Group>
                        </Stack>
                      </Paper>
                    </Grid.Col>
                  </Grid>

                  <Divider my="md" />

                  <Paper withBorder p="md" bg={pnlData.netProfit >= 0 ? 'green.0' : 'red.0'}>
                    <Group justify="space-between">
                      <Text fw={600} size="lg">
                        Net {pnlData.netProfit >= 0 ? 'Profit' : 'Loss'}
                      </Text>
                      <Text fw={700} size="xl" c={pnlData.netProfit >= 0 ? 'green' : 'red'}>
                        {formatCurrency(Math.abs(pnlData.netProfit))}
                      </Text>
                    </Group>
                    <Text size="sm" c="dimmed" mt="xs">
                      Gross Margin: {pnlData.grossMargin.toFixed(2)}%
                    </Text>
                  </Paper>
                </Paper>
              )}
            </Paper>
          </Tabs.Panel>

          {/* Balance Sheet Tab */}
          <Tabs.Panel value="balancesheet" pt="md">
            <Paper withBorder p="md">
              <Group justify="space-between" mb="md">
                <Title order={3}>Balance Sheet</Title>
                <Text size="sm" c="dimmed">
                  Snapshot of financial position on a specific date
                </Text>
              </Group>

              {/* Filters */}
              <Grid mb="lg">
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <DateInput
                    label="As of Date"
                    value={
                      balanceSheetFilters.asOfDate ? new Date(balanceSheetFilters.asOfDate) : null
                    }
                    onChange={(value: string | null) =>
                      setBalanceSheetFilters({
                        ...balanceSheetFilters,
                        asOfDate: value || '',
                      })
                    }
                    leftSection={<IconCalendar size={16} />}
                  />
                </Grid.Col>
              </Grid>

              <Button onClick={handleGenerateReport} loading={loading} mb="md">
                Generate Balance Sheet
              </Button>

              {/* Balance Sheet Report */}
              {balanceSheetData && (
                <Paper withBorder p="md">
                  <Group justify="space-between" mb="md">
                    <div>
                      <Text fw={600} size="lg">
                        Balance Sheet
                      </Text>
                      <Text size="sm" c="dimmed">
                        As of {formatDate(balanceSheetData.asOfDate)}
                      </Text>
                    </div>
                    <Group>
                      <Badge
                        color={balanceSheetData.isBalanced ? 'green' : 'red'}
                        variant="light"
                        leftSection={
                          balanceSheetData.isBalanced ? (
                            <IconCheck size={12} />
                          ) : (
                            <IconX size={12} />
                          )
                        }
                      >
                        {balanceSheetData.isBalanced ? 'Balanced' : 'Unbalanced'}
                      </Badge>
                    </Group>
                  </Group>

                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper withBorder p="md" bg="blue.0">
                        <Title order={4} mb="md" c="blue">
                          Assets
                        </Title>
                        <Stack gap="xs">
                          {balanceSheetData.assets.map((item) => (
                            <Group key={item.category} justify="space-between">
                              <Text size="sm">{item.category}</Text>
                              <Text size="sm" fw={600} c="blue">
                                {formatCurrency(item.amount)}
                              </Text>
                            </Group>
                          ))}
                          <Divider />
                          <Group justify="space-between">
                            <Text fw={600}>Total Assets</Text>
                            <Text fw={700} c="blue">
                              {formatCurrency(balanceSheetData.totalAssets)}
                            </Text>
                          </Group>
                        </Stack>
                      </Paper>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Stack gap="md">
                        <Paper withBorder p="md" bg="red.0">
                          <Title order={4} mb="md" c="red">
                            Liabilities
                          </Title>
                          <Stack gap="xs">
                            {balanceSheetData.liabilities.map((item) => (
                              <Group key={item.category} justify="space-between">
                                <Text size="sm">{item.category}</Text>
                                <Text size="sm" fw={600} c="red">
                                  {formatCurrency(item.amount)}
                                </Text>
                              </Group>
                            ))}
                            <Divider />
                            <Group justify="space-between">
                              <Text fw={600}>Total Liabilities</Text>
                              <Text fw={700} c="red">
                                {formatCurrency(balanceSheetData.totalLiabilities)}
                              </Text>
                            </Group>
                          </Stack>
                        </Paper>

                        <Paper withBorder p="md" bg="green.0">
                          <Title order={4} mb="md" c="green">
                            Equity
                          </Title>
                          <Stack gap="xs">
                            {balanceSheetData.equity.map((item) => (
                              <Group key={item.category} justify="space-between">
                                <Text size="sm">{item.category}</Text>
                                <Text size="sm" fw={600} c="green">
                                  {formatCurrency(item.amount)}
                                </Text>
                              </Group>
                            ))}
                            <Divider />
                            <Group justify="space-between">
                              <Text fw={600}>Total Equity</Text>
                              <Text fw={700} c="green">
                                {formatCurrency(balanceSheetData.totalEquity)}
                              </Text>
                            </Group>
                          </Stack>
                        </Paper>
                      </Stack>
                    </Grid.Col>
                  </Grid>

                  <Divider my="md" />

                  <Paper withBorder p="md" bg={balanceSheetData.isBalanced ? 'green.0' : 'red.0'}>
                    <Group justify="space-between">
                      <Text fw={600}>Assets = Liabilities + Equity</Text>
                      <Text fw={700} c={balanceSheetData.isBalanced ? 'green' : 'red'}>
                        {formatCurrency(balanceSheetData.totalAssets)} ={' '}
                        {formatCurrency(balanceSheetData.totalLiabilities)} +{' '}
                        {formatCurrency(balanceSheetData.totalEquity)}
                      </Text>
                    </Group>
                  </Paper>
                </Paper>
              )}
            </Paper>
          </Tabs.Panel>

          {/* Expenses Tab */}
          <Tabs.Panel value="expenses" pt="md">
            <Paper withBorder p="md">
              <Group justify="space-between" mb="md">
                <Title order={3}>Expenses Report</Title>
                <Text size="sm" c="dimmed">
                  Shows detailed expenses for a date range, categorized by type and status
                </Text>
              </Group>

              {/* Filters */}
              <Grid mb="lg">
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <DateInput
                    label="Start Date"
                    value={expensesFilters.startDate ? new Date(expensesFilters.startDate) : null}
                    onChange={(value: string | null) =>
                      setExpensesFilters({
                        ...expensesFilters,
                        startDate: value || '',
                      })
                    }
                    leftSection={<IconCalendar size={16} />}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <DateInput
                    label="End Date"
                    value={expensesFilters.endDate ? new Date(expensesFilters.endDate) : null}
                    onChange={(value: string | null) =>
                      setExpensesFilters({
                        ...expensesFilters,
                        endDate: value || '',
                      })
                    }
                    leftSection={<IconCalendar size={16} />}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <Select
                    label="Expense Type"
                    placeholder="All types"
                    data={[
                      { value: 'Travel', label: 'Travel' },
                      { value: 'Supplies', label: 'Supplies' },
                      { value: 'Salaries', label: 'Salaries' },
                      { value: 'Utilities', label: 'Utilities' },
                      { value: 'Marketing', label: 'Marketing' },
                      { value: 'Other', label: 'Other' },
                    ]}
                    value={expensesFilters.type}
                    onChange={(value) =>
                      setExpensesFilters({ ...expensesFilters, type: value || '' })
                    }
                    clearable
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <Select
                    label="Expense Status"
                    placeholder="All statuses"
                    data={[
                      { value: 'Pending', label: 'Pending' },
                      { value: 'Paid', label: 'Paid' },
                      { value: 'Unpaid', label: 'Unpaid' },
                      { value: 'Overdue', label: 'Overdue' },
                    ]}
                    value={expensesFilters.status}
                    onChange={(value) =>
                      setExpensesFilters({ ...expensesFilters, status: value || '' })
                    }
                    clearable
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <Select
                    label="Payment Mode"
                    placeholder="All modes"
                    data={[
                      { value: 'Cash', label: 'Cash' },
                      { value: 'Bank Transfer', label: 'Bank Transfer' },
                      { value: 'Credit Card', label: 'Credit Card' },
                      { value: 'Other', label: 'Other' },
                    ]}
                    value={expensesFilters.paymentMode}
                    onChange={(value) =>
                      setExpensesFilters({ ...expensesFilters, paymentMode: value || '' })
                    }
                    clearable
                  />
                </Grid.Col>
              </Grid>

              <Button onClick={handleGenerateReport} loading={loading} mb="md">
                Generate Expenses Report
              </Button>

              {/* Expenses Report */}
              {expensesData && (
                <Paper withBorder p="md">
                  <Group justify="space-between" mb="md">
                    <div>
                      <Text fw={600} size="lg">
                        Expenses Report
                      </Text>
                      <Text size="sm" c="dimmed">
                        {formatDate(expensesData.startDate)} - {formatDate(expensesData.endDate)}
                      </Text>
                    </div>
                    <Badge color="orange" variant="light" size="lg">
                      Total Expenses: {formatCurrency(expensesData.totalAmount)}
                    </Badge>
                  </Group>

                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper withBorder p="md" bg="orange.0">
                        <Title order={4} mb="md" c="orange">
                          Expenses by Type
                        </Title>
                        <Stack gap="xs">
                          {expensesData.breakdownByType.map((item) => (
                            <Group key={item.type} justify="space-between">
                              <Text size="sm">{item.type}</Text>
                              <Text size="sm" fw={600} c="orange">
                                {formatCurrency(item.amount)} ({item.percentage.toFixed(1)}%)
                              </Text>
                            </Group>
                          ))}
                          <Divider />
                          <Group justify="space-between">
                            <Text fw={600}>Total Expenses by Type</Text>
                            <Text fw={700} c="orange">
                              {formatCurrency(expensesData.totalExpenses)}
                            </Text>
                          </Group>
                        </Stack>
                      </Paper>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Paper withBorder p="md" bg="purple.0">
                        <Title order={4} mb="md" c="purple">
                          Expenses by Status
                        </Title>
                        <Stack gap="xs">
                          {expensesData.breakdownByStatus.map((item) => (
                            <Group key={item.status} justify="space-between">
                              <Text size="sm">{item.status}</Text>
                              <Text size="sm" fw={600} c="purple">
                                {formatCurrency(item.amount)} ({item.percentage.toFixed(1)}%)
                              </Text>
                            </Group>
                          ))}
                          <Divider />
                          <Group justify="space-between">
                            <Text fw={600}>Total Expenses by Status</Text>
                            <Text fw={700} c="purple">
                              {formatCurrency(expensesData.totalExpenses)}
                            </Text>
                          </Group>
                        </Stack>
                      </Paper>
                    </Grid.Col>
                  </Grid>

                  <Divider my="md" />

                  <Paper withBorder p="md" bg="orange.0">
                    <Group justify="space-between">
                      <Text fw={600} size="lg">
                        Average Expense
                      </Text>
                      <Text fw={700} size="xl" c="orange">
                        {formatCurrency(expensesData.averageExpense)}
                      </Text>
                    </Group>
                  </Paper>
                </Paper>
              )}
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
};

export default AccountingReports;
