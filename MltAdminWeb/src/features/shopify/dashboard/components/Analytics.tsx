import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Title,
  Grid,
  Paper,
  Text,
  Group,
  ThemeIcon,
  Stack,
  Select,
  Button,
  Center,
  Alert,
  Loader,
} from '@mantine/core';
import {
  IconPackage,
  IconCalculator,
  IconTrendingUp,
  IconRefresh,
  IconAlertCircle,
  IconPlug,
} from '@tabler/icons-react';
import { api, API_ENDPOINTS } from '../../../../services/api';
import useShopifyConnection from '../../../../hooks/useShopifyConnection';

interface AnalyticsData {
  productCount: number;
  totalProducts: number;
  totalCostMaxValue: number;
  totalCostPerItem: number;
  totalCostPrice: number;
  variantsWithCost: number;
  variantsWithoutCost: number;
  costPercentage: number;
  averagePrice: number;
  averageCost: number;
  profitMargin: number;
}

const Analytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [currency, setCurrency] = useState('INR');

  // Get connection status
  const { isConnected, isLoading: isCheckingConnection } = useShopifyConnection();

  const fetchAnalyticsData = useCallback(async () => {
    // Don't fetch if not connected
    if (!isConnected) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch analytics data from the new backend endpoint
      const response = await api.get(API_ENDPOINTS.SHOPIFY_DASHBOARD_ANALYTICS);
      const responseData = response.data as {
        success: boolean;
        data: AnalyticsData;
        error?: string;
      };

      if (!responseData.success) {
        throw new Error(responseData.error || 'Failed to fetch analytics data');
      }

      setAnalyticsData(responseData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  }, [isConnected]);

  useEffect(() => {
    // Only fetch data if connected
    if (isConnected) {
      fetchAnalyticsData();
    } else {
      setLoading(false);
    }
  }, [timeRange, currency, isConnected, fetchAnalyticsData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const AnalyticsContent = () => {
    // Show loading state while checking connection
    if (isCheckingConnection) {
      return (
        <Container size="xl" py="md">
          <Center style={{ height: '400px' }}>
            <Stack align="center" gap="md">
              <Loader size="lg" />
              <Text>Checking Shopify connection...</Text>
            </Stack>
          </Center>
        </Container>
      );
    }

    // Show no connection message instead of error
    if (!isConnected) {
      return (
        <Container size="xl" py="md">
          <Center style={{ height: '400px' }}>
            <Stack align="center" gap="md">
              <IconPlug size={64} color="var(--mantine-color-gray-4)" />
              <Title order={2} ta="center" c="dimmed">
                No Shopify Connection
              </Title>
              <Text c="dimmed" ta="center" size="lg">
                Connect your Shopify store to view analytics and cost data.
              </Text>
            </Stack>
          </Center>
        </Container>
      );
    }

    if (loading) {
      return (
        <Container size="xl" py="md">
          <Center style={{ height: '400px' }}>
            <Stack align="center" gap="md">
              <Loader size="lg" />
              <Text>Loading analytics data...</Text>
            </Stack>
          </Center>
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

    return (
      <Container size="xl" py="md">
        <Group justify="space-between" mb="lg">
          <Title order={1}>Analytics</Title>
          <Group>
            <Select
              value={timeRange}
              onChange={(value) => setTimeRange(value || '30d')}
              data={[
                { value: '7d', label: 'Last 7 days' },
                { value: '30d', label: 'Last 30 days' },
                { value: '90d', label: 'Last 90 days' },
                { value: '1y', label: 'Last year' },
              ]}
              size="sm"
            />
            <Select
              value={currency}
              onChange={(value) => setCurrency(value || 'INR')}
              data={[
                { value: 'INR', label: 'INR' },
                { value: 'USD', label: 'USD' },
                { value: 'EUR', label: 'EUR' },
              ]}
              size="sm"
            />
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={fetchAnalyticsData}
              size="sm"
              variant="light"
            >
              Refresh
            </Button>
          </Group>
        </Group>

        {analyticsData && (
          <>
            {/* Key Metrics */}
            <Grid mb="xl">
              <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                <Paper withBorder p="md" radius="md">
                  <Group justify="space-between">
                    <div>
                      <Text c="dimmed" tt="uppercase" fw={700} fz="xs">
                        Total Products
                      </Text>
                      <Text fw={700} fz="xl">
                        {formatNumber(analyticsData.productCount)}
                      </Text>
                      <Text c="blue" fz="sm" fw={500}>
                        All products in store
                      </Text>
                    </div>
                    <ThemeIcon color="blue" variant="light" size="lg">
                      <IconPackage size={20} />
                    </ThemeIcon>
                  </Group>
                </Paper>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                <Paper withBorder p="md" radius="md">
                  <Group justify="space-between">
                    <div>
                      <Text c="dimmed" tt="uppercase" fw={700} fz="xs">
                        Total Cost (Max Value)
                      </Text>
                      <Text fw={700} fz="xl">
                        {formatCurrency(analyticsData.totalCostMaxValue)}
                      </Text>
                      <Text c="green" fz="sm" fw={500}>
                        Based on maximum value
                      </Text>
                    </div>
                    <ThemeIcon color="green" variant="light" size="lg">
                      <IconCalculator size={20} />
                    </ThemeIcon>
                  </Group>
                </Paper>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                <Paper withBorder p="md" radius="md">
                  <Group justify="space-between">
                    <div>
                      <Text c="dimmed" tt="uppercase" fw={700} fz="xs">
                        Total Cost (Per Item)
                      </Text>
                      <Text fw={700} fz="xl">
                        {formatCurrency(analyticsData.totalCostPerItem)}
                      </Text>
                      <Text c="orange" fz="sm" fw={500}>
                        Based on cost per item
                      </Text>
                    </div>
                    <ThemeIcon color="orange" variant="light" size="lg">
                      <IconTrendingUp size={20} />
                    </ThemeIcon>
                  </Group>
                </Paper>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                <Paper withBorder p="md" radius="md">
                  <Group justify="space-between">
                    <div>
                      <Text c="dimmed" tt="uppercase" fw={700} fz="xs">
                        Total Cost (Price)
                      </Text>
                      <Text fw={700} fz="xl">
                        {formatCurrency(analyticsData.totalCostPrice)}
                      </Text>
                      <Text c="violet" fz="sm" fw={500}>
                        Based on price
                      </Text>
                    </div>
                    <ThemeIcon color="violet" variant="light" size="lg">
                      <IconTrendingUp size={20} />
                    </ThemeIcon>
                  </Group>
                </Paper>
              </Grid.Col>
            </Grid>

            {/* Additional Metrics */}
            <Grid mb="xl">
              <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                <Paper withBorder p="md" radius="md">
                  <Group justify="space-between">
                    <div>
                      <Text c="dimmed" tt="uppercase" fw={700} fz="xs">
                        Variants with Cost
                      </Text>
                      <Text fw={700} fz="xl">
                        {formatNumber(analyticsData.variantsWithCost)}
                      </Text>
                      <Text c="green" fz="sm" fw={500}>
                        {analyticsData.costPercentage.toFixed(1)}% of total
                      </Text>
                    </div>
                    <ThemeIcon color="green" variant="light" size="lg">
                      <IconCalculator size={20} />
                    </ThemeIcon>
                  </Group>
                </Paper>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                <Paper withBorder p="md" radius="md">
                  <Group justify="space-between">
                    <div>
                      <Text c="dimmed" tt="uppercase" fw={700} fz="xs">
                        Variants without Cost
                      </Text>
                      <Text fw={700} fz="xl">
                        {formatNumber(analyticsData.variantsWithoutCost)}
                      </Text>
                      <Text c="red" fz="sm" fw={500}>
                        Need cost data
                      </Text>
                    </div>
                    <ThemeIcon color="red" variant="light" size="lg">
                      <IconAlertCircle size={20} />
                    </ThemeIcon>
                  </Group>
                </Paper>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                <Paper withBorder p="md" radius="md">
                  <Group justify="space-between">
                    <div>
                      <Text c="dimmed" tt="uppercase" fw={700} fz="xs">
                        Average Price
                      </Text>
                      <Text fw={700} fz="xl">
                        {formatCurrency(analyticsData.averagePrice)}
                      </Text>
                      <Text c="blue" fz="sm" fw={500}>
                        Per variant
                      </Text>
                    </div>
                    <ThemeIcon color="blue" variant="light" size="lg">
                      <IconTrendingUp size={20} />
                    </ThemeIcon>
                  </Group>
                </Paper>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                <Paper withBorder p="md" radius="md">
                  <Group justify="space-between">
                    <div>
                      <Text c="dimmed" tt="uppercase" fw={700} fz="xs">
                        Average Cost
                      </Text>
                      <Text fw={700} fz="xl">
                        {formatCurrency(analyticsData.averageCost)}
                      </Text>
                      <Text c="orange" fz="sm" fw={500}>
                        Per variant
                      </Text>
                    </div>
                    <ThemeIcon color="orange" variant="light" size="lg">
                      <IconCalculator size={20} />
                    </ThemeIcon>
                  </Group>
                </Paper>
              </Grid.Col>
            </Grid>

            {/* Profit Margin */}
            <Paper withBorder p="xl" radius="md" mb="xl">
              <Stack align="center" gap="md">
                <Title order={2}>Profit Margin</Title>
                <Text fw={700} fz="3xl" c={analyticsData.profitMargin >= 0 ? 'green' : 'red'}>
                  {analyticsData.profitMargin.toFixed(2)}%
                </Text>
                <Text c="dimmed" ta="center">
                  Based on average price vs average cost
                </Text>
              </Stack>
            </Paper>
          </>
        )}
      </Container>
    );
  };

  return <AnalyticsContent />;
};

export default Analytics;
