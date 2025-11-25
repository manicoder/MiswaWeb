import React, { useState, useEffect } from 'react';
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
  IconPlug,
  IconAlertCircle,
  IconRefresh,
  IconShield,
  IconSettings,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useDisclosure } from '@mantine/hooks';
import { useQueryClient } from '@tanstack/react-query';
import UnifiedStoreConnection from './UnifiedStoreConnection';
import useShopifyConnection from '../../hooks/useShopifyConnection';

interface ShopifyConnectionGuardWithModalProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

const ShopifyConnectionGuardWithModal: React.FC<ShopifyConnectionGuardWithModalProps> = ({
  children,
  title = 'Shopify Integration Required',
  description = 'Connect your Shopify store to access this feature.',
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [connectionModalOpened, { open: openConnectionModal, close: closeConnectionModal }] =
    useDisclosure(false);
  const [hasManuallyClosedModal, setHasManuallyClosedModal] = useState(false);

  const { isConnected, isLoading, hasError, error, refresh } = useShopifyConnection();

  // Auto-open connection modal if not connected and not loading, and user hasn't manually closed it
  useEffect(() => {
    console.log('🔍 Connection guard state:', {
      isConnected,
      isLoading,
      connectionModalOpened,
      hasManuallyClosedModal,
    });
    if (!isLoading && !isConnected && !connectionModalOpened && !hasManuallyClosedModal) {
      console.log('🚀 Auto-opening connection modal');
      openConnectionModal();
    }
  }, [isLoading, isConnected, connectionModalOpened, hasManuallyClosedModal, openConnectionModal]);

  const handleConnectionSuccess = () => {
    console.log('✅ Connection success - refreshing status');
    closeConnectionModal();
    setHasManuallyClosedModal(false);

    // Force invalidate all connection-related queries
    queryClient.invalidateQueries({ queryKey: ['shopify', 'connection'] });
    queryClient.invalidateQueries({ queryKey: ['storeconnection'] });

    // Force a refresh of the connection status
    setTimeout(() => {
      refresh();
    }, 100);
  };

  const handleModalClose = () => {
    closeConnectionModal();
    setHasManuallyClosedModal(true);
  };

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

  // Show disconnected state with both modal and Settings options
  return (
    <>
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

            {/* Only show error alert if there's an actual connection error, not just no connection */}
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

            <Group gap="sm">
              <Button
                size="lg"
                leftSection={<IconPlug size={20} />}
                onClick={() => {
                  setHasManuallyClosedModal(false);
                  // Force invalidate queries before opening modal
                  queryClient.invalidateQueries({ queryKey: ['shopify', 'connection'] });
                  queryClient.invalidateQueries({ queryKey: ['storeconnection'] });
                  refresh();
                  openConnectionModal();
                }}
                color="green"
              >
                Connect Shopify Store
              </Button>

              <Button
                size="lg"
                variant="light"
                leftSection={<IconSettings size={20} />}
                onClick={() => navigate('/settings')}
              >
                Go to Settings
              </Button>

              <Tooltip label="Refresh connection status">
                <ActionIcon
                  size="lg"
                  variant="subtle"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['shopify', 'connection'] });
                    queryClient.invalidateQueries({ queryKey: ['storeconnection'] });
                    refresh();
                  }}
                >
                  <IconRefresh size={20} />
                </ActionIcon>
              </Tooltip>
            </Group>

            {/* Security Notice */}
            <Alert icon={<IconShield size={16} />} color="blue" variant="light">
              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  Secure Connection
                </Text>
                <Text size="xs">
                  Your Shopify credentials are encrypted and stored securely. We use
                  industry-standard encryption to protect your store data.
                </Text>
              </Stack>
            </Alert>
          </Stack>
        </Paper>
      </Container>

      {/* Unified Connection Modal */}
      <UnifiedStoreConnection
        opened={connectionModalOpened}
        onClose={handleModalClose}
        onSuccess={handleConnectionSuccess}
        platform="shopify"
        title="Connect"
      />
    </>
  );
};

export default ShopifyConnectionGuardWithModal;
