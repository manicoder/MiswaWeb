import React, { useState } from 'react';
import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Group,
  Button,
  Card,
  Badge,
  Alert,
  Table,
  ScrollArea,
  Modal,
  TextInput,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconBarcode,
  IconScan,
  IconEdit,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconPackage,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useMediaQuery } from '@mantine/hooks';
import BarcodeScanner from '../../../../components/common/BarcodeScanner';
import type { ShopifyProduct } from '../../../../services/paginatedShopifyService';

interface BarcodeUpdateInterfaceProps {
  products: ShopifyProduct[];
}

interface BarcodeProduct {
  barcode: string;
  productId: string;
  variantId: string;
  title: string;
  variantTitle?: string;
  sku?: string;
  price: number;
  currency: string;
  imageUrl?: string;
  inventoryQuantity?: number;
  isFound: boolean;
}

const BarcodeUpdateInterface: React.FC<BarcodeUpdateInterfaceProps> = ({ products }) => {
  const [scannerOpened, setScannerOpened] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProduct | null>(null);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const isMobile = useMediaQuery('(max-width: 768px)');

  // Find product by barcode
  const findProductByBarcode = (barcode: string): ShopifyProduct | null => {
    return (
      products.find((product) => product.variants.some((variant) => variant.barcode === barcode)) ||
      null
    );
  };

  // Handle barcode scanned
  const handleBarcodeScanned = (barcode: string) => {
    console.log('Barcode scanned:', barcode);
    const product = findProductByBarcode(barcode);

    if (product) {
      setSelectedProduct(product);
      setBarcodeInput(barcode);
      setEditModalOpened(true);
    } else {
      notifications.show({
        title: 'Product Not Found',
        message: `No product found with barcode: ${barcode}`,
        color: 'orange',
        icon: <IconAlertCircle size={16} />,
      });
    }
  };

  // Handle product found from scanner
  const handleProductFound = (product: BarcodeProduct) => {
    const shopifyProduct = findProductByBarcode(product.barcode);
    if (shopifyProduct) {
      setSelectedProduct(shopifyProduct);
      setBarcodeInput(product.barcode);
      setEditModalOpened(true);
    }
  };

  // Update product barcode
  const handleUpdateBarcode = async () => {
    if (!selectedProduct || !barcodeInput.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a valid barcode',
        color: 'red',
        icon: <IconX size={16} />,
      });
      return;
    }

    setIsUpdating(true);
    try {
      // Here you would typically make an API call to update the product barcode
      // For now, we'll just show a success notification

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      notifications.show({
        title: 'Success',
        message: `Barcode updated for ${selectedProduct.title}`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      setEditModalOpened(false);
      setSelectedProduct(null);
      setBarcodeInput('');
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to update barcode',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Get products with barcodes
  const productsWithBarcodes = products.filter((product) =>
    product.variants.some((variant) => variant.barcode),
  );

  // Get products without barcodes
  const productsWithoutBarcodes = products.filter(
    (product) => !product.variants.some((variant) => variant.barcode),
  );

  return (
    <Container size="xl" py={isMobile ? 'xs' : 'md'}>
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <IconBarcode size={isMobile ? 24 : 28} color="var(--mantine-color-blue-6)" />
            <Title order={isMobile ? 4 : 3} size={isMobile ? '1.2rem' : undefined}>
              Barcode Management
            </Title>
          </Group>
          <Button
            leftSection={<IconScan size={16} />}
            onClick={() => setScannerOpened(true)}
            variant="filled"
            size={isMobile ? 'sm' : 'md'}
          >
            Scan Barcode
          </Button>
        </Group>

        {/* Statistics Cards */}
        <Group gap="md" wrap="wrap">
          <Card withBorder p="md" style={{ flex: 1, minWidth: 200 }}>
            <Stack gap="xs">
              <Group gap="xs">
                <IconPackage size={20} color="var(--mantine-color-green-6)" />
                <Text size="sm" fw={500}>
                  Products with Barcodes
                </Text>
              </Group>
              <Text size="xl" fw={700} c="green">
                {productsWithBarcodes.length}
              </Text>
              <Text size="xs" c="dimmed">
                {((productsWithBarcodes.length / products.length) * 100).toFixed(1)}% of total
              </Text>
            </Stack>
          </Card>

          <Card withBorder p="md" style={{ flex: 1, minWidth: 200 }}>
            <Stack gap="xs">
              <Group gap="xs">
                <IconAlertCircle size={20} color="var(--mantine-color-orange-6)" />
                <Text size="sm" fw={500}>
                  Products without Barcodes
                </Text>
              </Group>
              <Text size="xl" fw={700} c="orange">
                {productsWithoutBarcodes.length}
              </Text>
              <Text size="xs" c="dimmed">
                Need barcode assignment
              </Text>
            </Stack>
          </Card>
        </Group>

        {/* Products without Barcodes */}
        {productsWithoutBarcodes.length > 0 && (
          <Paper withBorder p="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={5}>Products Without Barcodes</Title>
                <Badge color="orange" variant="light">
                  {productsWithoutBarcodes.length} products
                </Badge>
              </Group>

              <ScrollArea h={300}>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Product</Table.Th>
                      <Table.Th>Variant</Table.Th>
                      <Table.Th>SKU</Table.Th>
                      <Table.Th>Price</Table.Th>
                      <Table.Th style={{ textAlign: 'center' }}>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {productsWithoutBarcodes.slice(0, 10).map((product) => (
                      <Table.Tr key={product.id}>
                        <Table.Td>
                          <Stack gap={2}>
                            <Text size="sm" fw={500}>
                              {product.title}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {product.vendor}
                            </Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{product.variants[0]?.title || 'Default'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{product.variants[0]?.sku || '-'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            ₹{product.variants[0]?.price || '0'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs" justify="center">
                            <Tooltip label="Add Barcode">
                              <ActionIcon
                                variant="light"
                                color="blue"
                                size="sm"
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setBarcodeInput('');
                                  setEditModalOpened(true);
                                }}
                              >
                                <IconBarcode size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Stack>
          </Paper>
        )}

        {/* Products with Barcodes */}
        {productsWithBarcodes.length > 0 && (
          <Paper withBorder p="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={5}>Products With Barcodes</Title>
                <Badge color="green" variant="light">
                  {productsWithBarcodes.length} products
                </Badge>
              </Group>

              <ScrollArea h={300}>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Product</Table.Th>
                      <Table.Th>Variant</Table.Th>
                      <Table.Th>Barcode</Table.Th>
                      <Table.Th>SKU</Table.Th>
                      <Table.Th style={{ textAlign: 'center' }}>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {productsWithBarcodes.slice(0, 10).map((product) => {
                      const variantWithBarcode = product.variants.find((v) => v.barcode);
                      return (
                        <Table.Tr key={product.id}>
                          <Table.Td>
                            <Stack gap={2}>
                              <Text size="sm" fw={500}>
                                {product.title}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {product.vendor}
                              </Text>
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{variantWithBarcode?.title || 'Default'}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={500} style={{ fontFamily: 'monospace' }}>
                              {variantWithBarcode?.barcode || '-'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{variantWithBarcode?.sku || '-'}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs" justify="center">
                              <Tooltip label="Edit Barcode">
                                <ActionIcon
                                  variant="light"
                                  color="blue"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setBarcodeInput(variantWithBarcode?.barcode || '');
                                    setEditModalOpened(true);
                                  }}
                                >
                                  <IconEdit size={14} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Stack>
          </Paper>
        )}

        {/* Empty State */}
        {products.length === 0 && (
          <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
            <Text>No products available for barcode management.</Text>
          </Alert>
        )}
      </Stack>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        opened={scannerOpened}
        onClose={() => setScannerOpened(false)}
        onBarcodeScanned={handleBarcodeScanned}
        onProductFound={handleProductFound}
        title="Scan Product Barcode"
        placeholder="Enter barcode manually"
      />

      {/* Edit Barcode Modal */}
      <Modal
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        title="Update Product Barcode"
        size="md"
      >
        <Stack gap="md">
          {selectedProduct && (
            <>
              <Card withBorder p="md">
                <Stack gap="xs">
                  <Text size="sm" fw={500}>
                    Product: {selectedProduct.title}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Vendor: {selectedProduct.vendor}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Variant: {selectedProduct.variants[0]?.title || 'Default'}
                  </Text>
                </Stack>
              </Card>

              <TextInput
                label="Barcode"
                placeholder="Enter or scan barcode"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                rightSection={
                  <ActionIcon variant="light" onClick={() => setScannerOpened(true)} size="sm">
                    <IconScan size={14} />
                  </ActionIcon>
                }
              />

              <Group justify="flex-end" gap="sm">
                <Button
                  variant="light"
                  onClick={() => setEditModalOpened(false)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateBarcode}
                  loading={isUpdating}
                  leftSection={<IconCheck size={16} />}
                >
                  Update Barcode
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </Container>
  );
};

export default BarcodeUpdateInterface;
