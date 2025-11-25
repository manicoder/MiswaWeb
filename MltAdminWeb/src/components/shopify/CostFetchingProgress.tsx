import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Text,
  Group,
  Button,
  Progress,
  Badge,
  Alert,
  Stack,
  Card,
  ThemeIcon,
  RingProgress,
  Center,
  Skeleton,
  Divider,
  Box,
  Timeline,
} from '@mantine/core';
import {
  IconArrowRight,
  IconSquare,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconRefresh,
  IconTrendingUp,
  IconTrendingDown,
  IconPackage,
  IconCalculator,
  IconClock,
  IconInfoCircle,
} from '@tabler/icons-react';
import { ShopifyService } from '../../services/shopifyService';
import { useCostFetching } from '../../contexts/CostFetchingContext';

interface CostStats {
  totalVariants: number;
  variantsWithCost: number;
  variantsWithoutCost: number;
  costPercentage: number;
}

const CostFetchingProgress: React.FC = () => {
  const [stats, setStats] = useState<CostStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activeProgress, startCostFetching, cancelCostFetching } = useCostFetching();

  // Load initial stats
  useEffect(() => {
    loadStats();
  }, []);

  // Reload stats when progress completes
  useEffect(() => {
    if (activeProgress?.status === 'Completed') {
      setTimeout(() => {
        loadStats();
      }, 1000);
    }
  }, [activeProgress?.status]);

  const loadStats = async () => {
    try {
      const response = await ShopifyService.getCostStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Error loading cost stats:', err);
    }
  };

  const handleStartCostFetching = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await startCostFetching();
    } catch (err) {
      setError('Error starting cost fetching');
      console.error('Error starting cost fetching:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelJob = async () => {
    try {
      await cancelCostFetching();
    } catch (err) {
      console.error('Error cancelling job:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Running':
        return <IconArrowRight size={16} />;
      case 'Completed':
        return <IconCheck size={16} />;
      case 'Failed':
        return <IconX size={16} />;
      case 'Cancelled':
        return <IconSquare size={16} />;
      default:
        return <IconInfoCircle size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Running':
        return 'blue';
      case 'Completed':
        return 'green';
      case 'Failed':
        return 'red';
      case 'Cancelled':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <div>
            <Text size="xl" fw={700} c="blue">
              Cost Fetching Dashboard
            </Text>
            <Text size="sm" c="dimmed">
              Monitor and manage product cost data synchronization
            </Text>
          </div>
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={loadStats}
            variant="light"
            size="sm"
          >
            Refresh Stats
          </Button>
        </Group>

        {/* Cost Statistics Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder padding="lg" radius="md">
              <Group justify="space-between" mb="md">
                <ThemeIcon color="blue" variant="light" size="lg">
                  <IconPackage size={20} />
                </ThemeIcon>
                <Badge color="blue" variant="light">
                  Total
                </Badge>
              </Group>
              <Text size="2xl" fw={700} c="blue">
                {stats ? stats.totalVariants.toLocaleString() : <Skeleton height={32} />}
              </Text>
              <Text size="sm" c="dimmed">
                Total Variants
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder padding="lg" radius="md">
              <Group justify="space-between" mb="md">
                <ThemeIcon color="green" variant="light" size="lg">
                  <IconTrendingUp size={20} />
                </ThemeIcon>
                <Badge color="green" variant="light">
                  With Cost
                </Badge>
              </Group>
              <Text size="2xl" fw={700} c="green">
                {stats ? stats.variantsWithCost.toLocaleString() : <Skeleton height={32} />}
              </Text>
              <Text size="sm" c="dimmed">
                Variants with Cost
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder padding="lg" radius="md">
              <Group justify="space-between" mb="md">
                <ThemeIcon color="orange" variant="light" size="lg">
                  <IconTrendingDown size={20} />
                </ThemeIcon>
                <Badge color="orange" variant="light">
                  Missing
                </Badge>
              </Group>
              <Text size="2xl" fw={700} c="orange">
                {stats ? stats.variantsWithoutCost.toLocaleString() : <Skeleton height={32} />}
              </Text>
              <Text size="sm" c="dimmed">
                Variants without Cost
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder padding="lg" radius="md">
              <Group justify="space-between" mb="md">
                <ThemeIcon color="violet" variant="light" size="lg">
                  <IconCalculator size={20} />
                </ThemeIcon>
                <Badge color="violet" variant="light">
                  Coverage
                </Badge>
              </Group>
              <Text size="2xl" fw={700} c="violet">
                {stats ? `${stats.costPercentage}%` : <Skeleton height={32} />}
              </Text>
              <Text size="sm" c="dimmed">
                Cost Coverage
              </Text>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Cost Coverage Ring Progress */}
        {stats && (
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper withBorder p="xl" radius="md">
                <Stack align="center" gap="md">
                  <Text size="lg" fw={600}>
                    Cost Coverage Overview
                  </Text>
                  <RingProgress
                    size={180}
                    thickness={16}
                    sections={[
                      {
                        value: stats.costPercentage,
                        color: 'green',
                        tooltip: `${stats.costPercentage}% with cost`,
                      },
                      {
                        value: 100 - stats.costPercentage,
                        color: 'orange',
                        tooltip: `${100 - stats.costPercentage}% without cost`,
                      },
                    ]}
                    label={
                      <Center>
                        <Text size="xl" fw={700} c="blue">
                          {stats.costPercentage}%
                        </Text>
                      </Center>
                    }
                  />
                  <Group gap="lg">
                    <Group gap="xs">
                      <Box w={12} h={12} bg="green" style={{ borderRadius: '50%' }} />
                      <Text size="sm">With Cost</Text>
                    </Group>
                    <Group gap="xs">
                      <Box w={12} h={12} bg="orange" style={{ borderRadius: '50%' }} />
                      <Text size="sm">Without Cost</Text>
                    </Group>
                  </Group>
                </Stack>
              </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper withBorder p="xl" radius="md">
                <Stack gap="md">
                  <Text size="lg" fw={600}>
                    Cost Fetching Controls
                  </Text>

                  <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
                    <Text size="sm">
                      Fetch product costs from your suppliers to calculate accurate profit margins
                      and pricing strategies.
                    </Text>
                  </Alert>

                  <Group>
                    <Button
                      leftSection={<IconArrowRight size={16} />}
                      onClick={handleStartCostFetching}
                      loading={isLoading}
                      disabled={activeProgress?.status === 'Running'}
                      color="green"
                      size="md"
                    >
                      Start Cost Fetching
                    </Button>

                    {activeProgress?.status === 'Running' && (
                      <Button
                        leftSection={<IconSquare size={16} />}
                        onClick={handleCancelJob}
                        variant="outline"
                        color="red"
                        size="md"
                      >
                        Cancel
                      </Button>
                    )}
                  </Group>

                  {error && (
                    <Alert icon={<IconAlertTriangle size={16} />} color="red" variant="light">
                      {error}
                    </Alert>
                  )}
                </Stack>
              </Paper>
            </Grid.Col>
          </Grid>
        )}

        {/* Progress Display */}
        {activeProgress && (
          <Paper withBorder p="xl" radius="md">
            <Stack gap="lg">
              <Group justify="space-between" align="center">
                <Group gap="sm">
                  <ThemeIcon
                    color={getStatusColor(activeProgress.status)}
                    variant="light"
                    size="lg"
                  >
                    {getStatusIcon(activeProgress.status)}
                  </ThemeIcon>
                  <div>
                    <Text size="lg" fw={600}>
                      Cost Fetching Progress
                    </Text>
                    <Text size="sm" c="dimmed">
                      {activeProgress.currentItem || 'Processing variants...'}
                    </Text>
                  </div>
                </Group>
                <Badge color={getStatusColor(activeProgress.status)} variant="light" size="lg">
                  {activeProgress.status}
                </Badge>
              </Group>

              <Divider />

              <Stack gap="md">
                <div>
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" fw={500}>
                      Progress
                    </Text>
                    <Text size="sm" c="dimmed">
                      {activeProgress.current} / {activeProgress.total} (
                      {activeProgress.percentage.toFixed(1)}%)
                    </Text>
                  </Group>
                  <Progress
                    value={activeProgress.percentage}
                    color={getStatusColor(activeProgress.status)}
                    size="lg"
                    radius="xl"
                    striped={activeProgress.status === 'Running'}
                    animated={activeProgress.status === 'Running'}
                  />
                </div>

                <Grid>
                  <Grid.Col span={{ base: 6, sm: 3 }}>
                    <Paper withBorder p="md" radius="md">
                      <Group gap="xs" mb="xs">
                        <ThemeIcon color="green" variant="light" size="sm">
                          <IconCheck size={14} />
                        </ThemeIcon>
                        <Text size="sm" fw={500}>
                          Updated
                        </Text>
                      </Group>
                      <Text size="xl" fw={700} c="green">
                        {activeProgress.updated}
                      </Text>
                    </Paper>
                  </Grid.Col>

                  <Grid.Col span={{ base: 6, sm: 3 }}>
                    <Paper withBorder p="md" radius="md">
                      <Group gap="xs" mb="xs">
                        <ThemeIcon color="red" variant="light" size="sm">
                          <IconX size={14} />
                        </ThemeIcon>
                        <Text size="sm" fw={500}>
                          Failed
                        </Text>
                      </Group>
                      <Text size="xl" fw={700} c="red">
                        {activeProgress.failed}
                      </Text>
                    </Paper>
                  </Grid.Col>

                  <Grid.Col span={{ base: 6, sm: 3 }}>
                    <Paper withBorder p="md" radius="md">
                      <Group gap="xs" mb="xs">
                        <ThemeIcon color="blue" variant="light" size="sm">
                          <IconPackage size={14} />
                        </ThemeIcon>
                        <Text size="sm" fw={500}>
                          Current Item
                        </Text>
                      </Group>
                      <Text size="sm" c="dimmed" lineClamp={1}>
                        {activeProgress.currentItem || 'N/A'}
                      </Text>
                    </Paper>
                  </Grid.Col>

                  <Grid.Col span={{ base: 6, sm: 3 }}>
                    <Paper withBorder p="md" radius="md">
                      <Group gap="xs" mb="xs">
                        <ThemeIcon color="gray" variant="light" size="sm">
                          <IconClock size={14} />
                        </ThemeIcon>
                        <Text size="sm" fw={500}>
                          Duration
                        </Text>
                      </Group>
                      <Text size="xl" fw={700} c="gray">
                        {formatDuration(activeProgress.duration)}
                      </Text>
                    </Paper>
                  </Grid.Col>
                </Grid>

                {activeProgress.error && (
                  <Alert icon={<IconAlertTriangle size={16} />} color="red" variant="light">
                    <Text size="sm" fw={500}>
                      Error Details
                    </Text>
                    <Text size="sm">{activeProgress.error}</Text>
                  </Alert>
                )}
              </Stack>
            </Stack>
          </Paper>
        )}

        {/* Timeline for Recent Activity */}
        {activeProgress && (
          <Paper withBorder p="xl" radius="md">
            <Text size="lg" fw={600} mb="md">
              Activity Timeline
            </Text>
            <Timeline active={1} bulletSize={24} lineWidth={2}>
              <Timeline.Item
                bullet={<IconArrowRight size={12} />}
                title="Cost Fetching Started"
                color="blue"
              >
                <Text size="sm" c="dimmed">
                  Started fetching costs for {activeProgress.total} variants
                </Text>
                <Text size="xs" c="dimmed">
                  {new Date(activeProgress.startTime).toLocaleString()}
                </Text>
              </Timeline.Item>

              {activeProgress.status === 'Running' && (
                <Timeline.Item
                  bullet={<IconArrowRight size={12} />}
                  title="Processing"
                  color="blue"
                >
                  <Text size="sm" c="dimmed">
                    Currently processing variant {activeProgress.current} of {activeProgress.total}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {activeProgress.currentItem || 'Processing...'}
                  </Text>
                </Timeline.Item>
              )}

              {['Completed', 'Failed', 'Cancelled'].includes(activeProgress.status) && (
                <Timeline.Item
                  bullet={getStatusIcon(activeProgress.status)}
                  title={`Cost Fetching ${activeProgress.status}`}
                  color={getStatusColor(activeProgress.status)}
                >
                  <Text size="sm" c="dimmed">
                    {activeProgress.status === 'Completed' &&
                      `Successfully updated ${activeProgress.updated} variants`}
                    {activeProgress.status === 'Failed' && `Failed to complete cost fetching`}
                    {activeProgress.status === 'Cancelled' && `Cost fetching was cancelled`}
                  </Text>
                  {activeProgress.endTime && (
                    <Text size="xs" c="dimmed">
                      {new Date(activeProgress.endTime).toLocaleString()}
                    </Text>
                  )}
                </Timeline.Item>
              )}
            </Timeline>
          </Paper>
        )}
      </Stack>
    </Container>
  );
};

export default CostFetchingProgress;
