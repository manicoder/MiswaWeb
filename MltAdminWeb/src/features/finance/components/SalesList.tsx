import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Text,
  Group,
  Button,
  Table,
  Badge,
  ActionIcon,
  Tooltip,
  TextInput,
  Select,
  Stack,
  Title,
  Card,
  Grid,
  Pagination,
  LoadingOverlay,
  Modal,
  Alert,
  NumberInput,
  Tabs,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';

import {
  IconDownload,
  IconSearch,
  IconEye,
  IconReceipt,
  IconAlertCircle,
  IconCurrencyRupee,
  IconCalendar,
  IconUser,
  IconChartBar,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { format } from 'date-fns';
import { API_ENDPOINTS, api } from '../../../services/api';
import SalesAnalytics from './SalesAnalytics';

// Types for sales orders
interface SalesOrder {
  id: string;
  orderNumber: string;
  name: string;
  shopifyOrderId: string;
  totalPrice: number;
  currency: string;
  status: string;
  fulfillmentStatus: string;
  displayFulfillmentStatus: string;
  displayFinancialStatus: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    customerFirstName?: string;
    customerLastName?: string;
    customerEmail?: string;
    customerId?: string;
  };
  shippingAddress?: {
    shippingFirstName?: string;
    shippingLastName?: string;
    shippingAddress1?: string;
    shippingCity?: string;
    shippingProvince?: string;
    shippingCountry?: string;
    shippingZip?: string;
  };
  lineItemsJson: string;
  totalTax?: number;
  totalDiscounts?: number;
  subtotalPrice?: number;
}

interface SalesOrdersResponse {
  success: boolean;
  data: {
    orders: SalesOrder[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  message: string | null;
  error: string | null;
}

const SalesList: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string | null>('orders');
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    fulfillmentStatus: '',
    minAmount: '',
    maxAmount: '',
    currency: '',
    startDate: null as string | null,
    endDate: null as string | null,
  });

  // Local search state for debouncing
  const [searchInput, setSearchInput] = useState(filters.search);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(filters.search && { search: filters.search }),
        ...(filters.fulfillmentStatus && { fulfillmentStatus: filters.fulfillmentStatus }),
        ...(filters.minAmount && { minAmount: filters.minAmount }),
        ...(filters.maxAmount && { maxAmount: filters.maxAmount }),
        ...(filters.currency && { currency: filters.currency }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const response = await api.get<SalesOrdersResponse>(
        `${API_ENDPOINTS.FINANCE_SALES_ORDERS}?${params}`,
      );
      const data = response.data;
      setOrders(data.data.orders);
      setTotalPages(data.data.pagination.totalPages);
      setTotalOrders(data.data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
      notifications.show({
        title: 'Error',
        message: 'Failed to load sales orders',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, filters]);

  // Effect to handle debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput }));
      setCurrentPage(1); // Reset to first page when searching
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  // Effect to handle debounced date filters
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Reset to first page when date filters change
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters.startDate, filters.endDate]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleViewDetails = (order: SalesOrder) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  const getFulfillmentColor = (status: string | undefined | null) => {
    if (!status) return 'gray';

    switch (status.toLowerCase()) {
      case 'fulfilled':
        return 'green';
      case 'unfulfilled':
        return 'orange';
      case 'partial':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  };

  const getCustomerName = (order: SalesOrder) => {
    if (order.customer?.customerFirstName || order.customer?.customerLastName) {
      return `${order.customer.customerFirstName || ''} ${order.customer.customerLastName || ''}`.trim();
    }
    return 'N/A';
  };

  const getShippingAddress = (order: SalesOrder) => {
    if (order.shippingAddress) {
      const { shippingCity, shippingProvince, shippingCountry } = order.shippingAddress;
      return [shippingCity, shippingProvince, shippingCountry].filter(Boolean).join(', ');
    }
    return 'N/A';
  };

  return (
    <Container size="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <div>
            <Title order={1}>Sales</Title>
            <Text c="dimmed" size="sm">
              View and manage sales orders from your Shopify store
            </Text>
          </div>
          <Group>
            <Button
              leftSection={<IconDownload size={16} />}
              variant="light"
              onClick={() => {
                // Export functionality will be implemented in future updates
              }}
            >
              Export
            </Button>
          </Group>
        </Group>

        {/* Error Alert */}
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
            {error}
          </Alert>
        )}

        {/* Summary Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Card withBorder p="md">
              <Group>
                <IconReceipt size={24} color="blue" />
                <div>
                  <Text size="xs" c="dimmed">
                    Total Orders
                  </Text>
                  <Text fw={700} size="lg">
                    {totalOrders}
                  </Text>
                </div>
              </Group>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Card withBorder p="md">
              <Group>
                <IconCurrencyRupee size={24} color="green" />
                <div>
                  <Text size="xs" c="dimmed">
                    Total Revenue
                  </Text>
                  <Text fw={700} size="lg">
                    {formatCurrency(
                      orders.reduce((sum, order) => sum + order.totalPrice, 0),
                      'INR',
                    )}
                  </Text>
                </div>
              </Group>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Card withBorder p="md">
              <Group>
                <IconCalendar size={24} color="orange" />
                <div>
                  <Text size="xs" c="dimmed">
                    This Month
                  </Text>
                  <Text fw={700} size="lg">
                    {
                      orders.filter((order) => {
                        const orderDate = new Date(order.createdAt);
                        const now = new Date();
                        return (
                          orderDate.getMonth() === now.getMonth() &&
                          orderDate.getFullYear() === now.getFullYear()
                        );
                      }).length
                    }
                  </Text>
                </div>
              </Group>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Card withBorder p="md">
              <Group>
                <IconUser size={24} color="purple" />
                <div>
                  <Text size="xs" c="dimmed">
                    Avg Order Value
                  </Text>
                  <Text fw={700} size="lg">
                    {orders.length > 0
                      ? formatCurrency(
                          orders.reduce((sum, order) => sum + order.totalPrice, 0) / orders.length,
                          'INR',
                        )
                      : formatCurrency(0, 'INR')}
                  </Text>
                </div>
              </Group>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Tabs */}
        <Paper withBorder p="md">
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab
                value="orders"
                leftSection={<IconReceipt size={16} />}
                style={{
                  minHeight: '40px',
                  minWidth: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                  Orders
                </Text>
              </Tabs.Tab>
              <Tabs.Tab
                value="analytics"
                leftSection={<IconChartBar size={16} />}
                style={{
                  minHeight: '40px',
                  minWidth: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                  Analytics
                </Text>
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="orders" pt="md">
              <Stack gap="lg">
                {/* Filters */}
                <Paper withBorder p="md">
                  <Stack gap="md">
                    <Group justify="space-between" align="center">
                      <Title order={3} size="h4">
                        Filters
                      </Title>
                      {(filters.startDate ||
                        filters.endDate ||
                        filters.search ||
                        filters.fulfillmentStatus ||
                        filters.minAmount ||
                        filters.maxAmount ||
                        filters.currency) && (
                        <Group gap="xs">
                          {(filters.startDate || filters.endDate) && (
                            <Badge variant="light" color="blue" size="sm">
                              {filters.startDate && filters.endDate
                                ? `${format(new Date(filters.startDate), 'MMM dd')} - ${format(new Date(filters.endDate), 'MMM dd, yyyy')}`
                                : filters.startDate
                                  ? `From ${format(new Date(filters.startDate), 'MMM dd, yyyy')}`
                                  : `Until ${format(new Date(filters.endDate!), 'MMM dd, yyyy')}`}
                            </Badge>
                          )}
                          <Button
                            variant="light"
                            color="gray"
                            size="xs"
                            onClick={() => {
                              setFilters({
                                search: '',
                                fulfillmentStatus: '',
                                minAmount: '',
                                maxAmount: '',
                                currency: '',
                                startDate: null,
                                endDate: null,
                              });
                              setSearchInput('');
                              setCurrentPage(1);
                            }}
                          >
                            Clear All Filters
                          </Button>
                        </Group>
                      )}
                    </Group>
                    <Grid>
                      <Grid.Col span={{ base: 12, md: 3 }}>
                        <TextInput
                          placeholder="Search orders..."
                          value={searchInput}
                          onChange={(event) => {
                            setSearchInput(event.currentTarget.value);
                          }}
                          leftSection={<IconSearch size={16} />}
                        />
                      </Grid.Col>

                      <Grid.Col span={{ base: 12, md: 3 }}>
                        <Select
                          placeholder="Fulfillment Status"
                          value={filters.fulfillmentStatus}
                          onChange={(value) =>
                            setFilters((prev) => ({ ...prev, fulfillmentStatus: value || '' }))
                          }
                          data={[
                            { value: 'fulfilled', label: 'Fulfilled' },
                            { value: 'unfulfilled', label: 'Unfulfilled' },
                            { value: 'partial', label: 'Partial' },
                          ]}
                          clearable
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 3 }}>
                        <Select
                          placeholder="Currency"
                          value={filters.currency}
                          onChange={(value) =>
                            setFilters((prev) => ({ ...prev, currency: value || '' }))
                          }
                          data={[{ value: 'INR', label: 'INR' }]}
                          clearable
                        />
                      </Grid.Col>
                    </Grid>
                    <Grid>
                      <Grid.Col span={{ base: 12, md: 3 }}>
                        <NumberInput
                          placeholder="Min Amount"
                          value={filters.minAmount}
                          onChange={(value) =>
                            setFilters((prev) => ({ ...prev, minAmount: value?.toString() || '' }))
                          }
                          min={0}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 3 }}>
                        <NumberInput
                          placeholder="Max Amount"
                          value={filters.maxAmount}
                          onChange={(value) =>
                            setFilters((prev) => ({ ...prev, maxAmount: value?.toString() || '' }))
                          }
                          min={0}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 3 }}>
                        <DateInput
                          placeholder="Start Date"
                          value={filters.startDate ? new Date(filters.startDate) : null}
                          onChange={(date) => {
                            const dateString =
                              date && !isNaN(new Date(date).getTime())
                                ? new Date(date).toISOString().split('T')[0]
                                : null;
                            setFilters((prev) => ({ ...prev, startDate: dateString }));
                          }}
                          clearable
                          maxDate={new Date()}
                          variant={filters.startDate ? 'filled' : 'default'}
                          styles={(theme) => ({
                            input: filters.startDate
                              ? {
                                  borderColor: theme.colors.blue[6],
                                }
                              : {},
                          })}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 3 }}>
                        <DateInput
                          placeholder="End Date"
                          value={filters.endDate ? new Date(filters.endDate) : null}
                          onChange={(date) => {
                            const dateString =
                              date && !isNaN(new Date(date).getTime())
                                ? new Date(date).toISOString().split('T')[0]
                                : null;
                            setFilters((prev) => ({ ...prev, endDate: dateString }));
                          }}
                          clearable
                          maxDate={new Date()}
                          minDate={filters.startDate ? new Date(filters.startDate) : undefined}
                          variant={filters.endDate ? 'filled' : 'default'}
                          styles={(theme) => ({
                            input: filters.endDate
                              ? {
                                  borderColor: theme.colors.blue[6],
                                }
                              : {},
                          })}
                        />
                      </Grid.Col>
                    </Grid>
                  </Stack>
                </Paper>

                {/* Orders Table */}
                <Paper withBorder>
                  <LoadingOverlay visible={isLoading} />
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Order</Table.Th>
                        <Table.Th>Customer</Table.Th>
                        <Table.Th>Amount</Table.Th>
                        <Table.Th>Fulfillment</Table.Th>
                        <Table.Th>Date</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {orders.map((order) => (
                        <Table.Tr key={order.id}>
                          <Table.Td>
                            <Stack gap={4}>
                              <Text fw={500}>{order.name}</Text>
                              <Text size="xs" c="dimmed">
                                {order.orderNumber}
                              </Text>
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Stack gap={4}>
                              <Text size="sm">{getCustomerName(order)}</Text>
                              <Text size="xs" c="dimmed">
                                {order.customer?.customerEmail || 'N/A'}
                              </Text>
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Text fw={500}>{formatCurrency(order.totalPrice, order.currency)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              color={getFulfillmentColor(order.fulfillmentStatus)}
                              variant="light"
                            >
                              {order.displayFulfillmentStatus}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{formatDate(order.createdAt)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Group gap={4}>
                              <Tooltip label="View Details">
                                <ActionIcon
                                  variant="light"
                                  color="blue"
                                  onClick={() => handleViewDetails(order)}
                                >
                                  <IconEye size={16} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Paper>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Group justify="center">
                    <Pagination
                      total={totalPages}
                      value={currentPage}
                      onChange={setCurrentPage}
                      withEdges
                    />
                  </Group>
                )}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="analytics" pt="md">
              <SalesAnalytics />
            </Tabs.Panel>
          </Tabs>
        </Paper>
      </Stack>

      {/* Order Details Modal */}
      <Modal
        opened={showDetails}
        onClose={() => setShowDetails(false)}
        title="Order Details"
        size="lg"
      >
        {selectedOrder && (
          <Stack gap="md">
            <Group>
              <div>
                <Text size="sm" c="dimmed">
                  Order Number
                </Text>
                <Text fw={500}>{selectedOrder.orderNumber}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Shopify Order ID
                </Text>
                <Text fw={500}>{selectedOrder.shopifyOrderId}</Text>
              </div>
            </Group>

            <Group>
              <div>
                <Text size="sm" c="dimmed">
                  Total Amount
                </Text>
                <Text fw={500} size="lg">
                  {formatCurrency(selectedOrder.totalPrice, selectedOrder.currency)}
                </Text>
              </div>

              <div>
                <Text size="sm" c="dimmed">
                  Fulfillment
                </Text>
                <Badge color={getFulfillmentColor(selectedOrder.fulfillmentStatus)}>
                  {selectedOrder.displayFulfillmentStatus}
                </Badge>
              </div>
            </Group>

            <Group>
              <div>
                <Text size="sm" c="dimmed">
                  Customer
                </Text>
                <Text fw={500}>{getCustomerName(selectedOrder)}</Text>
                <Text size="sm" c="dimmed">
                  {selectedOrder.customer?.customerEmail || 'N/A'}
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Shipping Address
                </Text>
                <Text fw={500}>{getShippingAddress(selectedOrder)}</Text>
              </div>
            </Group>

            <Group>
              <div>
                <Text size="sm" c="dimmed">
                  Created
                </Text>
                <Text fw={500}>{formatDate(selectedOrder.createdAt)}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Updated
                </Text>
                <Text fw={500}>{formatDate(selectedOrder.updatedAt)}</Text>
              </div>
            </Group>

            {selectedOrder.totalTax && (
              <Group>
                <div>
                  <Text size="sm" c="dimmed">
                    Tax
                  </Text>
                  <Text fw={500}>
                    {formatCurrency(selectedOrder.totalTax, selectedOrder.currency)}
                  </Text>
                </div>
                {selectedOrder.totalDiscounts && (
                  <div>
                    <Text size="sm" c="dimmed">
                      Discounts
                    </Text>
                    <Text fw={500}>
                      {formatCurrency(selectedOrder.totalDiscounts, selectedOrder.currency)}
                    </Text>
                  </div>
                )}
              </Group>
            )}

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setShowDetails(false)}>
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
};

export default SalesList;
