import React from 'react';
import { Container, Title, Grid, Card, Text, Group, Stack, Badge } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconDashboard,
  IconPackage,
  IconUsers,
  IconShoppingCart,
  IconTrendingUp,
} from '@tabler/icons-react';
import PlatformIcon from '../../../components/common/PlatformIcon';
import {
  getResponsivePadding,
  getResponsiveSectionMargin,
  getResponsiveStackGap,
  getResponsiveGroupGap,
  getResponsiveTitleSize,
  getResponsiveTitleOrder,
  getResponsiveTitleIconSize,
  getResponsiveSmallIconSize,
  getResponsiveTextSize,
  getResponsiveCaptionSize,
  getResponsiveCardPadding,
} from '../../../constants/mobileDesignSystem';

const Dashboard: React.FC = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');

  // Mock data - will be replaced with real data later
  const platformStats = [
    {
      name: 'Shopify',
      color: 'green',
      status: 'active',
      stats: {
        products: 248,
        customers: 1432,
        orders: 89,
        revenue: '$1',
      },
    },
    {
      name: 'Amazon',
      color: 'orange',
      status: 'beta',
      stats: {
        products: 0,
        customers: 0,
        orders: 0,
        revenue: '$0',
      },
    },
    {
      name: 'Flipkart',
      color: 'yellow',
      status: 'beta',
      stats: {
        products: 0,
        customers: 0,
        orders: 0,
        revenue: '₹0',
      },
    },
  ];

  return (
    <Container
      size="xl"
      px={getResponsivePadding(isMobile)}
      py={getResponsivePadding(isMobile)}
      style={{ width: '100%', maxWidth: '100%' }}
    >
      {/* Header */}
      <Stack mb={getResponsiveSectionMargin(isMobile)} gap={getResponsiveStackGap(isMobile)}>
        <Group justify="space-between" align={isMobile ? 'flex-start' : 'center'} wrap="wrap">
          <Group gap={getResponsiveGroupGap(isMobile)}>
            <IconDashboard
              size={getResponsiveTitleIconSize(isMobile)}
              color="var(--mantine-color-blue-6)"
            />
            <Title
              order={getResponsiveTitleOrder(isMobile)}
              size={getResponsiveTitleSize(isMobile)}
            >
              Overview Dashboard
            </Title>
          </Group>
        </Group>

        <Text
          c="dimmed"
          size={getResponsiveTextSize(isMobile)}
          style={{ textAlign: isMobile ? 'center' : 'left' }}
        >
          Welcome to your multi-platform e-commerce dashboard. Here's an overview of all your
          connected platforms.
        </Text>
      </Stack>

      {/* Platform Cards */}
      <Grid gutter={isMobile ? 'md' : 'lg'}>
        {platformStats.map((platform) => (
          <Grid.Col
            key={platform.name}
            span={{
              base: 12, // Full width on mobile
              xs: 12, // Full width on extra small
              sm: 6, // Half width on small screens
              md: 6, // Half width on medium screens
              lg: 4, // Third width on large screens
            }}
          >
            <Card
              shadow="sm"
              padding={getResponsiveCardPadding(isMobile)}
              radius="md"
              withBorder
              style={{
                height: '100%',
                transition: 'all 0.2s ease',
              }}
            >
              <Group
                justify="space-between"
                mb={getResponsiveStackGap(isMobile)}
                align="flex-start"
                wrap="wrap"
              >
                <Group gap={getResponsiveGroupGap(isMobile)}>
                  <div
                    style={{
                      width: isMobile ? 32 : 40,
                      height: isMobile ? 32 : 40,
                      borderRadius: 'var(--mantine-radius-md)',
                      padding: 4,
                      backgroundColor: `var(--mantine-color-${platform.color}-0)`,
                      border: `2px solid var(--mantine-color-${platform.color}-2)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <PlatformIcon platform={platform.name} size={isMobile ? 20 : 24} />
                  </div>
                  <div>
                    <Text
                      fw={500}
                      size={getResponsiveTextSize(isMobile)}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {platform.name}
                    </Text>
                    {platform.status && (
                      <Badge
                        size="xs"
                        variant="light"
                        color={platform.status === 'active' ? 'green' : 'orange'}
                        mt={2}
                      >
                        {platform.status === 'active'
                          ? 'Active'
                          : platform.status === 'beta'
                            ? 'Beta'
                            : 'Coming Soon'}
                      </Badge>
                    )}
                  </div>
                </Group>
              </Group>

              <Stack gap={getResponsiveStackGap(isMobile)}>
                <Group justify="space-between">
                  <Group gap="xs">
                    <IconPackage
                      size={getResponsiveSmallIconSize(isMobile)}
                      color="var(--mantine-color-gray-6)"
                    />
                    <Text size={getResponsiveCaptionSize(isMobile)} c="dimmed">
                      Products
                    </Text>
                  </Group>
                  <Text size={getResponsiveCaptionSize(isMobile)} fw={500}>
                    {platform.stats.products.toLocaleString()}
                  </Text>
                </Group>

                <Group justify="space-between">
                  <Group gap="xs">
                    <IconUsers
                      size={getResponsiveSmallIconSize(isMobile)}
                      color="var(--mantine-color-gray-6)"
                    />
                    <Text size={getResponsiveCaptionSize(isMobile)} c="dimmed">
                      Customers
                    </Text>
                  </Group>
                  <Text size={getResponsiveCaptionSize(isMobile)} fw={500}>
                    {platform.stats.customers.toLocaleString()}
                  </Text>
                </Group>

                <Group justify="space-between">
                  <Group gap="xs">
                    <IconShoppingCart
                      size={getResponsiveSmallIconSize(isMobile)}
                      color="var(--mantine-color-gray-6)"
                    />
                    <Text size={getResponsiveCaptionSize(isMobile)} c="dimmed">
                      Orders
                    </Text>
                  </Group>
                  <Text size={getResponsiveCaptionSize(isMobile)} fw={500}>
                    {platform.stats.orders.toLocaleString()}
                  </Text>
                </Group>

                <Group justify="space-between">
                  <Group gap="xs">
                    <IconTrendingUp
                      size={getResponsiveSmallIconSize(isMobile)}
                      color="var(--mantine-color-gray-6)"
                    />
                    <Text size={getResponsiveCaptionSize(isMobile)} c="dimmed">
                      Revenue
                    </Text>
                  </Group>
                  <Text size={getResponsiveCaptionSize(isMobile)} fw={500}>
                    {platform.stats.revenue}
                  </Text>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>
        ))}
      </Grid>

      {/* Info Card */}
      <Card
        shadow="sm"
        padding={getResponsiveCardPadding(isMobile)}
        radius="md"
        withBorder
        mt={getResponsiveSectionMargin(isMobile)}
        style={{ transition: 'all 0.2s ease' }}
      >
        <Text
          ta="center"
          size={getResponsiveTextSize(isMobile)}
          fw={500}
          mb={getResponsiveStackGap(isMobile)}
        >
          Multi-Platform Overview
        </Text>

        <Text
          ta="center"
          c="dimmed"
          size={getResponsiveCaptionSize(isMobile)}
          style={{
            lineHeight: isMobile ? 1.4 : 1.5,
            maxWidth: isTablet ? '100%' : '80%',
            margin: '0 auto',
          }}
        >
          This dashboard provides a unified view of all your e-commerce platforms. You can customize
          what information appears here based on your needs.
        </Text>
      </Card>
    </Container>
  );
};

export default Dashboard;
