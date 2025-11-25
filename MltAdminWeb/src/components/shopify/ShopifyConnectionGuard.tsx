import React from 'react';
import {
  Container,
  Paper,
  Stack,
  Title,
  Text,
  Button,
  Group,
  Alert,
  Loader,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconShoppingBag,
  IconSettings,
  IconAlertCircle,
  IconRefresh,
  IconShield,
  IconArrowRight,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import useShopifyConnection from '../../hooks/useShopifyConnection';

interface ShopifyConnectionGuardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

const ShopifyConnectionGuard: React.FC<ShopifyConnectionGuardProps> = ({
  children,
  title = 'Shopify Integration Required',
  description = 'Connect your Shopify store to access this feature.',
}) => {
  const navigate = useNavigate();
  const { isConnected, isLoading, hasError, error, refresh } = useShopifyConnection();

  // Show loading state
  if (isLoading) {
    return (
      <Container size="sm" py="xl">
        <Paper p="xl" withBorder radius="md">
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text>Checking Shopify connection...</Text>
          </Stack>
        </Paper>
      </Container>
    );
  }

  // Show connected state - just render children
  if (isConnected) {
    return <>{children}</>;
  }

  // Show disconnected state with guidance to Settings
  return (
    <Container size="md" py="xl">
      <Paper p="xl" withBorder radius="md">
        <Stack align="center" gap="lg">
          <IconShoppingBag size={64} color="var(--mantine-color-green-6)" />

          <Stack align="center" gap="sm">
            <Title order={2} ta="center">
              {title}
            </Title>
            <Text c="dimmed" ta="center" size="lg">
              {description}
            </Text>
          </Stack>

          {hasError && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
              <Text size="sm">
                {typeof error === 'string'
                  ? error
                  : error?.message ||
                    'Failed to connect to Shopify. Please check your connection and try again.'}
              </Text>
            </Alert>
          )}

          <Stack align="center" gap="md">
            <Text ta="center" size="sm" c="dimmed">
              To connect your Shopify store, please go to Settings where you can securely add your
              store credentials.
            </Text>

            <Group gap="sm">
              <Button
                size="lg"
                leftSection={<IconSettings size={20} />}
                rightSection={<IconArrowRight size={16} />}
                onClick={() => navigate('/settings')}
                color="green"
              >
                Go to Settings
              </Button>

              <Tooltip label="Refresh connection status">
                <ActionIcon size="lg" variant="subtle" onClick={refresh}>
                  <IconRefresh size={20} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Stack>

          {/* Security Notice */}
          <Alert icon={<IconShield size={16} />} color="blue" variant="light">
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Secure Connection
              </Text>
              <Text size="xs">
                Your Shopify credentials are encrypted and stored securely. We use industry-standard
                encryption to protect your store data.
              </Text>
            </Stack>
          </Alert>
        </Stack>
      </Paper>
    </Container>
  );
};

export default ShopifyConnectionGuard;
