import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Grid,
  Paper,
  Text,
  Group,
  Card,
  Stack,
  Title,
  Badge,
  Button,
  ActionIcon,
  Tooltip,
  Box,
  Divider,
  Progress,
  SimpleGrid,
  Table,
} from '@mantine/core';
import {
  IconDownload,
  IconRefresh,
  IconTrendingUp,
  IconCurrencyRupee,
  IconShoppingCart,
  IconBuildingStore,
  IconChartBar,
  IconUsers,
} from '@tabler/icons-react';
import { api, API_ENDPOINTS } from '../../../services/api';
import { notifications } from '@mantine/notifications';

interface SalesAnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalCostOfGoods: number;
  totalProfit: number;
  grossMargin: number;
  revenueGrowth: number;
  orderGrowth: number;
  platformBreakdown: {
    shopify: { revenue: number; orders: number; profit: number };
    amazon: { revenue: number; orders: number; profit: number };
    flipkart: { revenue: number; orders: number; profit: number };
  };
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    orders: number;
  }>;
  customerMetrics: {
    newCustomers: number;
    returningCustomers: number;
    customerRetentionRate: number;
  };
  dateRangeInfo: {
    startDate: string | null;
    endDate: string | null;
    totalOrdersInRange: number;
  };
}

const SalesAnalytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<SalesAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Always default to no date filter (all-time)
  const [dateRange, setDateRange] = useState({
    startDate: null as string | null,
    endDate: null as string | null,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate);
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate);
      }

      const response = await api.get<{ data: SalesAnalyticsData }>(
        `${API_ENDPOINTS.FINANCE_SALES_ANALYTICS}?${params}`,
      );
      setAnalyticsData(response.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  // Effect to handle date range changes with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAnalytics();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [dateRange, fetchAnalytics]);

  const handleExport = () => {
    notifications.show({
      title: 'Export',
      message: 'Analytics export functionality coming soon',
      color: 'blue',
    });
  };

  // When user clicks refresh, also reset date range to all-time
  const handleRefresh = () => {
    setDateRange({ startDate: null, endDate: null });
  };

  if (error) {
    return (
      <Container size="xl">
        <Paper p="md" withBorder>
          <Text c="red" ta="center">
            Error loading sales analytics: {error}
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
            <Title order={1}>Sales Analytics</Title>
            <Text c="dimmed" size="sm">
              Comprehensive sales performance and revenue analysis
            </Text>
          </div>
          <Group>
            <Tooltip label="Refresh data">
              <ActionIcon variant="light" onClick={handleRefresh} loading={isLoading}>
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
            <Button
              variant="light"
              size="sm"
              leftSection={<IconDownload size={14} />}
              onClick={handleExport}
            >
              Export
            </Button>
          </Group>
        </Group>

        {/* Key Metrics */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Card withBorder p="md">
              <Group>
                <IconCurrencyRupee size={24} color="green" />
                <div>
                  <Text size="xs" c="dimmed">
                    Total Revenue
                  </Text>
                  <Text fw={700} size="lg">
                    {analyticsData ? formatCurrency(analyticsData.totalRevenue) : 'Loading...'}
                  </Text>
                  <Group gap={4} mt={4}>
                    <IconTrendingUp
                      size={12}
                      color={(analyticsData?.revenueGrowth || 0) >= 0 ? 'green' : 'red'}
                    />
                    <Text size="xs" c={(analyticsData?.revenueGrowth || 0) >= 0 ? 'green' : 'red'}>
                      {(analyticsData?.revenueGrowth || 0) >= 0 ? '+' : ''}
                      {(analyticsData?.revenueGrowth || 0).toFixed(1)}%
                    </Text>
                  </Group>
                </div>
              </Group>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 3 }}>
            <Card withBorder p="md">
              <Group>
                <IconShoppingCart size={24} color="blue" />
                <div>
                  <Text size="xs" c="dimmed">
                    Total Orders
                  </Text>
                  <Text fw={700} size="lg">
                    {analyticsData?.totalOrders || 0}
                  </Text>
                  <Group gap={4} mt={4}>
                    <IconTrendingUp
                      size={12}
                      color={(analyticsData?.orderGrowth || 0) >= 0 ? 'green' : 'red'}
                    />
                    <Text size="xs" c={(analyticsData?.orderGrowth || 0) >= 0 ? 'green' : 'red'}>
                      {(analyticsData?.orderGrowth || 0) >= 0 ? '+' : ''}
                      {(analyticsData?.orderGrowth || 0).toFixed(1)}%
                    </Text>
                  </Group>
                </div>
              </Group>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 3 }}>
            <Card withBorder p="md">
              <Group>
                <IconChartBar size={24} color="orange" />
                <div>
                  <Text size="xs" c="dimmed">
                    Gross Profit
                  </Text>
                  <Text fw={700} size="lg">
                    {analyticsData ? formatCurrency(analyticsData.totalProfit) : 'Loading...'}
                  </Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    {analyticsData ? formatPercentage(analyticsData.grossMargin) : '0%'} margin
                  </Text>
                </div>
              </Group>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 3 }}>
            <Card withBorder p="md">
              <Group>
                <IconUsers size={24} color="purple" />
                <div>
                  <Text size="xs" c="dimmed">
                    Avg Order Value
                  </Text>
                  <Text fw={700} size="lg">
                    {analyticsData ? formatCurrency(analyticsData.averageOrderValue) : 'Loading...'}
                  </Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    Per order
                  </Text>
                </div>
              </Group>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Platform Breakdown */}
        <Paper withBorder p="md">
          <Title order={3} mb="md">
            Platform Revenue Breakdown
          </Title>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
            <Card withBorder p="sm">
              <Group justify="space-between" mb="xs">
                <Text size="sm" fw={500}>
                  Shopify
                </Text>
                <IconBuildingStore size={16} color="green" />
              </Group>
              <Text size="lg" fw={700}>
                {analyticsData?.platformBreakdown?.shopify?.revenue
                  ? formatCurrency(analyticsData.platformBreakdown.shopify.revenue)
                  : 'Loading...'}
              </Text>
              <Text size="xs" c="dimmed">
                {analyticsData?.platformBreakdown?.shopify?.orders || 0} orders
              </Text>
              <Text size="xs" c="green" mt={4}>
                Profit:{' '}
                {analyticsData?.platformBreakdown?.shopify?.profit
                  ? formatCurrency(analyticsData.platformBreakdown.shopify.profit)
                  : '0'}
              </Text>
            </Card>

            <Card withBorder p="sm">
              <Group justify="space-between" mb="xs">
                <Text size="sm" fw={500}>
                  Amazon
                </Text>
                <IconBuildingStore size={16} color="orange" />
              </Group>
              <Text size="lg" fw={700}>
                {analyticsData?.platformBreakdown?.amazon?.revenue
                  ? formatCurrency(analyticsData.platformBreakdown.amazon.revenue)
                  : 'Loading...'}
              </Text>
              <Text size="xs" c="dimmed">
                {analyticsData?.platformBreakdown?.amazon?.orders || 0} orders
              </Text>
              <Text size="xs" c="green" mt={4}>
                Profit:{' '}
                {analyticsData?.platformBreakdown?.amazon?.profit
                  ? formatCurrency(analyticsData.platformBreakdown.amazon.profit)
                  : '0'}
              </Text>
            </Card>

            <Card withBorder p="sm">
              <Group justify="space-between" mb="xs">
                <Text size="sm" fw={500}>
                  Flipkart
                </Text>
                <IconBuildingStore size={16} color="blue" />
              </Group>
              <Text size="lg" fw={700}>
                {analyticsData?.platformBreakdown?.flipkart?.revenue
                  ? formatCurrency(analyticsData.platformBreakdown.flipkart.revenue)
                  : 'Loading...'}
              </Text>
              <Text size="xs" c="dimmed">
                {analyticsData?.platformBreakdown?.flipkart?.orders || 0} orders
              </Text>
              <Text size="xs" c="green" mt={4}>
                Profit:{' '}
                {analyticsData?.platformBreakdown?.flipkart?.profit
                  ? formatCurrency(analyticsData.platformBreakdown.flipkart.profit)
                  : '0'}
              </Text>
            </Card>
          </SimpleGrid>
        </Paper>

        {/* Revenue vs Cost Breakdown */}
        <Paper withBorder p="md">
          <Title order={3} mb="md">
            Revenue vs Cost Breakdown
          </Title>
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm">Total Revenue</Text>
                  <Text size="sm" fw={600}>
                    {analyticsData ? formatCurrency(analyticsData.totalRevenue) : 'Loading...'}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Cost of Goods</Text>
                  <Text size="sm" fw={600} c="red">
                    -{analyticsData ? formatCurrency(analyticsData.totalCostOfGoods) : '0'}
                  </Text>
                </Group>
                <Divider />
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    Gross Profit
                  </Text>
                  <Text size="sm" fw={700} c="green">
                    {analyticsData ? formatCurrency(analyticsData.totalProfit) : 'Loading...'}
                  </Text>
                </Group>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Box>
                <Text size="sm" mb="xs">
                  Profit Margin
                </Text>
                <Progress value={analyticsData?.grossMargin || 0} color="green" size="lg" />
                <Text size="xs" c="dimmed" mt="xs">
                  {analyticsData ? formatPercentage(analyticsData.grossMargin) : '0%'} of revenue is
                  profit
                </Text>
              </Box>
            </Grid.Col>
          </Grid>
        </Paper>

        {/* Top Products */}
        <Paper withBorder p="md">
          <Title order={3} mb="md">
            Top Performing Products
          </Title>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Product</Table.Th>
                <Table.Th>Quantity Sold</Table.Th>
                <Table.Th>Revenue</Table.Th>
                <Table.Th>Cost</Table.Th>
                <Table.Th>Profit</Table.Th>
                <Table.Th>Margin</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {analyticsData?.topProducts?.map((product, index) => (
                <Table.Tr key={index}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {product.name}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light">{product.quantity}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {formatCurrency(product.revenue)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="red">
                      {formatCurrency(product.cost)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={600} c="green">
                      {formatCurrency(product.profit)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={product.margin > 20 ? 'green' : product.margin > 10 ? 'yellow' : 'red'}
                    >
                      {formatPercentage(product.margin)}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              )) || (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text size="sm" c="dimmed" ta="center">
                      No product data available
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Paper>

        {/* Customer Metrics */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper withBorder p="md">
              <Title order={3} mb="md">
                Customer Metrics
              </Title>
              <Stack gap="md">
                <Group justify="space-between">
                  <Text size="sm">New Customers</Text>
                  <Badge color="blue" variant="light">
                    {analyticsData?.customerMetrics?.newCustomers || 0}
                  </Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Returning Customers</Text>
                  <Badge color="green" variant="light">
                    {analyticsData?.customerMetrics?.returningCustomers || 0}
                  </Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Retention Rate</Text>
                  <Text size="sm" fw={600}>
                    {analyticsData?.customerMetrics?.customerRetentionRate
                      ? formatPercentage(analyticsData.customerMetrics.customerRetentionRate)
                      : '0%'}
                  </Text>
                </Group>
              </Stack>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper withBorder p="md">
              <Title order={3} mb="md">
                Monthly Revenue Trend
              </Title>
              <Stack gap="xs">
                {analyticsData?.revenueByMonth?.slice(-6).map((month, index) => (
                  <Group key={index} justify="space-between">
                    <Text size="sm">{month.month}</Text>
                    <Group gap="xs">
                      <Text size="sm" fw={600}>
                        {formatCurrency(month.revenue)}
                      </Text>
                      <Badge size="xs" variant="light">
                        {month.orders} orders
                      </Badge>
                    </Group>
                  </Group>
                )) || (
                  <Text size="sm" c="dimmed" ta="center">
                    No monthly data available
                  </Text>
                )}
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
};

export default SalesAnalytics;
