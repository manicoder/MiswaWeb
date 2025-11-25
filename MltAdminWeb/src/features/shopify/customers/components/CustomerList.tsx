import React, { useState, useMemo, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Table,
  Badge,
  Group,
  Avatar,
  TextInput,
  Select,
  Loader,
  Alert,
  Button,
  Flex,
  Tooltip,
  Card,
  SimpleGrid,
  ScrollArea,
} from '@mantine/core';
import {
  IconSearch,
  IconRefresh,
  IconMail,
  IconPhone,
  IconMapPin,
  IconCalendar,
  IconShoppingCart,
  IconCurrencyRupee,
  IconAlertCircle,
  IconUsers,
  IconPlug,
} from '@tabler/icons-react';
import {
  useShopifyCustomers,
  useShopifyCustomerSearch,
  type Customer,
} from '../../../../hooks/useShopifyCustomers';
import { useShopifyConnection } from '../../../../hooks/useShopifyConnection';
import { formatCurrency } from '../../../../utils/format.ts';
import { formatDistanceToNow } from 'date-fns';

interface CustomerAddress {
  city?: string;
  province?: string;
  country?: string;
}

const CustomerList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Connection status
  const {
    isConnected,
    isLoading: isCheckingConnection,
    connectionStatus,
    refresh: refreshConnection,
  } = useShopifyConnection();

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const params = useMemo(
    () => ({
      limit: 100,
      ...(statusFilter !== 'all' && { state: statusFilter }),
    }),
    [statusFilter],
  );

  const {
    data: customersData,
    isLoading,
    error,
    refetch,
    invalidateCustomers,
  } = useShopifyCustomers(params);

  const { data: searchData, isLoading: isSearching } = useShopifyCustomerSearch(
    debouncedSearch,
    debouncedSearch.length > 2,
  );

  // Data monitoring effect
  useEffect(() => {
    // Monitor customer data changes
  }, [customersData, searchData, isLoading, isSearching, error]);

  const customers = useMemo(() => {
    if (debouncedSearch.length > 2) {
      return searchData?.customers || [];
    }
    return customersData?.customers || [];
  }, [customersData, searchData, debouncedSearch]);

  const handleRefresh = () => {
    invalidateCustomers();
    refetch();
  };

  const handleConnectionRefresh = () => {
    refreshConnection();
  };

  const getCustomerInitials = (firstName: string, lastName: string) => {
    const firstInitial = firstName?.charAt(0)?.toUpperCase() || '';
    const lastInitial = lastName?.charAt(0)?.toUpperCase() || '';
    return `${firstInitial}${lastInitial}` || 'C';
  };

  const getStateColor = (state: string) => {
    switch (state?.toLowerCase()) {
      case 'enabled':
        return 'green';
      case 'disabled':
        return 'red';
      case 'invited':
        return 'blue';
      case 'declined':
        return 'orange';
      default:
        return 'gray';
    }
  };

  const formatAddress = (address: CustomerAddress | null | undefined) => {
    if (!address) return 'No address';
    const parts = [address.city, address.province, address.country].filter(Boolean);
    return parts.join(', ') || 'No address';
  };

  // Show connection error
  if (!isConnected && !isCheckingConnection) {
    return (
      <Container size="xl" py="md">
        <Alert
          icon={<IconPlug size={16} />}
          title="Shopify Store Not Connected"
          color="orange"
          variant="light"
        >
          <Stack gap="sm">
            <Text size="sm">You need to connect your Shopify store to view customers.</Text>
            <Group gap="sm">
              <Button
                size="sm"
                variant="light"
                leftSection={<IconRefresh size={14} />}
                onClick={handleConnectionRefresh}
                loading={isCheckingConnection}
              >
                Check Connection
              </Button>
            </Group>
          </Stack>
        </Alert>
      </Container>
    );
  }

  // Show connection checking
  if (isCheckingConnection) {
    return (
      <Container size="xl" py="md">
        <Flex justify="center" align="center" py="xl">
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text>Checking Shopify connection...</Text>
          </Stack>
        </Flex>
      </Container>
    );
  }

  // Show data loading error
  if (error) {
    return (
      <Container size="xl" py="md">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error loading customers"
          color="red"
          variant="light"
        >
          <Stack gap="sm">
            <Text size="sm">{(error as { message: string }).message}</Text>
            <Group gap="sm">
              <Button
                size="sm"
                variant="light"
                leftSection={<IconRefresh size={14} />}
                onClick={handleRefresh}
              >
                Retry
              </Button>
              <Button
                size="sm"
                variant="outline"
                leftSection={<IconPlug size={14} />}
                onClick={handleConnectionRefresh}
              >
                Check Connection
              </Button>
            </Group>
          </Stack>
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" py="md">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={1} size="h2">
              Customers
            </Title>
            <Text c="dimmed" size="sm">
              Manage your Shopify customers ({customers.length} total)
            </Text>
          </div>
          <Group gap="sm">
            <Button
              leftSection={<IconPlug size={16} />}
              variant="outline"
              onClick={handleConnectionRefresh}
              loading={isCheckingConnection}
              size="sm"
            >
              Check Connection
            </Button>
            <Button
              leftSection={<IconRefresh size={16} />}
              variant="light"
              onClick={handleRefresh}
              loading={isLoading}
            >
              Refresh
            </Button>
          </Group>
        </Group>

        {/* Connection Status Indicator */}
        {isConnected && (
          <Alert color="green" variant="light" icon={<IconPlug size={16} />}>
            <Text size="sm">
              Connected to Shopify store: <strong>{connectionStatus?.store?.storeName}</strong>
            </Text>
          </Alert>
        )}

        {/* Stats Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          <Card withBorder padding="lg">
            <Group>
              <Avatar color="blue" variant="light" radius="xl">
                <IconUsers size={24} />
              </Avatar>
              <div>
                <Text size="sm" c="dimmed" fw={500}>
                  Total Customers
                </Text>
                <Text fw={700} size="xl">
                  {customers.length}
                </Text>
              </div>
            </Group>
          </Card>

          <Card withBorder padding="lg">
            <Group>
              <Avatar color="green" variant="light" radius="xl">
                <IconShoppingCart size={24} />
              </Avatar>
              <div>
                <Text size="sm" c="dimmed" fw={500}>
                  Active Customers
                </Text>
                <Text fw={700} size="xl">
                  {customers.filter((c: Customer) => c.state === 'enabled').length}
                </Text>
              </div>
            </Group>
          </Card>

          <Card withBorder padding="lg">
            <Group>
              <Avatar color="orange" variant="light" radius="xl">
                <IconCurrencyRupee size={24} />
              </Avatar>
              <div>
                <Text size="sm" c="dimmed" fw={500}>
                  Total Spent
                </Text>
                <Text fw={700} size="xl">
                  ₹
                  {customers
                    .reduce((sum: number, c: Customer) => sum + parseFloat(c.totalSpent || '0'), 0)
                    .toFixed(2)}
                </Text>
              </div>
            </Group>
          </Card>

          <Card withBorder padding="lg">
            <Group>
              <Avatar color="violet" variant="light" radius="xl">
                <IconMail size={24} />
              </Avatar>
              <div>
                <Text size="sm" c="dimmed" fw={500}>
                  Marketing Opted
                </Text>
                <Text fw={700} size="xl">
                  {customers.filter((c: Customer) => c.acceptsMarketing).length}
                </Text>
              </div>
            </Group>
          </Card>
        </SimpleGrid>

        {/* Filters */}
        <Paper withBorder p="md">
          <Group>
            <TextInput
              placeholder="Search customers by name, email..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <Select
              placeholder="Filter by status"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value || 'all')}
              data={[
                { value: 'all', label: 'All Customers' },
                { value: 'enabled', label: 'Enabled' },
                { value: 'disabled', label: 'Disabled' },
                { value: 'invited', label: 'Invited' },
                { value: 'declined', label: 'Declined' },
              ]}
              w={200}
            />
          </Group>
        </Paper>

        {/* Customers Table */}
        <Paper withBorder>
          {isLoading || isSearching ? (
            <Flex justify="center" align="center" py="xl">
              <Stack align="center" gap="md">
                <Loader size="lg" />
                <Text>Loading customers...</Text>
              </Stack>
            </Flex>
          ) : customers.length === 0 ? (
            <Stack align="center" py="xl">
              <IconUsers size={48} stroke={1} color="gray" />
              <Text size="lg" fw={500} c="dimmed">
                No customers found
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                {search
                  ? 'Try adjusting your search criteria'
                  : 'No customers available to display'}
              </Text>
              <Group gap="sm" mt="md">
                <Button
                  variant="light"
                  leftSection={<IconRefresh size={16} />}
                  onClick={handleRefresh}
                >
                  Refresh Data
                </Button>
              </Group>
            </Stack>
          ) : (
            <ScrollArea>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Customer</Table.Th>
                    <Table.Th>Contact</Table.Th>
                    <Table.Th>Location</Table.Th>
                    <Table.Th>Orders</Table.Th>
                    <Table.Th>Total Spent</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Marketing</Table.Th>
                    <Table.Th>Joined</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {customers.map((customer: Customer) => (
                    <Table.Tr key={customer.id}>
                      <Table.Td>
                        <Group gap="sm">
                          <Avatar size="sm" radius="xl" color="blue">
                            {getCustomerInitials(customer.firstName, customer.lastName)}
                          </Avatar>
                          <div>
                            <Text fw={500} size="sm">
                              {customer.firstName} {customer.lastName}
                            </Text>
                            <Text size="xs" c="dimmed">
                              ID: {customer.id.split('/').pop()}
                            </Text>
                          </div>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <div>
                          <Group gap="xs">
                            <IconMail size={12} />
                            <Text size="sm">{customer.email}</Text>
                          </Group>
                          {customer.phone && (
                            <Group gap="xs" mt={2}>
                              <IconPhone size={12} />
                              <Text size="xs" c="dimmed">
                                {customer.phone}
                              </Text>
                            </Group>
                          )}
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <IconMapPin size={12} />
                          <Text size="sm">{formatAddress(customer.defaultAddress)}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <IconShoppingCart size={12} />
                          <Text size="sm" fw={500}>
                            {customer.ordersCount}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <IconCurrencyRupee size={12} />
                          <Text size="sm" fw={500}>
                            {formatCurrency(parseFloat(customer.totalSpent || '0'))}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={getStateColor(customer.state)} variant="light" size="sm">
                          {customer.state || 'enabled'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={customer.acceptsMarketing ? 'green' : 'gray'}
                          variant="light"
                          size="sm"
                        >
                          {customer.acceptsMarketing ? 'Yes' : 'No'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Tooltip label={new Date(customer.createdAt).toLocaleString()}>
                          <Group gap="xs">
                            <IconCalendar size={12} />
                            <Text size="sm" c="dimmed">
                              {formatDistanceToNow(new Date(customer.createdAt), {
                                addSuffix: true,
                              })}
                            </Text>
                          </Group>
                        </Tooltip>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Paper>
      </Stack>
    </Container>
  );
};

export default CustomerList;
