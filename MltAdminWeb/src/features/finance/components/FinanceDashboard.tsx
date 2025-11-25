import React, { useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Text,
  Group,
  Card,
  RingProgress,
  Stack,
  Title,
  ActionIcon,
  Tooltip,
  Box,
  Divider,
  Progress,
  Table,
  Badge,
  Tabs,
  Alert,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  IconRefresh,
  IconTrendingUp,
  IconCurrencyRupee,
  IconBuildingStore,
  IconAlertCircle,
  IconInfoCircle,
  IconCalculator,
  IconReceipt,
  IconCash,
  IconTrendingDown,
  IconCalendar,
} from '@tabler/icons-react';
import { useFinanceDashboard } from '../hooks/useFinanceDashboard';

const FinanceDashboard: React.FC = () => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const handleStartDateChange = (value: string | Date | null) => {
    if (!value) return setStartDate(null);
    const normalized = typeof value === 'string' ? new Date(value) : value;
    setStartDate(normalized);
  };

  const handleEndDateChange = (value: string | Date | null) => {
    if (!value) return setEndDate(null);
    const normalized = typeof value === 'string' ? new Date(value) : value;
    setEndDate(normalized);
  };

  const { dashboardData, isLoading, error, refetch } = useFinanceDashboard({
    startDate: startDate,
    endDate: endDate,
    currency: 'INR',
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getProfitLossColor = (value: number) => {
    return value >= 0 ? 'green' : 'red';
  };

  // Calculate net income in the frontend
  const netIncome = (dashboardData?.TotalProfit || 0) - (dashboardData?.TotalExpenses || 0);

  if (error) {
    return (
      <Container size="xl">
        <Paper p="md" withBorder>
          <Text c="red" ta="center">
            Error loading finance dashboard: {error}
          </Text>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <div>
            <Title order={1}>Finance Dashboard</Title>
            <Text c="dimmed" size="sm">
              Comprehensive financial analysis and business performance metrics
            </Text>
          </div>
          <Group>
            <DateInput
              placeholder="Start date"
              value={startDate}
              onChange={handleStartDateChange}
              leftSection={<IconCalendar size={16} />}
              clearable
              style={{ minWidth: 150 }}
              maxDate={new Date()}
            />
            <DateInput
              placeholder="End date"
              value={endDate}
              onChange={handleEndDateChange}
              leftSection={<IconCalendar size={16} />}
              clearable
              style={{ minWidth: 150 }}
              maxDate={new Date()}
              minDate={startDate || undefined}
            />
            <Tooltip label="Refresh data">
              <ActionIcon variant="light" onClick={refetch} loading={isLoading}>
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* Key Performance Indicators */}
        <Paper withBorder p="md">
          <Title order={3} mb="md">
            Key Performance Indicators
          </Title>
          <Grid>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Card withBorder p="md">
                <Group justify="space-between" mb="xs">
                  <Text size="sm" c="dimmed">
                    Total Revenue
                  </Text>
                  <IconCurrencyRupee size={16} color="green" />
                </Group>
                <Text size="xs" c="dimmed" mt={4}>
                  Fulfilled orders only (excludes cancelled/voided/refunded)
                </Text>
                <Text size="xl" fw={700}>
                  {dashboardData ? formatCurrency(dashboardData.TotalRevenue) : 'Loading...'}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  {dashboardData?.TotalOrders || 0} orders •{' '}
                  {dashboardData ? formatCurrency(dashboardData.AverageOrderValue) : '0'} avg
                </Text>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Card withBorder p="md">
                <Group justify="space-between" mb="xs">
                  <Text size="sm" c="dimmed">
                    Net Income
                  </Text>
                  <IconTrendingUp size={16} color="green" />
                </Group>
                <Text size="xl" fw={700}>
                  {dashboardData ? formatCurrency(netIncome) : 'Loading...'}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  {dashboardData ? formatPercentage(dashboardData.NetMargin) : '0%'} margin
                </Text>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Card withBorder p="md">
                <Group justify="space-between" mb="xs">
                  <Text size="sm" c="dimmed">
                    Total Expenses
                  </Text>
                  <IconTrendingDown size={16} color="red" />
                </Group>
                <Text size="xl" fw={700}>
                  {dashboardData ? formatCurrency(dashboardData.TotalExpenses) : 'Loading...'}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  {dashboardData?.PendingExpenses
                    ? `${formatCurrency(dashboardData.PendingExpenses)} pending`
                    : 'All approved'}
                </Text>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Card withBorder p="md">
                <Group justify="space-between" mb="xs">
                  <Text size="sm" c="dimmed">
                    Approved Expenses
                  </Text>
                  <IconTrendingUp size={16} color="green" />
                </Group>
                <Text size="xl" fw={700} c="green">
                  {dashboardData ? formatCurrency(dashboardData.ApprovedExpenses) : 'Loading...'}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  {dashboardData?.TotalExpenses
                    ? formatPercentage(
                        (dashboardData.ApprovedExpenses / dashboardData.TotalExpenses) * 100,
                      )
                    : '0%'}{' '}
                  approved
                </Text>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Card withBorder p="md">
                <Group justify="space-between" mb="xs">
                  <Text size="sm" c="dimmed">
                    {(dashboardData?.Loss || 0) > 0 ? 'Total Loss' : 'Gross Profit'}
                  </Text>
                  <IconTrendingUp
                    size={16}
                    color={(dashboardData?.Loss || 0) > 0 ? 'red' : 'green'}
                  />
                </Group>
                <Text size="xl" fw={700}>
                  {dashboardData
                    ? formatCurrency(
                        (dashboardData.Loss || 0) > 0
                          ? dashboardData.Loss || 0
                          : dashboardData.TotalProfit,
                      )
                    : 'Loading...'}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  {dashboardData ? formatPercentage(dashboardData.GrossMargin) : '0%'} margin
                </Text>
              </Card>
            </Grid.Col>
          </Grid>
        </Paper>

        {/* Detailed Financial Analysis */}
        <Tabs defaultValue="overview">
          <Tabs.List>
            <Tabs.Tab value="overview" leftSection={<IconCalculator size={16} />}>
              Financial Overview
            </Tabs.Tab>
            <Tabs.Tab value="revenue" leftSection={<IconCurrencyRupee size={16} />}>
              Revenue Analysis
            </Tabs.Tab>
            <Tabs.Tab value="expenses" leftSection={<IconReceipt size={16} />}>
              Expense Analysis
            </Tabs.Tab>
            <Tabs.Tab value="approved-expenses" leftSection={<IconTrendingUp size={16} />}>
              Approved Expenses
            </Tabs.Tab>
            <Tabs.Tab value="profitability" leftSection={<IconTrendingUp size={16} />}>
              Profitability
            </Tabs.Tab>
            <Tabs.Tab value="cashflow" leftSection={<IconCash size={16} />}>
              Cash Flow
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" pt="md">
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper withBorder p="md">
                  <Title order={4} mb="md">
                    Income Statement Breakdown
                  </Title>
                  <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" mb="md">
                    <Text size="xs">
                      Revenue includes only fulfilled orders that are not cancelled, voided, or
                      refunded
                    </Text>
                  </Alert>
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="sm">Total Revenue</Text>
                      <Text size="sm" fw={600} c="green">
                        {dashboardData ? formatCurrency(dashboardData.TotalRevenue) : 'Loading...'}
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">Cost of Goods Sold</Text>
                      <Text size="sm" fw={600} c="red">
                        -{dashboardData ? formatCurrency(dashboardData.TotalCostOfGoods) : '0'}
                      </Text>
                    </Group>
                    <Divider />
                    <Group justify="space-between">
                      <Text size="sm" fw={600}>
                        Gross Profit
                      </Text>
                      <Text size="sm" fw={700} c="green">
                        {dashboardData ? formatCurrency(dashboardData.TotalProfit) : 'Loading...'}
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">Operating Expenses</Text>
                      <Text size="sm" fw={600} c="red">
                        -{dashboardData ? formatCurrency(dashboardData.TotalExpenses) : '0'}
                      </Text>
                    </Group>
                    <Divider />
                    <Group justify="space-between">
                      <Text size="sm" fw={700}>
                        {netIncome < 0 ? 'Net Loss' : 'Net Income'}
                      </Text>
                      <Text size="sm" fw={700} c={getProfitLossColor(netIncome)}>
                        {(netIncome < 0 ? '-' : '') + formatCurrency(Math.abs(netIncome))}
                      </Text>
                    </Group>
                    {netIncome < 0 && (
                      <Alert
                        icon={<IconAlertCircle size={16} />}
                        color="red"
                        variant="light"
                        mt="xs"
                      >
                        <Text fw={600}>Financial Alert: Operating at a Loss</Text>
                        <Text size="sm">
                          Your operating expenses exceed your gross profit. You are running at a net
                          loss for this period.
                        </Text>
                      </Alert>
                    )}
                  </Stack>
                </Paper>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper withBorder p="md">
                  <Title order={4} mb="md">
                    Profitability Metrics
                  </Title>
                  <Stack gap="md">
                    <Box>
                      <Group justify="space-between" mb="xs">
                        <Text size="sm">Gross Profit Margin</Text>
                        <Text size="sm" fw={600} c="green">
                          {dashboardData ? formatPercentage(dashboardData.GrossMargin) : '0%'}
                        </Text>
                      </Group>
                      <Progress value={dashboardData?.GrossMargin || 0} color="green" size="lg" />
                    </Box>
                    <Box>
                      <Group justify="space-between" mb="xs">
                        <Text size="sm">Net Profit Margin</Text>
                        <Text
                          size="sm"
                          fw={600}
                          c={getProfitLossColor(dashboardData?.NetMargin || 0)}
                        >
                          {dashboardData ? formatPercentage(dashboardData.NetMargin || 0) : '0%'}
                        </Text>
                      </Group>
                      <Progress
                        value={Math.abs(dashboardData?.NetMargin || 0)}
                        color={getProfitLossColor(dashboardData?.NetMargin || 0)}
                        size="lg"
                      />
                    </Box>
                    {(dashboardData?.Loss || 0) > 0 && (
                      <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                        <Text size="sm" fw={600}>
                          Total Loss: {formatCurrency(dashboardData?.Loss || 0)}
                        </Text>
                        <Text size="xs">
                          Expenses exceed revenue by {formatCurrency(dashboardData?.Loss || 0)}
                        </Text>
                      </Alert>
                    )}
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>

          <Tabs.Panel value="revenue" pt="md">
            <Grid>
              <Grid.Col span={{ base: 12, md: 8 }}>
                <Paper withBorder p="md">
                  <Title order={4} mb="md">
                    Revenue Breakdown
                  </Title>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Source</Table.Th>
                        <Table.Th>Revenue</Table.Th>
                        <Table.Th>Orders</Table.Th>
                        <Table.Th>Avg Order</Table.Th>
                        <Table.Th>Profit</Table.Th>
                        <Table.Th>Margin</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      <Table.Tr>
                        <Table.Td>
                          <Group gap="xs">
                            <IconBuildingStore size={16} color="green" />
                            <Text size="sm" fw={500}>
                              Shopify
                            </Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={600}>
                            {dashboardData
                              ? formatCurrency(
                                  dashboardData.PlatformBreakdown?.shopify?.revenue || 0,
                                )
                              : '0'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {dashboardData?.PlatformBreakdown?.shopify?.orders || 0}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {dashboardData?.PlatformBreakdown?.shopify?.orders
                              ? formatCurrency(
                                  (dashboardData.PlatformBreakdown.shopify.revenue || 0) /
                                    dashboardData.PlatformBreakdown.shopify.orders,
                                )
                              : '0'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="green" fw={600}>
                            {dashboardData
                              ? formatCurrency(
                                  dashboardData.PlatformBreakdown?.shopify?.profit || 0,
                                )
                              : '0'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="green">
                            {dashboardData?.PlatformBreakdown?.shopify?.revenue
                              ? formatPercentage(
                                  ((dashboardData.PlatformBreakdown.shopify.profit || 0) /
                                    dashboardData.PlatformBreakdown.shopify.revenue) *
                                    100,
                                )
                              : '0%'}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    </Table.Tbody>
                  </Table>
                </Paper>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Paper withBorder p="md">
                  <Title order={4} mb="md">
                    Revenue Summary
                  </Title>
                  <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" mb="md">
                    <Text size="xs">
                      Revenue calculations include only fulfilled orders that are not cancelled,
                      voided, or refunded
                    </Text>
                  </Alert>
                  <Stack gap="md">
                    <Box>
                      <Text size="sm" c="dimmed">
                        Total Revenue
                      </Text>
                      <Text size="lg" fw={700} c="green">
                        {dashboardData ? formatCurrency(dashboardData.TotalRevenue) : '0'}
                      </Text>
                    </Box>
                    <Box>
                      <Text size="sm" c="dimmed">
                        Total Orders
                      </Text>
                      <Text size="lg" fw={700}>
                        {dashboardData?.TotalOrders || 0}
                      </Text>
                    </Box>
                    <Box>
                      <Text size="sm" c="dimmed">
                        Average Order Value
                      </Text>
                      <Text size="lg" fw={700}>
                        {dashboardData ? formatCurrency(dashboardData.AverageOrderValue) : '0'}
                      </Text>
                    </Box>
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>

          <Tabs.Panel value="expenses" pt="md">
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper withBorder p="md">
                  <Title order={4} mb="md">
                    Expense Analysis
                  </Title>
                  <Stack gap="md">
                    <Box>
                      <Group justify="space-between" mb="xs">
                        <Text size="sm">Total Expenses</Text>
                        <Text size="sm" fw={600} c="red">
                          {dashboardData ? formatCurrency(dashboardData.TotalExpenses) : '0'}
                        </Text>
                      </Group>
                      <Progress value={100} color="red" size="lg" />
                    </Box>
                    <Box>
                      <Group justify="space-between" mb="xs">
                        <Text size="sm">Approved Expenses</Text>
                        <Text size="sm" fw={600} c="green">
                          {dashboardData ? formatCurrency(dashboardData.ApprovedExpenses) : '0'}
                        </Text>
                      </Group>
                      <Progress
                        value={
                          dashboardData?.TotalExpenses
                            ? (dashboardData.ApprovedExpenses / dashboardData.TotalExpenses) * 100
                            : 0
                        }
                        color="green"
                        size="lg"
                      />
                      <Text size="xs" c="dimmed" mt="xs">
                        {dashboardData?.TotalExpenses
                          ? formatPercentage(
                              (dashboardData.ApprovedExpenses / dashboardData.TotalExpenses) * 100,
                            )
                          : '0%'}{' '}
                        of total expenses approved
                      </Text>
                    </Box>
                    <Box>
                      <Group justify="space-between" mb="xs">
                        <Text size="sm">Pending Expenses</Text>
                        <Text size="sm" fw={600} c="orange">
                          {dashboardData ? formatCurrency(dashboardData.PendingExpenses) : '0'}
                        </Text>
                      </Group>
                      <Progress
                        value={
                          dashboardData?.TotalExpenses
                            ? (dashboardData.PendingExpenses / dashboardData.TotalExpenses) * 100
                            : 0
                        }
                        color="orange"
                        size="lg"
                      />
                    </Box>
                  </Stack>
                </Paper>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper withBorder p="md">
                  <Title order={4} mb="md">
                    Recent Expenses
                  </Title>
                  <Stack gap="xs">
                    {dashboardData?.RecentExpenses?.slice(0, 5).map((expense, index) => (
                      <Group key={index} justify="space-between">
                        <div>
                          <Text size="sm" fw={500}>
                            {expense.Description}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {expense.Category} • {new Date(expense.Date).toLocaleDateString()}
                          </Text>
                        </div>
                        <Group gap="xs">
                          <Text size="sm" fw={600}>
                            {formatCurrency(expense.Amount)}
                          </Text>
                          <Badge
                            size="xs"
                            color={expense.Status === 'approved' ? 'green' : 'orange'}
                          >
                            {expense.Status}
                          </Badge>
                        </Group>
                      </Group>
                    )) || (
                      <Text size="sm" c="dimmed" ta="center">
                        No recent expenses
                      </Text>
                    )}
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>

            {/* Approved Expenses Summary Card */}
            <Grid mt="md">
              <Grid.Col span={{ base: 12 }}>
                <Paper withBorder p="md">
                  <Title order={4} mb="md">
                    Approved Expenses Summary
                  </Title>
                  <Grid>
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                      <Card withBorder p="md">
                        <Group justify="space-between" mb="xs">
                          <Text size="sm" c="dimmed">
                            Total Approved
                          </Text>
                          <IconTrendingUp size={16} color="green" />
                        </Group>
                        <Text size="xl" fw={700} c="green">
                          {dashboardData ? formatCurrency(dashboardData.ApprovedExpenses) : '0'}
                        </Text>
                        <Text size="xs" c="dimmed" mt={4}>
                          {dashboardData?.ApprovedExpensesBreakdown?.length || 0} expenses
                        </Text>
                      </Card>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                      <Card withBorder p="md">
                        <Group justify="space-between" mb="xs">
                          <Text size="sm" c="dimmed">
                            Approval Rate
                          </Text>
                          <IconCalculator size={16} color="blue" />
                        </Group>
                        <Text size="xl" fw={700}>
                          {dashboardData?.TotalExpenses
                            ? formatPercentage(
                                (dashboardData.ApprovedExpenses / dashboardData.TotalExpenses) *
                                  100,
                              )
                            : '0%'}
                        </Text>
                        <Text size="xs" c="dimmed" mt={4}>
                          of total expenses
                        </Text>
                      </Card>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                      <Card withBorder p="md">
                        <Group justify="space-between" mb="xs">
                          <Text size="sm" c="dimmed">
                            Avg Approved
                          </Text>
                          <IconReceipt size={16} color="purple" />
                        </Group>
                        <Text size="xl" fw={700}>
                          {dashboardData?.ApprovedExpensesBreakdown?.length
                            ? formatCurrency(
                                dashboardData.ApprovedExpenses /
                                  dashboardData.ApprovedExpensesBreakdown.length,
                              )
                            : '0'}
                        </Text>
                        <Text size="xs" c="dimmed" mt={4}>
                          per expense
                        </Text>
                      </Card>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                      <Card withBorder p="md">
                        <Group justify="space-between" mb="xs">
                          <Text size="sm" c="dimmed">
                            Pending Amount
                          </Text>
                          <IconAlertCircle size={16} color="orange" />
                        </Group>
                        <Text size="xl" fw={700} c="orange">
                          {dashboardData ? formatCurrency(dashboardData.PendingExpenses) : '0'}
                        </Text>
                        <Text size="xs" c="dimmed" mt={4}>
                          awaiting approval
                        </Text>
                      </Card>
                    </Grid.Col>
                  </Grid>
                </Paper>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>

          <Tabs.Panel value="approved-expenses" pt="md">
            <Grid>
              <Grid.Col span={{ base: 12, md: 8 }}>
                <Paper withBorder p="md">
                  <Title order={4} mb="md">
                    Approved Expenses Breakdown
                  </Title>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Description</Table.Th>
                        <Table.Th>Category</Table.Th>
                        <Table.Th>Amount</Table.Th>
                        <Table.Th>Date</Table.Th>
                        <Table.Th>Payment Mode</Table.Th>
                        <Table.Th>Paid To</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {dashboardData?.ApprovedExpensesBreakdown?.map((expense, index) => (
                        <Table.Tr key={index}>
                          <Table.Td>
                            <Text size="sm" fw={500}>
                              {expense.Description}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge size="xs" variant="light">
                              {expense.Category}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600} c="green">
                              {formatCurrency(expense.Amount)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{new Date(expense.Date).toLocaleDateString()}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed">
                              {expense.PaymentMode}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed">
                              {expense.PaidTo}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      )) || (
                        <Table.Tr>
                          <Table.Td colSpan={6} ta="center">
                            <Text size="sm" c="dimmed">
                              No approved expenses found in the selected date range.
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </Table.Tbody>
                  </Table>
                </Paper>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Paper withBorder p="md">
                  <Title order={4} mb="md">
                    Approved Expenses Summary
                  </Title>
                  <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" mb="md">
                    <Text size="xs">
                      This section shows a breakdown of all approved expenses within the selected
                      date range.
                    </Text>
                  </Alert>
                  <Stack gap="md">
                    <Box>
                      <Text size="sm" c="dimmed">
                        Total Approved Expenses
                      </Text>
                      <Text size="lg" fw={700} c="green">
                        {dashboardData ? formatCurrency(dashboardData.ApprovedExpenses) : '0'}
                      </Text>
                    </Box>
                    <Box>
                      <Text size="sm" c="dimmed">
                        Number of Approved Expenses
                      </Text>
                      <Text size="lg" fw={700}>
                        {dashboardData?.ApprovedExpensesBreakdown?.length || 0}
                      </Text>
                    </Box>
                    <Box>
                      <Text size="sm" c="dimmed">
                        Average Approved Expense
                      </Text>
                      <Text size="lg" fw={700}>
                        {dashboardData?.ApprovedExpensesBreakdown?.length
                          ? formatCurrency(
                              dashboardData.ApprovedExpenses /
                                dashboardData.ApprovedExpensesBreakdown.length,
                            )
                          : '0'}
                      </Text>
                    </Box>
                    <Box>
                      <Text size="sm" c="dimmed">
                        Approval Rate
                      </Text>
                      <Text size="lg" fw={700} c="green">
                        {dashboardData?.TotalExpenses
                          ? formatPercentage(
                              (dashboardData.ApprovedExpenses / dashboardData.TotalExpenses) * 100,
                            )
                          : '0%'}
                      </Text>
                    </Box>
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>

          <Tabs.Panel value="profitability" pt="md">
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper withBorder p="md">
                  <Title order={4} mb="md">
                    Profitability Analysis
                  </Title>
                  <Stack gap="md">
                    <Box>
                      <Group justify="space-between" mb="xs">
                        <Text size="sm">Gross Profit</Text>
                        <Text size="sm" fw={600} c="green">
                          {dashboardData ? formatCurrency(dashboardData.TotalProfit) : '0'}
                        </Text>
                      </Group>
                      <Progress value={dashboardData?.GrossMargin || 0} color="green" size="lg" />
                      <Text size="xs" c="dimmed" mt="xs">
                        {dashboardData ? formatPercentage(dashboardData.GrossMargin) : '0%'} of
                        revenue
                      </Text>
                    </Box>
                    <Box>
                      <Group justify="space-between" mb="xs">
                        <Text size="sm">Net Profit</Text>
                        <Text size="sm" fw={600} c={getProfitLossColor(netIncome)}>
                          {netIncome < 0
                            ? `-${formatCurrency(Math.abs(netIncome))}`
                            : formatCurrency(netIncome)}
                        </Text>
                      </Group>
                      <Progress
                        value={Math.abs(dashboardData?.NetMargin || 0)}
                        color={getProfitLossColor(dashboardData?.NetMargin || 0)}
                        size="lg"
                      />
                      <Text size="xs" c="dimmed" mt="xs">
                        {dashboardData ? formatPercentage(dashboardData.NetMargin || 0) : '0%'} of
                        revenue
                      </Text>
                      {netIncome < 0 && (
                        <Alert
                          icon={<IconAlertCircle size={16} />}
                          color="red"
                          variant="light"
                          mt="xs"
                        >
                          <Text fw={600}>Financial Alert: Operating at a Loss</Text>
                          <Text size="sm">
                            Your operating expenses exceed your gross profit. You are running at a
                            net loss for this period.
                          </Text>
                        </Alert>
                      )}
                    </Box>
                  </Stack>
                </Paper>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper withBorder p="md">
                  <Title order={4} mb="md">
                    Profit Margins
                  </Title>
                  <Box ta="center">
                    <RingProgress
                      size={120}
                      thickness={12}
                      sections={[
                        {
                          value: dashboardData?.GrossMargin || 0,
                          color: 'green',
                          tooltip: `Gross Margin: ${dashboardData ? formatPercentage(dashboardData.GrossMargin) : '0%'}`,
                        },
                      ]}
                      label={
                        <Text ta="center" size="lg" fw={700}>
                          {dashboardData ? formatPercentage(dashboardData.GrossMargin) : '0%'}
                        </Text>
                      }
                    />
                    <Text size="sm" c="dimmed" mt="md">
                      Gross Profit Margin
                    </Text>
                  </Box>
                </Paper>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>

          <Tabs.Panel value="cashflow" pt="md">
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper withBorder p="md">
                  <Title order={4} mb="md">
                    Cash Flow Summary
                  </Title>
                  <Stack gap="md">
                    <Box>
                      <Group justify="space-between">
                        <Text size="sm">Cash In (Revenue)</Text>
                        <Text size="sm" fw={600} c="green">
                          {dashboardData ? formatCurrency(dashboardData.TotalRevenue) : '0'}
                        </Text>
                      </Group>
                    </Box>
                    <Box>
                      <Group justify="space-between">
                        <Text size="sm">Cash Out (Expenses)</Text>
                        <Text size="sm" fw={600} c="red">
                          -{dashboardData ? formatCurrency(dashboardData.TotalExpenses) : '0'}
                        </Text>
                      </Group>
                    </Box>
                    <Divider />
                    <Box>
                      <Group justify="space-between">
                        <Text size="sm" fw={600}>
                          Net Cash Flow
                        </Text>
                        <Text size="sm" fw={700} c={getProfitLossColor(netIncome)}>
                          {netIncome < 0
                            ? `-${formatCurrency(Math.abs(netIncome))}`
                            : formatCurrency(netIncome)}
                        </Text>
                      </Group>
                    </Box>
                  </Stack>
                </Paper>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper withBorder p="md">
                  <Title order={4} mb="md">
                    Financial Health Indicators
                  </Title>
                  <Stack gap="md">
                    <Box>
                      <Group justify="space-between">
                        <Text size="sm">Revenue Growth</Text>
                        <Group gap="xs">
                          <Text size="sm" fw={600} c="dimmed">
                            N/A
                          </Text>
                        </Group>
                      </Group>
                    </Box>
                    <Box>
                      <Group justify="space-between">
                        <Text size="sm">Profit Margin</Text>
                        <Text
                          size="sm"
                          fw={600}
                          c={getProfitLossColor(dashboardData?.NetMargin || 0)}
                        >
                          {dashboardData ? formatPercentage(dashboardData.NetMargin || 0) : '0%'}
                        </Text>
                      </Group>
                    </Box>
                    <Box>
                      <Group justify="space-between">
                        <Text size="sm">Expense Ratio</Text>
                        <Text size="sm" fw={600} c="red">
                          {dashboardData?.TotalRevenue
                            ? formatPercentage(
                                (dashboardData.TotalExpenses / dashboardData.TotalRevenue) * 100,
                              )
                            : '0%'}
                        </Text>
                      </Group>
                    </Box>
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>
        </Tabs>

        {/* Additional Insights */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper withBorder p="md">
              <Title order={4} mb="md">
                Cost Analysis
              </Title>
              <Stack gap="md">
                <Box>
                  <Group justify="space-between" mb="xs">
                    <Text size="sm">Cost of Goods Sold</Text>
                    <Text size="sm" fw={600} c="red">
                      {dashboardData ? formatCurrency(dashboardData.TotalCostOfGoods) : '0'}
                    </Text>
                  </Group>
                  <Progress
                    value={
                      dashboardData?.TotalRevenue
                        ? (dashboardData.TotalCostOfGoods / dashboardData.TotalRevenue) * 100
                        : 0
                    }
                    color="red"
                    size="lg"
                  />
                  <Text size="xs" c="dimmed" mt="xs">
                    {dashboardData?.TotalRevenue
                      ? formatPercentage(
                          (dashboardData.TotalCostOfGoods / dashboardData.TotalRevenue) * 100,
                        )
                      : '0%'}{' '}
                    of revenue
                  </Text>
                </Box>
                <Box>
                  <Group justify="space-between" mb="xs">
                    <Text size="sm">Operating Expenses</Text>
                    <Text size="sm" fw={600} c="orange">
                      {dashboardData ? formatCurrency(dashboardData.TotalExpenses) : '0'}
                    </Text>
                  </Group>
                  <Progress
                    value={
                      dashboardData?.TotalRevenue
                        ? (dashboardData.TotalExpenses / dashboardData.TotalRevenue) * 100
                        : 0
                    }
                    color="orange"
                    size="lg"
                  />
                  <Text size="xs" c="dimmed" mt="xs">
                    {dashboardData?.TotalRevenue
                      ? formatPercentage(
                          (dashboardData.TotalExpenses / dashboardData.TotalRevenue) * 100,
                        )
                      : '0%'}{' '}
                    of revenue
                  </Text>
                </Box>
              </Stack>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper withBorder p="md">
              <Title order={4} mb="md">
                Performance Metrics
              </Title>
              <Stack gap="md">
                <Box>
                  <Group justify="space-between">
                    <Text size="sm">Average Order Value</Text>
                    <Text size="sm" fw={600}>
                      {dashboardData ? formatCurrency(dashboardData.AverageOrderValue) : '0'}
                    </Text>
                  </Group>
                </Box>
                <Box>
                  <Group justify="space-between">
                    <Text size="sm">Total Orders</Text>
                    <Text size="sm" fw={600}>
                      {dashboardData?.TotalOrders || 0}
                    </Text>
                  </Group>
                </Box>
                <Box>
                  <Group justify="space-between">
                    <Text size="sm">Revenue per Order</Text>
                    <Text size="sm" fw={600}>
                      {dashboardData ? formatCurrency(dashboardData.AverageOrderValue) : '0'}
                    </Text>
                  </Group>
                </Box>
                <Box>
                  <Group justify="space-between">
                    <Text size="sm">Profit per Order</Text>
                    <Text size="sm" fw={600} c={getProfitLossColor(netIncome)}>
                      {dashboardData?.TotalOrders
                        ? formatCurrency(netIncome / dashboardData.TotalOrders)
                        : '0'}
                    </Text>
                  </Group>
                </Box>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Financial Alerts */}
        {(dashboardData?.Loss || 0) > 0 && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            <Text fw={600}>Financial Alert: Operating at a Loss</Text>
            <Text size="sm">
              Your expenses ({formatCurrency(dashboardData?.TotalExpenses || 0)}) exceed your
              revenue ({formatCurrency(dashboardData?.TotalRevenue || 0)}) by{' '}
              {formatCurrency(dashboardData?.Loss || 0)}. Consider reviewing your cost structure and
              revenue strategies.
            </Text>
          </Alert>
        )}

        {dashboardData?.NetMargin && dashboardData.NetMargin < 10 && (
          <Alert icon={<IconInfoCircle size={16} />} color="yellow" variant="light">
            <Text fw={600}>Low Profit Margin Warning</Text>
            <Text size="sm">
              Your net profit margin is {formatPercentage(dashboardData.NetMargin)}, which is below
              the recommended 10% threshold. Consider optimizing costs or increasing prices to
              improve profitability.
            </Text>
          </Alert>
        )}
      </Stack>
    </Container>
  );
};

export default FinanceDashboard;
