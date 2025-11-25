import React, { useState } from 'react';
import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Group,
  Button,
  Badge,
  ActionIcon,
  Tabs,
  Card,
  ThemeIcon,
  Alert,
  Modal,
  TextInput,
  PasswordInput,
  SimpleGrid,
  Box,
  Loader,
} from '@mantine/core';
import {
  IconSettings,
  IconBuilding,
  IconUser,
  IconShield,
  IconBrandShopee,
  IconBrandAmazon,
  IconShoppingBag,
  IconPlus,
  IconTrash,
  IconEdit,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconWifi,
  IconWifiOff,
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../services/api';

// Store connection interfaces
interface StoreConnection {
  id: string;
  platform: 'shopify' | 'amazon' | 'flipkart';
  storeName: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  credentials?: {
    accessToken?: string;
    apiKey?: string;
    secretKey?: string;
  };
}

interface ApiStoreResponse {
  id: string;
  platform: string;
  storeName: string;
  status: string;
  lastSyncAt?: string;
}

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('stores');
  const [addStoreOpened, { open: openAddStore, close: closeAddStore }] = useDisclosure(false);
  const [editStoreOpened, { open: openEditStore, close: closeEditStore }] = useDisclosure(false);
  const [selectedStore, setSelectedStore] = useState<StoreConnection | null>(null);
  const [storeConnections, setStoreConnections] = useState<StoreConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  // Fetch store connections from API
  const fetchStoreConnections = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/storeconnection');
      const result = response.data;

      // Transform API response to match our interface
      const transformedStores =
        result.stores?.map((store: ApiStoreResponse) => ({
          id: store.id,
          platform: store.platform as 'shopify' | 'amazon' | 'flipkart',
          storeName: store.storeName,
          status: store.status as 'connected' | 'disconnected' | 'error',
          lastSync: store.lastSyncAt,
          credentials: {}, // Don't expose credentials in frontend
        })) || [];

      setStoreConnections(transformedStores);
    } catch (error) {
      console.error('Failed to fetch store connections:', error);
      // If user is not authenticated, the interceptor will handle redirect
    } finally {
      setLoading(false);
    }
  };

  // Load store connections on component mount
  React.useEffect(() => {
    fetchStoreConnections();
  }, []);

  const [newStore, setNewStore] = useState({
    platform: 'shopify' as 'shopify' | 'amazon' | 'flipkart',
    storeName: '',
    accessToken: '',
    apiKey: '',
    secretKey: '',
  });

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

  const handleAddStore = async () => {
    try {
      // Validate required fields
      const config = platformConfig[newStore.platform];
      const requiredFields = config.fields;

      for (const field of requiredFields) {
        if (!newStore[field as keyof typeof newStore]) {
          notifications.show({
            title: 'Validation Error',
            message: `${field} is required`,
            color: 'red',
            icon: <IconX size={16} />,
          });
          return;
        }
      }

      // Call API to create store connection
      const response = await apiClient.post('/storeconnection', {
        platform: newStore.platform,
        storeName: newStore.storeName,
        accessToken: newStore.accessToken,
        apiKey: newStore.apiKey,
        secretKey: newStore.secretKey,
        setAsDefault: true,
      });

      const result = response.data;

      if (result.success) {
        // Refresh store connections from API
        await fetchStoreConnections();

        // Invalidate Shopify connection queries to force refresh (all platforms)
        queryClient.invalidateQueries({ queryKey: ['shopify', 'connection'] });
        queryClient.invalidateQueries({ queryKey: ['shopify'] });
        queryClient.invalidateQueries({ queryKey: ['storeconnection'] });

        notifications.show({
          title: 'Store Connected',
          message: result.message + '. App will refresh in a moment...',
          color: 'green',
          icon: <IconCheck size={16} />,
        });

        // Refresh the entire app to ensure clean state
        setTimeout(() => {
          window.location.reload();
        }, 1000);

        // Reset form and close modal
        setNewStore({
          platform: 'shopify',
          storeName: '',
          accessToken: '',
          apiKey: '',
          secretKey: '',
        });
        closeAddStore();
      } else {
        notifications.show({
          title: 'Connection Failed',
          message: result.message || 'Failed to connect store',
          color: 'red',
          icon: <IconX size={16} />,
        });
      }
    } catch {
      notifications.show({
        title: 'Connection Failed',
        message: 'Failed to connect store. Please check your credentials.',
        color: 'red',
        icon: <IconX size={16} />,
      });
    }
  };

  const handleRemoveStore = async (storeId: string) => {
    try {
      const store = storeConnections.find((s) => s.id === storeId);
      if (!store) return;

      // If store is connected, disconnect it first, then remove
      if (store.status === 'connected') {
        // First disconnect the store
        const disconnectResponse = await apiClient.post(`/storeconnection/${storeId}/disconnect`);

        if (!disconnectResponse.data.success) {
          notifications.show({
            title: 'Disconnect Failed',
            message: 'Failed to disconnect store before removal',
            color: 'red',
            icon: <IconX size={16} />,
          });
          return;
        }
      }

      // Then remove the store
      const response = await apiClient.delete(`/storeconnection/${storeId}`);
      const result = response.data;

      if (result.success) {
        // Invalidate connection queries to force refresh (all platforms)
        queryClient.invalidateQueries({ queryKey: ['shopify', 'connection'] });
        queryClient.invalidateQueries({ queryKey: ['shopify'] });
        queryClient.invalidateQueries({ queryKey: ['storeconnection'] });

        // Refresh store connections
        await fetchStoreConnections();

        notifications.show({
          title: 'Store Removed',
          message:
            (result.message || 'Store has been disconnected and removed successfully') +
            '. App will refresh in a moment...',
          color: 'green',
          icon: <IconTrash size={16} />,
        });

        // Refresh the entire app to ensure clean state
        setTimeout(() => {
          window.location.reload();
        }, 1500); // Slightly longer delay for store removal
      } else {
        notifications.show({
          title: 'Remove Failed',
          message: result.message || 'Failed to remove store',
          color: 'red',
          icon: <IconX size={16} />,
        });
      }
    } catch {
      notifications.show({
        title: 'Remove Failed',
        message: 'Failed to remove store',
        color: 'red',
        icon: <IconX size={16} />,
      });
    }
  };

  const getStatusBadge = (status: StoreConnection['status']) => {
    const config = {
      connected: { color: 'green', label: 'Connected', icon: IconWifi },
      disconnected: { color: 'gray', label: 'Disconnected', icon: IconWifiOff },
      error: { color: 'red', label: 'Error', icon: IconAlertCircle },
    };

    const { color, label, icon: Icon } = config[status];

    return (
      <Badge color={color} variant="light" leftSection={<Icon size={12} />}>
        {label}
      </Badge>
    );
  };

  const StoreManagement = () => (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={3}>Store Connections</Title>
          <Text size="sm" c="dimmed">
            Manage your e-commerce platform connections
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={openAddStore}>
          Add Store
        </Button>
      </Group>

      {loading ? (
        <Paper p="xl" withBorder>
          <Stack align="center" gap="md">
            <Loader size="md" />
            <Text>Loading store connections...</Text>
          </Stack>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {storeConnections.map((store) => {
            const config = platformConfig[store.platform];
            const Icon = config.icon;

            return (
              <Card key={store.id} withBorder padding="lg">
                <Group justify="space-between" mb="md">
                  <Group>
                    <ThemeIcon size="lg" color={config.color} variant="light">
                      <Icon size={24} />
                    </ThemeIcon>
                    <div>
                      <Text fw={500}>{store.storeName}</Text>
                      <Text size="sm" c="dimmed">
                        {config.name}
                      </Text>
                    </div>
                  </Group>
                  {getStatusBadge(store.status)}
                </Group>

                {store.lastSync && (
                  <Text size="xs" c="dimmed" mb="md">
                    Last sync: {new Date(store.lastSync).toLocaleString()}
                  </Text>
                )}

                <Group justify="flex-end">
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    onClick={() => {
                      setSelectedStore(store);
                      openEditStore();
                    }}
                  >
                    <IconEdit size={16} />
                  </ActionIcon>

                  <Button
                    size="xs"
                    variant="light"
                    color="red"
                    onClick={() => handleRemoveStore(store.id)}
                  >
                    Remove Store
                  </Button>
                </Group>
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      {!loading && storeConnections.length === 0 && (
        <Paper p="xl" withBorder>
          <Stack align="center" gap="md">
            <ThemeIcon size="xl" color="gray" variant="light">
              <IconBuilding size={32} />
            </ThemeIcon>
            <div style={{ textAlign: 'center' }}>
              <Text fw={500} mb="xs">
                No stores connected
              </Text>
              <Text size="sm" c="dimmed" mb="md">
                Connect your first e-commerce platform to get started
              </Text>
              <Button leftSection={<IconPlus size={16} />} onClick={openAddStore}>
                Add Your First Store
              </Button>
            </div>
          </Stack>
        </Paper>
      )}
    </Stack>
  );

  const UserSettings = () => (
    <Stack gap="lg">
      <Title order={3}>User Settings</Title>
      <Paper p="md" withBorder>
        <Text c="dimmed" ta="center">
          User settings will be available in the next phase
        </Text>
      </Paper>
    </Stack>
  );

  const RoleSettings = () => (
    <Stack gap="lg">
      <Title order={3}>Role & Permissions</Title>
      <Paper p="md" withBorder>
        <Text c="dimmed" ta="center">
          Role and permission settings will be available in the next phase
        </Text>
      </Paper>
    </Stack>
  );

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        {/* Header */}
        <Group>
          <ThemeIcon size="lg" color="blue" variant="light">
            <IconSettings size={24} />
          </ThemeIcon>
          <div>
            <Title order={1}>Settings</Title>
            <Text c="dimmed">Manage your application settings and integrations</Text>
          </div>
        </Group>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'stores')}>
          <Tabs.List>
            <Tabs.Tab value="stores" leftSection={<IconBuilding size={16} />}>
              Store Connections
            </Tabs.Tab>
            <Tabs.Tab value="users" leftSection={<IconUser size={16} />}>
              User Settings
            </Tabs.Tab>
            <Tabs.Tab value="roles" leftSection={<IconShield size={16} />}>
              Roles & Permissions
            </Tabs.Tab>
          </Tabs.List>

          <Box mt="lg">
            <Tabs.Panel value="stores">
              <StoreManagement />
            </Tabs.Panel>

            <Tabs.Panel value="users">
              <UserSettings />
            </Tabs.Panel>

            <Tabs.Panel value="roles">
              <RoleSettings />
            </Tabs.Panel>
          </Box>
        </Tabs>
      </Stack>

      {/* Add Store Modal */}
      <Modal opened={addStoreOpened} onClose={closeAddStore} title="Add New Store" size="md">
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Connect a new e-commerce platform to manage your products
          </Text>

          <Tabs
            value={newStore.platform}
            onChange={(value) =>
              setNewStore((prev) => ({
                ...prev,
                platform: value as 'shopify' | 'amazon' | 'flipkart',
              }))
            }
          >
            <Tabs.List>
              <Tabs.Tab value="shopify" leftSection={<IconBrandShopee size={16} />}>
                Shopify
              </Tabs.Tab>
              <Tabs.Tab value="amazon" leftSection={<IconBrandAmazon size={16} />}>
                Amazon
              </Tabs.Tab>
              <Tabs.Tab value="flipkart" leftSection={<IconShoppingBag size={16} />}>
                Flipkart
              </Tabs.Tab>
            </Tabs.List>

            <Box mt="md">
              <Stack gap="md">
                <TextInput
                  label="Store Name"
                  placeholder="Enter your store name"
                  value={newStore.storeName}
                  onChange={(e) => setNewStore((prev) => ({ ...prev, storeName: e.target.value }))}
                  required
                />

                {newStore.platform === 'shopify' && (
                  <PasswordInput
                    label="Access Token"
                    placeholder="shpat_..."
                    value={newStore.accessToken}
                    onChange={(e) =>
                      setNewStore((prev) => ({ ...prev, accessToken: e.target.value }))
                    }
                    required
                  />
                )}

                {(newStore.platform === 'amazon' || newStore.platform === 'flipkart') && (
                  <>
                    <TextInput
                      label="API Key"
                      placeholder="Enter your API key"
                      value={newStore.apiKey}
                      onChange={(e) => setNewStore((prev) => ({ ...prev, apiKey: e.target.value }))}
                      required
                    />
                    <PasswordInput
                      label="Secret Key"
                      placeholder="Enter your secret key"
                      value={newStore.secretKey}
                      onChange={(e) =>
                        setNewStore((prev) => ({ ...prev, secretKey: e.target.value }))
                      }
                      required
                    />
                  </>
                )}
              </Stack>
            </Box>
          </Tabs>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={closeAddStore}>
              Cancel
            </Button>
            <Button onClick={handleAddStore}>Connect Store</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit Store Modal */}
      <Modal
        opened={editStoreOpened}
        onClose={closeEditStore}
        title="Edit Store Connection"
        size="md"
      >
        {selectedStore && (
          <Stack gap="md">
            <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
              Editing store credentials will require reconnection
            </Alert>

            <Text size="sm" c="dimmed" ta="center">
              Store editing functionality will be available in the next update
            </Text>

            <Group justify="flex-end">
              <Button variant="subtle" onClick={closeEditStore}>
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
};

export default Settings;
