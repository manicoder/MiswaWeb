import React, { useState } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  PasswordInput,
  Button,
  Text,
  Alert,
  Group,
  Paper,
  Title,
  List,
  Anchor,
  Divider,
  Badge,
} from '@mantine/core';
import {
  IconShoppingBag,
  IconKey,
  IconAlertCircle,
  IconCheck,
  IconExternalLink,
  IconInfoCircle,
  IconShield,
  IconLock,
  IconDatabase,
  IconBolt,
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import ShopifyService from '../../services/shopifyService';
import type { ShopifyStoreConnection } from '../../types/shopify';

interface StoreConnectionProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const StoreConnection: React.FC<StoreConnectionProps> = ({ opened, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const form = useForm<ShopifyStoreConnection>({
    initialValues: {
      storeName: '',
      accessToken: '',
      shopDomain: '',
    },
    validate: {
      storeName: (value: string) => {
        if (!value) return 'Store name is required';
        if (!ShopifyService.validateStoreName(value)) {
          return 'Invalid store name format. Use lowercase letters, numbers, and hyphens only.';
        }
        return null;
      },
      accessToken: (value: string) => {
        if (!value) return 'Access token is required';
        if (!ShopifyService.validateAccessToken(value)) {
          return 'Invalid access token format. Should start with "shpat_" followed by alphanumeric characters.';
        }
        return null;
      },
    },
  });

  const handleSubmit = async (values: ShopifyStoreConnection) => {
    setLoading(true);
    try {
      // Generate shop domain if not provided
      const shopDomain = values.shopDomain || ShopifyService.generateShopDomain(values.storeName);

      const connectionData = {
        ...values,
        shopDomain,
      };

      const response = await ShopifyService.connectStore(connectionData);

      if (response.success) {
        notifications.show({
          title: 'Store Connected Successfully',
          message: `Your Shopify store "${values.storeName}" has been connected securely. App will refresh in a moment...`,
          color: 'green',
          icon: <IconCheck size={16} />,
        });

        form.reset();
        onSuccess();
        onClose();
      } else {
        console.error('Connection failed - API response:', response);
        throw new Error(response.error || response.message || 'Failed to connect store');
      }
    } catch (error: unknown) {
      console.error('Full connection error:', error);
      console.error('Error response:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error data:', error instanceof Error ? error.cause : 'Unknown cause');

      let errorMessage = 'Failed to connect to Shopify store. Please check your credentials.';

      // Provide more specific error messages
      if (error instanceof Error && error.message?.includes('invalid start of a value')) {
        errorMessage =
          'Store not found. Please verify your store name exists and is spelled correctly.';
      } else if (
        error instanceof Error &&
        error.message?.includes('Sorry, this shop is currently unavailable')
      ) {
        errorMessage = 'Store not found or unavailable. Please check your store name.';
      } else if (
        error instanceof Error &&
        (error.message?.includes('401') || error.message?.includes('Unauthorized'))
      ) {
        errorMessage = 'Invalid access token. Please check your private app credentials.';
      } else if (
        error instanceof Error &&
        (error.message?.includes('404') || error.message?.includes('Not Found'))
      ) {
        errorMessage = 'Store not found. Please check your store name.';
      } else if (
        error instanceof Error &&
        (error.message?.includes('403') || error.message?.includes('Forbidden'))
      ) {
        errorMessage = 'Access denied. Please check your app permissions and scopes.';
      } else if (error instanceof Error && error.cause instanceof Error && error.cause.message) {
        errorMessage = `API Error: ${error.cause.message}`;
      } else if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }

      notifications.show({
        title: 'Connection Failed',
        message: errorMessage,
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStoreNameChange = (value: string) => {
    form.setFieldValue('storeName', value.toLowerCase());
    // Auto-generate shop domain
    if (value) {
      form.setFieldValue('shopDomain', ShopifyService.generateShopDomain(value.toLowerCase()));
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <IconShoppingBag size={24} color="green" />
          <Title order={3}>Connect Shopify Store</Title>
        </Group>
      }
      size="lg"
      centered
    >
      <Stack gap="md">
        {/* Security Notice */}
        <Alert icon={<IconShield size={16} />} color="blue" variant="light">
          <Text size="sm">
            Your store credentials are encrypted and stored securely. We use industry-standard
            encryption to protect your access tokens and store information.
          </Text>
        </Alert>

        {/* Instructions Toggle */}
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Need help getting your access token?
          </Text>
          <Button
            variant="subtle"
            size="xs"
            onClick={() => setShowInstructions(!showInstructions)}
            rightSection={<IconInfoCircle size={14} />}
          >
            {showInstructions ? 'Hide' : 'Show'} Instructions
          </Button>
        </Group>

        {/* Instructions Panel */}
        {showInstructions && (
          <Paper p="md" withBorder>
            <Stack gap="sm">
              <Title order={5}>How to get your Shopify Access Token:</Title>
              <List size="sm" spacing="xs">
                <List.Item>
                  Go to your Shopify Admin → Apps →
                  <Anchor href="https://admin.shopify.com/settings/apps" target="_blank" ml={4}>
                    App and sales channel settings
                    <IconExternalLink size={12} style={{ marginLeft: 4 }} />
                  </Anchor>
                </List.Item>
                <List.Item>Click "Develop apps" → "Create an app"</List.Item>
                <List.Item>Give your app a name (e.g., "MLT Admin Integration")</List.Item>
                <List.Item>Go to "Configuration" → "Admin API integration"</List.Item>
                <List.Item>
                  Select the following scopes:
                  <List withPadding size="xs" mt="xs">
                    <List.Item>
                      <Badge size="xs" color="blue">
                        read_products
                      </Badge>{' '}
                      - View products
                    </List.Item>
                    <List.Item>
                      <Badge size="xs" color="blue">
                        write_products
                      </Badge>{' '}
                      - Manage products
                    </List.Item>
                    <List.Item>
                      <Badge size="xs" color="blue">
                        read_customers
                      </Badge>{' '}
                      - View customers
                    </List.Item>
                    <List.Item>
                      <Badge size="xs" color="blue">
                        read_orders
                      </Badge>{' '}
                      - View orders
                    </List.Item>
                    <List.Item>
                      <Badge size="xs" color="blue">
                        read_inventory
                      </Badge>{' '}
                      - View inventory
                    </List.Item>
                  </List>
                </List.Item>
                <List.Item>Click "Save" → "Install app"</List.Item>
                <List.Item>Copy the "Admin API access token" and paste it below</List.Item>
              </List>
            </Stack>
          </Paper>
        )}

        <Divider />

        {/* Connection Form */}
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Store Name"
              placeholder="your-store-name"
              description="Enter your Shopify store name (without .myshopify.com)"
              leftSection={<IconShoppingBag size={16} />}
              required
              {...form.getInputProps('storeName')}
              onChange={(e) => handleStoreNameChange(e.target.value)}
            />

            <TextInput
              label="Shop Domain"
              placeholder="your-store-name.myshopify.com"
              description="This will be auto-generated from your store name"
              leftSection={<IconExternalLink size={16} />}
              disabled
              {...form.getInputProps('shopDomain')}
            />

            <PasswordInput
              label="Access Token"
              placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              description="Your private app's Admin API access token"
              leftSection={<IconKey size={16} />}
              required
              {...form.getInputProps('accessToken')}
            />

            {/* Security Features */}
            <Alert icon={<IconShield size={16} />} color="green" variant="light">
              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  Security Features:
                </Text>
                <List size="xs" spacing={2}>
                  <List.Item icon={<IconLock size={12} color="var(--mantine-color-green-6)" />}>
                    End-to-end encryption for all credentials
                  </List.Item>
                  <List.Item icon={<IconShield size={12} color="var(--mantine-color-green-6)" />}>
                    Secure token storage in encrypted database
                  </List.Item>
                  <List.Item icon={<IconDatabase size={12} color="var(--mantine-color-green-6)" />}>
                    No plain-text storage of sensitive data
                  </List.Item>
                  <List.Item icon={<IconBolt size={12} color="var(--mantine-color-green-6)" />}>
                    Automatic token validation and verification
                  </List.Item>
                </List>
              </Stack>
            </Alert>

            <Group justify="flex-end" gap="sm">
              <Button variant="subtle" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={loading}
                leftSection={<IconShoppingBag size={16} />}
                color="green"
              >
                Connect Store
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Modal>
  );
};

export default StoreConnection;
