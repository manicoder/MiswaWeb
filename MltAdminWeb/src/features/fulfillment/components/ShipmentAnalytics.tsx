import React, { useState, useEffect, useCallback } from 'react';
import {
  Stack,
  Text,
  Grid,
  Card,
  Group,
  Badge,
  Button,
  Select,
  Title,
  SimpleGrid,
  Progress,
  Divider,
  ActionIcon,
  Alert,
  Table,
  ScrollArea,
} from '@mantine/core';
// Note: Date picker functionality simplified to avoid compatibility issues
import {
  IconChartLine,
  IconPackage,
  IconBuildingWarehouse,
  IconCheck,
  IconRefresh,
  IconTrendingUp,
  IconArrowUp,
  IconArrowDown,
} from '@tabler/icons-react';
import { warehouseShipmentService } from '../../../services/warehouseShipmentService';

interface AnalyticsData {
  overview: {
    totalShipments: number;
    totalItems: number;
    totalValue: number;
    currency: string;
  };
  statusBreakdown: {
    draft: number;
    created: number;
    dispatched: number;
    received: number;
    completed: number;
  };
  trends: {
    shipmentsThisMonth: number;
    shipmentsLastMonth: number;
    itemsThisMonth: number;
    itemsLastMonth: number;
    valueThisMonth: number;
    valueLastMonth: number;
  };
  topProducts: Array<{
    productTitle: string;
    variantTitle?: string;
    totalQuantity: number;
    totalValue: number;
    currency: string;
  }>;
  recentActivity: Array<{
    shipmentNumber: string;
    status: string;
    updatedAt: string;
    updatedBy: string;
    itemCount: number;
  }>;
  performanceMetrics: {
    avgDispatchTime: number; // hours
    avgReceiveTime: number; // hours
    completionRate: number; // percentage
    accuracyRate: number; // percentage
  };
}

const ShipmentAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    new Date(),
  ]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [startDate, endDate] = dateRange;
      const params = {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      };
      const response = await warehouseShipmentService.getAnalytics(params);

      if (response.success) {
        setAnalytics(response.data as unknown as AnalyticsData);
      } else {
        setError(response.error || 'Failed to load analytics');
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handlePeriodChange = (period: string | null) => {
    if (!period) return;

    setSelectedPeriod(period);
    const days = parseInt(period);
    const endDate = new Date();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    setDateRange([startDate, endDate]);
  };

  const calculateTrend = (
    current: number,
    previous: number,
  ): { value: number; isPositive: boolean } => {
    if (previous === 0) return { value: 0, isPositive: true };
    const change = ((current - previous) / previous) * 100;
    return { value: Math.abs(change), isPositive: change >= 0 };
  };

  const renderOverviewCards = () => {
    if (!analytics) return null;

    const { overview, trends, performanceMetrics } = analytics;

    const shipmentsTrend = calculateTrend(
      trends?.shipmentsThisMonth || 0,
      trends?.shipmentsLastMonth || 0,
    );
    const itemsTrend = calculateTrend(trends?.itemsThisMonth || 0, trends?.itemsLastMonth || 0);
    const valueTrend = calculateTrend(trends?.valueThisMonth || 0, trends?.valueLastMonth || 0);

    return (
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <Card withBorder p="md">
          <Group justify="space-between">
            <div>
              <Text c="dimmed" size="sm" fw={500}>
                Total Shipments
              </Text>
              <Text fw={700} size="xl">
                {(overview?.totalShipments || 0).toLocaleString()}
              </Text>
            </div>
            <ActionIcon size="lg" radius="md" color="blue" variant="filled">
              <IconPackage size={18} />
            </ActionIcon>
          </Group>
          <Group gap="xs" mt="xs">
            {shipmentsTrend.isPositive ? (
              <IconArrowUp size={14} color="var(--mantine-color-green-6)" />
            ) : (
              <IconArrowDown size={14} color="var(--mantine-color-red-6)" />
            )}
            <Text size="xs" c={shipmentsTrend.isPositive ? 'green' : 'red'} fw={500}>
              {shipmentsTrend.value.toFixed(1)}%
            </Text>
            <Text size="xs" c="dimmed">
              vs last month
            </Text>
          </Group>
        </Card>

        <Card withBorder p="md">
          <Group justify="space-between">
            <div>
              <Text c="dimmed" size="sm" fw={500}>
                Total Items
              </Text>
              <Text fw={700} size="xl">
                {(overview?.totalItems || 0).toLocaleString()}
              </Text>
            </div>
            <ActionIcon size="lg" radius="md" color="green" variant="filled">
              <IconBuildingWarehouse size={18} />
            </ActionIcon>
          </Group>
          <Group gap="xs" mt="xs">
            {itemsTrend.isPositive ? (
              <IconArrowUp size={14} color="var(--mantine-color-green-6)" />
            ) : (
              <IconArrowDown size={14} color="var(--mantine-color-red-6)" />
            )}
            <Text size="xs" c={itemsTrend.isPositive ? 'green' : 'red'} fw={500}>
              {itemsTrend.value.toFixed(1)}%
            </Text>
            <Text size="xs" c="dimmed">
              vs last month
            </Text>
          </Group>
        </Card>

        <Card withBorder p="md">
          <Group justify="space-between">
            <div>
              <Text c="dimmed" size="sm" fw={500}>
                Total Value
              </Text>
              <Text fw={700} size="xl">
                {overview?.currency || '₹'} {(overview?.totalValue || 0).toLocaleString()}
              </Text>
            </div>
            <ActionIcon size="lg" radius="md" color="orange" variant="filled">
              <IconTrendingUp size={18} />
            </ActionIcon>
          </Group>
          <Group gap="xs" mt="xs">
            {valueTrend.isPositive ? (
              <IconArrowUp size={14} color="var(--mantine-color-green-6)" />
            ) : (
              <IconArrowDown size={14} color="var(--mantine-color-red-6)" />
            )}
            <Text size="xs" c={valueTrend.isPositive ? 'green' : 'red'} fw={500}>
              {valueTrend.value.toFixed(1)}%
            </Text>
            <Text size="xs" c="dimmed">
              vs last month
            </Text>
          </Group>
        </Card>

        <Card withBorder p="md">
          <Group justify="space-between">
            <div>
              <Text c="dimmed" size="sm" fw={500}>
                Completion Rate
              </Text>
              <Text fw={700} size="xl">
                {(performanceMetrics?.completionRate || 0).toFixed(1)}%
              </Text>
            </div>
            <ActionIcon size="lg" radius="md" color="teal" variant="filled">
              <IconCheck size={18} />
            </ActionIcon>
          </Group>
          <Progress
            value={performanceMetrics?.completionRate || 0}
            color="teal"
            size="sm"
            mt="xs"
          />
        </Card>
      </SimpleGrid>
    );
  };

  const renderStatusBreakdown = () => {
    if (!analytics) return null;

    const { statusBreakdown } = analytics;
    const total = Object.values(statusBreakdown || {}).reduce((sum, count) => sum + count, 0);

    const statusConfig = [
      { key: 'draft', label: 'Draft', color: 'gray' },
      { key: 'created', label: 'Created', color: 'blue' },
      { key: 'dispatched', label: 'Dispatched', color: 'orange' },
      { key: 'received', label: 'Received', color: 'green' },
      { key: 'completed', label: 'Completed', color: 'teal' },
    ];

    return (
      <Card withBorder>
        <Card.Section p="md" withBorder>
          <Group justify="space-between">
            <Title order={4}>Status Breakdown</Title>
            <Badge variant="light">{total} total</Badge>
          </Group>
        </Card.Section>

        <Card.Section p="md">
          <Stack gap="sm">
            {statusConfig.map(({ key, label, color }) => {
              const count = statusBreakdown?.[key as keyof typeof statusBreakdown] || 0;
              const percentage = total > 0 ? (count / total) * 100 : 0;

              return (
                <div key={key}>
                  <Group justify="space-between" mb={4}>
                    <Text size="sm" fw={500}>
                      {label}
                    </Text>
                    <Group gap="xs">
                      <Text size="sm">{count}</Text>
                      <Text size="xs" c="dimmed">
                        ({percentage.toFixed(1)}%)
                      </Text>
                    </Group>
                  </Group>
                  <Progress value={percentage} color={color} size="sm" />
                </div>
              );
            })}
          </Stack>
        </Card.Section>
      </Card>
    );
  };

  const renderPerformanceMetrics = () => {
    if (!analytics) return null;

    const { performanceMetrics } = analytics;

    return (
      <Card withBorder>
        <Card.Section p="md" withBorder>
          <Title order={4}>Performance Metrics</Title>
        </Card.Section>

        <Card.Section p="md">
          <SimpleGrid cols={2}>
            <div>
              <Text c="dimmed" size="sm">
                Avg Dispatch Time
              </Text>
              <Text fw={700} size="lg">
                {(performanceMetrics?.avgDispatchTime || 0).toFixed(1)}h
              </Text>
            </div>
            <div>
              <Text c="dimmed" size="sm">
                Avg Receive Time
              </Text>
              <Text fw={700} size="lg">
                {(performanceMetrics?.avgReceiveTime || 0).toFixed(1)}h
              </Text>
            </div>
            <div>
              <Text c="dimmed" size="sm">
                Completion Rate
              </Text>
              <Text fw={700} size="lg">
                {(performanceMetrics?.completionRate || 0).toFixed(1)}%
              </Text>
            </div>
            <div>
              <Text c="dimmed" size="sm">
                Accuracy Rate
              </Text>
              <Text fw={700} size="lg">
                {(performanceMetrics?.accuracyRate || 0).toFixed(1)}%
              </Text>
            </div>
          </SimpleGrid>
        </Card.Section>
      </Card>
    );
  };

  const renderTopProducts = () => {
    if (!analytics || !analytics.topProducts?.length) return null;

    return (
      <Card withBorder>
        <Card.Section p="md" withBorder>
          <Title order={4}>Top Products</Title>
        </Card.Section>

        <Card.Section>
          <ScrollArea>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Product</Table.Th>
                  <Table.Th>Quantity</Table.Th>
                  <Table.Th>Value</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {analytics.topProducts.map((product, index) => (
                  <Table.Tr key={index}>
                    <Table.Td>
                      <div>
                        <Text size="sm" fw={500} lineClamp={1}>
                          {product.productTitle}
                        </Text>
                        {product.variantTitle && (
                          <Text size="xs" c="dimmed">
                            {product.variantTitle}
                          </Text>
                        )}
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{product.totalQuantity}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {product.currency} {product.totalValue.toLocaleString()}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Card.Section>
      </Card>
    );
  };

  const renderRecentActivity = () => {
    if (!analytics || !analytics.recentActivity?.length) return null;

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'draft':
          return 'gray';
        case 'created':
          return 'blue';
        case 'dispatched':
          return 'orange';
        case 'received':
          return 'green';
        case 'completed':
          return 'teal';
        default:
          return 'gray';
      }
    };

    return (
      <Card withBorder>
        <Card.Section p="md" withBorder>
          <Title order={4}>Recent Activity</Title>
        </Card.Section>

        <Card.Section>
          <ScrollArea>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Shipment</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Items</Table.Th>
                  <Table.Th>Updated</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {analytics.recentActivity.map((activity, index) => (
                  <Table.Tr key={index}>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {activity.shipmentNumber}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(activity.status)} size="sm">
                        {activity.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{activity.itemCount}</Text>
                    </Table.Td>
                    <Table.Td>
                      <div>
                        <Text size="sm">{new Date(activity.updatedAt).toLocaleDateString()}</Text>
                        <Text size="xs" c="dimmed">
                          by {activity.updatedBy}
                        </Text>
                      </div>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Card.Section>
      </Card>
    );
  };

  if (loading) {
    return (
      <Stack gap="md">
        <Card withBorder p="xl">
          <Stack align="center" gap="md">
            <Text size="lg" fw={500}>
              Loading analytics...
            </Text>
            <Text size="sm" c="dimmed">
              Please wait while we fetch your shipment data
            </Text>
          </Stack>
        </Card>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack gap="md">
        <Alert color="red" title="Error Loading Analytics">
          <Text size="sm">{error}</Text>
          <Button
            variant="light"
            size="sm"
            mt="md"
            onClick={loadAnalytics}
            leftSection={<IconRefresh size={14} />}
          >
            Try Again
          </Button>
        </Alert>
      </Stack>
    );
  }

  if (!analytics) {
    return (
      <Stack gap="md">
        <Alert color="blue" title="No Analytics Data">
          <Text size="sm">
            No analytics data is available. This could be because there are no shipments yet, or the
            analytics service is not configured.
          </Text>
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="md" pos="relative">
      {/* Header */}
      <Group justify="space-between">
        <Title order={3}>
          <Group gap="xs">
            <IconChartLine size={24} />
            Analytics & Reporting
          </Group>
        </Title>

        <Group gap="sm">
          <Select
            placeholder="Select period"
            value={selectedPeriod}
            onChange={handlePeriodChange}
            data={[
              { value: '7', label: 'Last 7 days' },
              { value: '30', label: 'Last 30 days' },
              { value: '90', label: 'Last 90 days' },
              { value: '365', label: 'Last year' },
            ]}
            w={150}
          />

          <ActionIcon variant="light" onClick={loadAnalytics} loading={loading}>
            <IconRefresh size={16} />
          </ActionIcon>
        </Group>
      </Group>

      {/* Date Range - Currently using preset periods */}
      <Text size="sm" c="dimmed">
        Showing data for: {selectedPeriod} days
      </Text>

      <Divider />

      {/* Overview Cards */}
      {renderOverviewCards()}

      {/* Charts and Breakdowns */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>{renderStatusBreakdown()}</Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>{renderPerformanceMetrics()}</Grid.Col>
      </Grid>

      {/* Detailed Tables */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>{renderTopProducts()}</Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>{renderRecentActivity()}</Grid.Col>
      </Grid>
    </Stack>
  );
};

export default ShipmentAnalytics;
