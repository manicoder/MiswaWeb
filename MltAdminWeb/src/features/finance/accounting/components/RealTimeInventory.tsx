import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Group,
  Button,
  Card,
  Alert,
  Center,
  Table,
  ScrollArea,
  Badge,
  Grid,
  Skeleton,
} from '@mantine/core';
import {
  IconRefresh,
  IconAlertCircle,
  IconCalculator,
  IconTrendingUp,
  IconTrendingDown,
  IconEqual,
  IconPackage,
  IconCurrencyRupee,
  IconInfoCircle,
} from '@tabler/icons-react';
import { apiClient } from '../../../../services/api';

interface InventoryItem {
  productId: string;
  variantId: string;
  sku: string;
  productTitle: string;
  variantTitle: string;
  costPerItem: number;
  sellingPrice: number;
  maxPrice?: number;
  quantity: number;
  totalValue: number;
  currency: string;
  supplier?: string;
  lastUpdated: string;
}

interface RealTimeInventoryData {
  totalInventoryValue: number;
  totalItems: number;
  totalQuantity: number;
  averageCostPerItem: number;
  currency: string;
  calculatedAt: string;
  ledgerBalance: number;
  variance: number;
  inventoryItems: InventoryItem[];
}

const RealTimeInventory: React.FC = () => {
  const [inventoryData, setInventoryData] = useState<RealTimeInventoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [lastCalculated, setLastCalculated] = useState<Date | null>(null);

  useEffect(() => {
    fetchRealTimeInventory();
  }, []);

  const fetchRealTimeInventory = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await apiClient.get('/finance/inventory-assets/realtime-calculation');

      if (response.data.success) {
        setInventoryData(response.data.data);
        setLastCalculated(new Date());
      } else {
        setError(response.data.message || 'Failed to fetch real-time inventory data');
      }
    } catch (error) {
      console.error('Error fetching real-time inventory:', error);
      setError('Failed to load real-time inventory data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'green';
    if (variance < 0) return 'red';
    return 'blue';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <IconTrendingUp size={16} />;
    if (variance < 0) return <IconTrendingDown size={16} />;
    return <IconEqual size={16} />;
  };

  const getVarianceText = (variance: number) => {
    if (variance > 0) return 'Overvalued';
    if (variance < 0) return 'Undervalued';
    return 'Balanced';
  };

  if (loading) {
    return (
      <Container size="xl" py="md">
        <Paper withBorder p="md">
          <Stack gap="md">
            <Skeleton height={32} width={300} />
            <Skeleton height={200} />
            <Skeleton height={400} />
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="xl" py="md">
      <Paper withBorder p="md">
        <Stack gap="lg">
          {/* Header */}
          <Group justify="space-between" align="center">
            <div>
              <Title order={2}>Real-Time Inventory Calculation</Title>
              <Text c="dimmed" size="sm">
                Live inventory value calculation based on product variants
              </Text>
            </div>
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={fetchRealTimeInventory}
              loading={loading}
            >
              Refresh
            </Button>
          </Group>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
              {error}
            </Alert>
          )}

          {inventoryData && (
            <>
              {/* Summary Cards */}
              <Grid>
                <Grid.Col span={{ base: 12, md: 3 }}>
                  <Card withBorder p="md">
                    <Stack gap="xs">
                      <Group gap="xs">
                        <IconCurrencyRupee size={20} color="blue" />
                        <Text size="sm" c="dimmed">
                          Total Inventory Value
                        </Text>
                      </Group>
                      <Text size="xl" fw={700} c="blue">
                        {formatCurrency(inventoryData.totalInventoryValue)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {inventoryData.totalItems} items, {inventoryData.totalQuantity} units
                      </Text>
                    </Stack>
                  </Card>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 3 }}>
                  <Card withBorder p="md">
                    <Stack gap="xs">
                      <Group gap="xs">
                        <IconPackage size={20} color="green" />
                        <Text size="sm" c="dimmed">
                          Ledger Balance
                        </Text>
                      </Group>
                      <Text size="xl" fw={700} c="green">
                        {formatCurrency(inventoryData.ledgerBalance)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        From accounting ledger
                      </Text>
                    </Stack>
                  </Card>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 3 }}>
                  <Card withBorder p="md">
                    <Stack gap="xs">
                      <Group gap="xs">
                        <IconCalculator size={20} color="orange" />
                        <Text size="sm" c="dimmed">
                          Average Cost
                        </Text>
                      </Group>
                      <Text size="xl" fw={700} c="orange">
                        {formatCurrency(inventoryData.averageCostPerItem)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Per unit average
                      </Text>
                    </Stack>
                  </Card>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 3 }}>
                  <Card withBorder p="md">
                    <Stack gap="xs">
                      <Group gap="xs">
                        {getVarianceIcon(inventoryData.variance)}
                        <Text size="sm" c="dimmed">
                          Variance
                        </Text>
                      </Group>
                      <Text size="xl" fw={700} c={getVarianceColor(inventoryData.variance)}>
                        {formatCurrency(Math.abs(inventoryData.variance))}
                      </Text>
                      <Badge
                        color={getVarianceColor(inventoryData.variance)}
                        variant="light"
                        size="xs"
                      >
                        {getVarianceText(inventoryData.variance)}
                      </Badge>
                    </Stack>
                  </Card>
                </Grid.Col>
              </Grid>

              {/* Variance Alert */}
              {Math.abs(inventoryData.variance) > 1000 && (
                <Alert
                  icon={<IconInfoCircle size={16} />}
                  title="Inventory Variance Detected"
                  color={getVarianceColor(inventoryData.variance)}
                >
                  There is a significant variance between the calculated inventory value (
                  {formatCurrency(inventoryData.totalInventoryValue)}) and the ledger balance (
                  {formatCurrency(inventoryData.ledgerBalance)}). This may indicate:
                  <ul style={{ marginTop: '8px', marginBottom: '0' }}>
                    <li>Recent inventory changes not yet reflected in the ledger</li>
                    <li>Cost updates that haven't been synced</li>
                    <li>Manual ledger adjustments</li>
                  </ul>
                </Alert>
              )}

              {/* Inventory Items Table */}
              <Paper withBorder p="md">
                <Group justify="space-between" mb="md">
                  <Title order={3}>Inventory Items</Title>
                  <Text size="sm" c="dimmed">
                    Last calculated:{' '}
                    {lastCalculated ? formatDate(lastCalculated.toISOString()) : 'Never'}
                  </Text>
                </Group>

                <ScrollArea>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Product</Table.Th>
                        <Table.Th>SKU</Table.Th>
                        <Table.Th>Cost/Item</Table.Th>
                        <Table.Th>Quantity</Table.Th>
                        <Table.Th>Total Value</Table.Th>
                        <Table.Th>Supplier</Table.Th>
                        <Table.Th>Last Updated</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {inventoryData.inventoryItems.map((item) => (
                        <Table.Tr key={`${item.productId}-${item.variantId}`}>
                          <Table.Td>
                            <Stack gap="xs">
                              <Text fw={500} size="sm">
                                {item.productTitle}
                              </Text>
                              {item.variantTitle !== item.productTitle && (
                                <Text size="xs" c="dimmed">
                                  {item.variantTitle}
                                </Text>
                              )}
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={500}>
                              {item.sku || 'N/A'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600}>
                              {formatCurrency(item.costPerItem)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge color="blue" variant="light" size="sm">
                              {item.quantity}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600} c="green">
                              {formatCurrency(item.totalValue)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed">
                              {item.supplier || 'N/A'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="dimmed">
                              {formatDate(item.lastUpdated)}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>

                {inventoryData.inventoryItems.length === 0 && (
                  <Center py="xl">
                    <Stack align="center" gap="md">
                      <IconPackage size={48} color="gray" />
                      <Text c="dimmed">No inventory items found</Text>
                      <Text size="sm" c="dimmed" ta="center">
                        Make sure you have products with cost per item and inventory quantity
                      </Text>
                    </Stack>
                  </Center>
                )}
              </Paper>
            </>
          )}
        </Stack>
      </Paper>
    </Container>
  );
};

export default RealTimeInventory;
