import { Container, Title, Grid, Paper, Text, Group, ThemeIcon, Stack, Tabs } from '@mantine/core';
import {
  IconPackage,
  IconUsers,
  IconShoppingCart,
  IconTrendingUp,
  IconChartBar,
  IconReceipt,
  IconCurrencyRupee,
} from '@tabler/icons-react';
import Analytics from './Analytics';
import { useFinanceDashboard } from '../../../finance/hooks/useFinanceDashboard';
import CostFetchingProgress from '../../../../components/shopify/CostFetchingProgress';

const Dashboard: React.FC = () => {
  const { dashboardData, isLoading } = useFinanceDashboard({});
  const stats = [
    {
      title: 'Total Products',
      value: '2,543',
      icon: IconPackage,
      color: 'blue',
      change: '+12%',
    },
    {
      title: 'Total Customers',
      value: '1,234',
      icon: IconUsers,
      color: 'green',
      change: '+8%',
    },
    {
      title: 'Total Orders',
      value: '845',
      icon: IconShoppingCart,
      color: 'orange',
      change: '+23%',
    },
    {
      title: 'Revenue',
      value: '$1',
      icon: IconTrendingUp,
      color: 'violet',
      change: '+15%',
    },
  ];

  return (
    <Container size="xl" py="md">
      <Title order={1} mb="lg">
        Dashboard
      </Title>

      <Tabs defaultValue="overview" mb="xl">
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconPackage size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="analytics" leftSection={<IconChartBar size={16} />}>
            Analytics
          </Tabs.Tab>
          <Tabs.Tab value="cost-fetching" leftSection={<IconCurrencyRupee size={16} />}>
            Cost Fetching
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <Grid mb="xl">
            {stats.map((stat, index) => (
              <Grid.Col key={index} span={{ base: 12, sm: 6, lg: 3 }}>
                <Paper withBorder p="md" radius="md">
                  <Group justify="space-between">
                    <div>
                      <Text c="dimmed" tt="uppercase" fw={700} fz="xs">
                        {stat.title}
                      </Text>
                      <Text fw={700} fz="xl">
                        {stat.value}
                      </Text>
                      <Text c="green" fz="sm" fw={500}>
                        {stat.change} from last month
                      </Text>
                    </div>
                    <ThemeIcon color={stat.color} variant="light" size="lg">
                      <stat.icon size={20} />
                    </ThemeIcon>
                  </Group>
                </Paper>
              </Grid.Col>
            ))}
          </Grid>

          <Paper withBorder p="xl" radius="md">
            <Stack align="center" gap="md">
              <Title order={2}>Welcome to MLT Admin</Title>
              <Text size="lg" c="dimmed" ta="center" maw={600}>
                This is your admin dashboard where you can manage products, customers, orders, and
                inventory. Navigate using the sidebar to explore different features.
              </Text>
              <Text size="sm" c="dimmed">
                More dashboard features will be implemented based on your requirements.
              </Text>
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="analytics" pt="md">
          <Analytics />
          <Grid mb="xl">
            <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
              <Paper withBorder p="md" radius="md">
                <Group justify="space-between">
                  <div>
                    <Text c="dimmed" tt="uppercase" fw={700} fz="xs">
                      Total Expenses
                    </Text>
                    <Text fw={700} fz="xl">
                      {isLoading
                        ? 'Loading...'
                        : new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            minimumFractionDigits: 0,
                          }).format(dashboardData?.TotalExpenses || 0)}
                    </Text>
                    <Text c="red" fz="sm" fw={500}>
                      {/* Placeholder for change, e.g., '+5% from last month' */}
                    </Text>
                  </div>
                  <ThemeIcon color="red" variant="light" size="lg">
                    <IconReceipt size={20} />
                  </ThemeIcon>
                </Group>
              </Paper>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="cost-fetching" pt="md">
          <CostFetchingProgress />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
};

export default Dashboard;
