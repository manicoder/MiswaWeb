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
  Badge,
  Select,
} from '@mantine/core';
import {
  IconShoppingBag,
  IconAlertCircle,
  IconCheck,
  IconExternalLink,
  IconInfoCircle,
  IconShield,
  IconBrandShopee,
  IconBrandAmazon,
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../../services/api';

interface UnifiedStoreConnectionProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  platform?: 'shopify' | 'amazon' | 'flipkart';
  title?: string;
}

const UnifiedStoreConnection: React.FC<UnifiedStoreConnectionProps> = ({
  opened,
  onClose,
  onSuccess,
  platform = 'shopify',
  title = 'Connect Store',
}) => {
  const [loading, setLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const platformConfig = {
    shopify: {
      name: 'Shopify',
      icon: IconBrandShopee,
      color: 'green',
      fields: ['storeName', 'accessToken'],
    },
    amazon: {
      name: 'Amazon',
      icon: IconBrandAmazon,
      color: 'orange',
      fields: ['storeName', 'apiKey', 'secretKey'],
    },
    flipkart: {
      name: 'Flipkart',
      icon: IconShoppingBag,
      color: 'blue',
      fields: ['storeName', 'apiKey', 'secretKey'],
    },
  };

  const form = useForm({
    initialValues: {
      platform: platform,
      storeName: '',
      accessToken: '',
      apiKey: '',
      secretKey: '',
    },
    validate: {
      storeName: (value: string) => (!value ? 'Store name is required' : null),
      accessToken: (value: string, values: Record<string, unknown>) => {
        if (values.platform === 'shopify' && !value) {
          return 'Access token is required';
        }
        return null;
      },
      apiKey: (value: string, values: Record<string, unknown>) => {
        if ((values.platform === 'amazon' || values.platform === 'flipkart') && !value) {
          return 'API key is required';
        }
        return null;
      },
      secretKey: (value: string, values: Record<string, unknown>) => {
        if ((values.platform === 'amazon' || values.platform === 'flipkart') && !value) {
          return 'Secret key is required';
        }
        return null;
      },
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/storeconnection', {
        platform: values.platform,
        storeName: values.storeName,
        accessToken: values.accessToken,
        apiKey: values.apiKey,
        secretKey: values.secretKey,
        setAsDefault: true,
      });

      const result = response.data;

      if (result.success) {
        // Note: Credentials are now stored securely in the database
        // No need for localStorage storage

        notifications.show({
          title: 'Store Connected Successfully',
          message: `Your ${platformConfig[values.platform as keyof typeof platformConfig].name} store "${values.storeName}" has been connected securely. App will refresh shortly...`,
          color: 'green',
          icon: <IconCheck size={16} />,
        });

        form.reset();
        onSuccess();
        onClose();
      } else {
        throw new Error(result.message || 'Failed to connect store');
      }
    } catch (error: unknown) {
      console.error('Connection error:', error);

      let errorMessage = 'Failed to connect store. Please check your credentials.';

      if (error instanceof Error && error.message) {
        errorMessage = error.message;
      } else if (error instanceof Response && error.statusText) {
        errorMessage = error.statusText;
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

  const config = platformConfig[form.values.platform as keyof typeof platformConfig];
  const IconComponent = config.icon;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <IconComponent size={24} color={`var(--mantine-color-${config.color}-6)`} />
          <Title order={3}>
            {title} {config.name} Store
          </Title>
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

        {/* Platform Selection (if not fixed) */}
        <Select
          label="Platform"
          value={form.values.platform}
          onChange={(value) =>
            form.setFieldValue('platform', value as 'shopify' | 'amazon' | 'flipkart')
          }
          data={[
            { value: 'shopify', label: 'Shopify' },
            { value: 'amazon', label: 'Amazon' },
            { value: 'flipkart', label: 'Flipkart' },
          ]}
          disabled={!!platform} // Disable if platform is pre-selected
        />

        {/* Store Connection Form */}
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Store Name"
              placeholder={`Enter your ${config.name.toLowerCase()} store name`}
              required
              {...form.getInputProps('storeName')}
            />

            {config.fields.includes('accessToken') && (
              <PasswordInput
                label="Access Token"
                placeholder="Enter your access token"
                required
                {...form.getInputProps('accessToken')}
              />
            )}

            {config.fields.includes('apiKey') && (
              <PasswordInput
                label="API Key"
                placeholder="Enter your API key"
                required
                {...form.getInputProps('apiKey')}
              />
            )}

            {config.fields.includes('secretKey') && (
              <PasswordInput
                label="Secret Key"
                placeholder="Enter your secret key"
                required
                {...form.getInputProps('secretKey')}
              />
            )}

            {/* Instructions for Shopify */}
            {form.values.platform === 'shopify' && (
              <>
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

                {showInstructions && (
                  <Paper p="md" withBorder>
                    <Stack gap="sm">
                      <Title order={5}>How to get your Shopify Access Token:</Title>
                      <List size="sm" spacing="xs">
                        <List.Item>
                          Go to your Shopify Admin → Apps →
                          <Anchor
                            href="https://admin.shopify.com/settings/apps"
                            target="_blank"
                            ml={4}
                          >
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
                          </List>
                        </List.Item>
                        <List.Item>Click "Install app" → "Generate tokens"</List.Item>
                        <List.Item>Copy the "Admin API access token"</List.Item>
                      </List>
                    </Stack>
                  </Paper>
                )}
              </>
            )}

            <Button type="submit" loading={loading} color={config.color} size="md">
              Connect {config.name} Store
            </Button>
          </Stack>
        </form>
      </Stack>
    </Modal>
  );
};

export default UnifiedStoreConnection;
