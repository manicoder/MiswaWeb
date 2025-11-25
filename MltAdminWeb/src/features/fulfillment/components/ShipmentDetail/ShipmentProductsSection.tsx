import React, { useState } from 'react';
import {
  Paper,
  Group,
  Title,
  Badge,
  Alert,
  Table,
  Text,
  NumberInput,
  ActionIcon,
  Modal,
  Center,
  Tooltip,
  Box,
  Stack,
  Card,
  Skeleton,
  TextInput,
} from '@mantine/core';
import { IconPackage, IconTrash, IconMaximize, IconSearch } from '@tabler/icons-react';
import type { Shipment, ShipmentItem } from '../../types';
import ClickableProductImage from '../../../../components/common/ClickableProductImage';
import ProductDetailModal from '../../../../components/common/ProductDetailModal';

interface InventoryVariant {
  variantId: string;
  sku?: string;
  barcode?: string;
  available?: number;
}

interface InventoryProduct {
  title: string;
  imageUrl?: string;
  variants: InventoryVariant[];
}

interface ShipmentProductsSectionProps {
  shipment: Shipment;
  canEdit: boolean;
  updateItemQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  inventory: InventoryProduct[];
  loading?: boolean;
}

export const ProductRowSkeleton = () => (
  <Table.Tr>
    <Table.Td>
      <Group justify="center">
        <Skeleton height={75} width={75} radius="sm" />
      </Group>
    </Table.Td>
    <Table.Td>
      <Stack gap="xs">
        <Skeleton height={16} width="80%" radius="sm" />
        <Skeleton height={12} width="60%" radius="sm" />
      </Stack>
    </Table.Td>
    <Table.Td>
      <Stack gap="xs">
        <Skeleton height={14} width="70%" radius="sm" />
        <Skeleton height={24} width="50%" radius="sm" />
      </Stack>
    </Table.Td>
    <Table.Td>
      <Group justify="center">
        <Skeleton height={30} width={80} radius="sm" />
      </Group>
    </Table.Td>
    <Table.Td>
      <Group justify="right">
        <Skeleton height={20} width={60} radius="sm" />
      </Group>
    </Table.Td>
    <Table.Td>
      <Group justify="center" gap="xs">
        <Skeleton height={28} width={28} radius="sm" />
        <Skeleton height={28} width={28} radius="sm" />
      </Group>
    </Table.Td>
  </Table.Tr>
);

const ShipmentProductsSection: React.FC<ShipmentProductsSectionProps> = ({
  shipment,
  canEdit,
  updateItemQuantity,
  removeItem,
  inventory,
  loading = false,
}) => {
  // State for expanded modal
  const [expandedModalOpen, setExpandedModalOpen] = useState(false);
  const [productDetailModalOpen, setProductDetailModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ShipmentItem | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [removingItemId, setRemovingItemId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Function to filter items based on search query
  const filteredItems =
    shipment.items?.filter((item) => {
      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase();
      return (
        item.productTitle?.toLowerCase().includes(query) ||
        item.variantTitle?.toLowerCase().includes(query) ||
        item.sku?.toLowerCase().includes(query) ||
        item.productBarcode?.toLowerCase().includes(query)
      );
    }) || [];

  // Calculate totals
  const totalUniqueProducts = shipment.items
    ? new Set(shipment.items.map((item) => item.sku || item.productBarcode)).size
    : 0;
  const totalQuantity = shipment.items
    ? shipment.items.reduce((sum, item) => sum + item.quantityPlanned, 0)
    : 0;
  const totalPrice = shipment.items
    ? shipment.items.reduce((sum, item) => sum + item.unitPrice * item.quantityPlanned, 0)
    : 0;

  // Calculate filtered totals for expanded view
  const filteredTotalQuantity = filteredItems.reduce((sum, item) => sum + item.quantityPlanned, 0);
  const filteredTotalPrice = filteredItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantityPlanned,
    0,
  );

  // Determine currency symbol
  const currencySymbol =
    shipment.items && shipment.items.length > 0
      ? shipment.items[0].currency === 'INR'
        ? '₹'
        : shipment.items[0].currency
      : '₹';

  // Function to find available quantity in inventory
  const findAvailableQuantity = (item: ShipmentItem) => {
    for (const product of inventory) {
      for (const variant of product.variants) {
        if (
          (variant.barcode && variant.barcode === item.productBarcode) ||
          (variant.sku && variant.sku === item.sku)
        ) {
          return variant.available || 0;
        }
      }
    }
    return 0;
  };

  // Handle quantity update in background without blocking section
  const handleQuantityUpdate = async (itemId: number, quantity: number) => {
    setUpdatingItemId(itemId);
    await updateItemQuantity(itemId, quantity);
    setUpdatingItemId(null);
  };

  // Handle item removal with loading state
  const handleItemRemove = async (itemId: number) => {
    try {
      setRemovingItemId(itemId);
      await removeItem(itemId);
    } finally {
      setRemovingItemId(null);
    }
  };

  // Handle product image click to show details
  const handleProductImageClick = (item: ShipmentItem) => {
    setSelectedProduct(item);
    setProductDetailModalOpen(true);
  };

  // Render products table
  const renderProductsTable = (expanded = false) => {
    const itemsToRender = expanded ? filteredItems : shipment.items;

    return (
      <Table highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ width: expanded ? 120 : 105, textAlign: 'center' }}>Image</Table.Th>
            <Table.Th style={{ width: expanded ? 450 : 250 }}>Product</Table.Th>
            <Table.Th style={{ width: expanded ? 150 : 150 }}>SKU/Barcode</Table.Th>
            {expanded && <Table.Th style={{ width: 120, textAlign: 'center' }}>Available</Table.Th>}
            <Table.Th style={{ width: expanded ? 120 : 100, textAlign: 'center' }}>
              Planned
            </Table.Th>
            <Table.Th style={{ width: expanded ? 120 : 100, textAlign: 'right' }}>Price</Table.Th>
            {canEdit && (
              <Table.Th style={{ width: expanded ? 100 : 80, textAlign: 'center' }}>
                Actions
              </Table.Th>
            )}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {loading ? (
            // Show skeleton rows during loading
            Array(3)
              .fill(0)
              .map((_, index) => <ProductRowSkeleton key={`skeleton-${index}`} />)
          ) : itemsToRender && itemsToRender.length > 0 ? (
            itemsToRender.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td style={{ textAlign: 'center', padding: '8px 0' }}>
                  <ClickableProductImage
                    src={item.productImageUrl}
                    alt={item.productTitle}
                    width={expanded ? 105 : 75}
                    height={expanded ? 105 : 75}
                    fit="contain"
                    onClick={() => handleProductImageClick(item)}
                  />
                </Table.Td>
                <Table.Td>
                  <div style={{ maxWidth: expanded ? '450px' : '250px' }}>
                    <Text size={expanded ? 'md' : 'sm'} fw={500} lineClamp={expanded ? 3 : 2}>
                      {item.productTitle}
                    </Text>
                    {item.variantTitle && (
                      <Text size={expanded ? 'sm' : 'xs'} c="dimmed" lineClamp={expanded ? 2 : 1}>
                        {item.variantTitle}
                      </Text>
                    )}
                  </div>
                </Table.Td>
                <Table.Td>
                  <div style={{ maxWidth: expanded ? '150px' : '150px' }}>
                    <Stack gap="xs">
                      <div>
                        <Text size={expanded ? 'sm' : 'xs'} c="dimmed" fw={500}>
                          SKU:
                        </Text>
                        <Text size={expanded ? 'sm' : 'xs'} fw={600} c="blue">
                          {item.sku || 'N/A'}
                        </Text>
                      </div>
                      {item.productBarcode && (
                        <div>
                          <Text size={expanded ? 'sm' : 'xs'} c="dimmed" fw={500}>
                            Barcode:
                          </Text>
                          <div
                            style={{
                              border: '2px solid var(--mantine-color-yellow-4)',
                              backgroundColor: 'var(--mantine-color-yellow-0)',
                              padding: expanded ? '4px 8px' : '2px 6px',
                              borderRadius: '6px',
                              marginTop: '4px',
                              display: 'inline-block',
                              maxWidth: '100%',
                              overflow: 'hidden',
                            }}
                          >
                            <Text
                              size={expanded ? 'sm' : 'xs'}
                              fw={700}
                              c="dark.7"
                              style={{ fontFamily: 'monospace' }}
                            >
                              {item.productBarcode}
                            </Text>
                          </div>
                        </div>
                      )}
                    </Stack>
                  </div>
                </Table.Td>
                {expanded && (
                  <Table.Td style={{ textAlign: 'center' }}>
                    <Badge
                      color={findAvailableQuantity(item) > 0 ? 'green' : 'red'}
                      size="lg"
                      variant="light"
                      style={{ fontSize: '16px', fontWeight: 'bold' }}
                    >
                      {findAvailableQuantity(item)}
                    </Badge>
                  </Table.Td>
                )}
                <Table.Td style={{ textAlign: 'center' }}>
                  {canEdit ? (
                    <NumberInput
                      value={item.quantityPlanned}
                      onChange={(value) => {
                        if (value) handleQuantityUpdate(item.id, value as number);
                      }}
                      min={1}
                      max={findAvailableQuantity(item) + item.quantityPlanned}
                      w={expanded ? 100 : 80}
                      size={expanded ? 'md' : 'sm'}
                      disabled={updatingItemId === item.id}
                      rightSection={
                        updatingItemId === item.id && <Skeleton height={16} width={16} circle />
                      }
                    />
                  ) : (
                    <Text size={expanded ? 'md' : 'sm'} fw={500}>
                      {item.quantityPlanned}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Stack gap="xs" align="flex-end">
                    <Text size={expanded ? 'md' : 'sm'} fw={500}>
                      {currencySymbol}
                      {(item.unitPrice * item.quantityPlanned).toLocaleString()}
                    </Text>
                    {item.compareAtPrice && item.compareAtPrice > item.unitPrice && (
                      <Text size={expanded ? 'sm' : 'xs'} c="dimmed" td="line-through">
                        {currencySymbol}
                        {(item.compareAtPrice * item.quantityPlanned).toLocaleString()}
                      </Text>
                    )}
                  </Stack>
                </Table.Td>
                {canEdit && (
                  <Table.Td style={{ textAlign: 'center' }}>
                    <Group justify="center" gap="xs">
                      <Tooltip label="Remove">
                        <ActionIcon
                          color="red"
                          variant="light"
                          size={expanded ? 'md' : 'sm'}
                          onClick={() => handleItemRemove(item.id)}
                          loading={removingItemId === item.id}
                        >
                          <IconTrash size={expanded ? 18 : 16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                )}
              </Table.Tr>
            ))
          ) : (
            <Table.Tr>
              <Table.Td
                colSpan={canEdit ? (expanded ? 7 : 6) : expanded ? 6 : 5}
                style={{ textAlign: 'center' }}
              >
                <Text c="dimmed">
                  {expanded && searchQuery.trim()
                    ? 'No products found matching your search'
                    : 'No products added yet'}
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    );
  };

  // Mobile product card view
  const renderMobileProductCards = () => (
    <Stack gap="md">
      {shipment.items.map((item) => (
        <Card key={item.id} withBorder p="sm">
          <Group justify="space-between" align="flex-start">
            <Group align="flex-start" gap="sm" style={{ flex: 1 }}>
              <ClickableProductImage
                src={item.productImageUrl}
                alt={item.productTitle}
                width={90}
                height={90}
                fit="contain"
                onClick={() => handleProductImageClick(item)}
              />
              <div style={{ flex: 1 }}>
                <Text fw={500} lineClamp={2}>
                  {item.productTitle}
                </Text>
                {item.variantTitle && (
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {item.variantTitle}
                  </Text>
                )}
                <Group justify="space-between" mt="xs">
                  <div>
                    <Text size="xs" c="dimmed">
                      SKU: {item.sku || 'N/A'}
                    </Text>
                    {item.productBarcode && (
                      <Text size="xs" fw={600} c="yellow.8">
                        {item.productBarcode}
                      </Text>
                    )}
                  </div>
                  <div>
                    <Text ta="right" fw={500}>
                      {item.currency === 'INR' ? '₹' : item.currency} {item.unitPrice.toFixed(2)}
                    </Text>
                    {item.compareAtPrice && item.compareAtPrice > item.unitPrice && (
                      <Text size="xs" c="dimmed" ta="right" td="line-through">
                        {item.currency === 'INR' ? '₹' : item.currency}{' '}
                        {item.compareAtPrice.toFixed(2)}
                      </Text>
                    )}
                    <Text size="xs" c="dimmed" ta="right">
                      Total: {currencySymbol} {(item.unitPrice * item.quantityPlanned).toFixed(2)}
                    </Text>
                  </div>
                </Group>
              </div>
            </Group>
          </Group>

          <Group justify="space-between" mt="md">
            <div>
              <Text size="sm" c="dimmed">
                Quantity:
              </Text>
              {canEdit ? (
                <NumberInput
                  value={item.quantityPlanned}
                  onChange={(value) => {
                    const newValue = Math.max(1, Number(value) || 1);
                    handleQuantityUpdate(item.id, newValue);
                  }}
                  min={1}
                  size="sm"
                  w={80}
                />
              ) : (
                <Badge color="blue" size="lg" variant="light">
                  {item.quantityPlanned}
                </Badge>
              )}
            </div>

            {canEdit && (
              <ActionIcon
                color="red"
                variant="subtle"
                onClick={() => handleItemRemove(item.id)}
                size="lg"
              >
                <IconTrash size={20} />
              </ActionIcon>
            )}
          </Group>
        </Card>
      ))}
    </Stack>
  );

  return (
    <div>
      <Paper withBorder p="md">
        <Group justify="space-between" mb="md">
          <Title order={4}>Shipment Products</Title>
          <Group gap="xs">
            <Badge variant="light">{shipment.items?.length || 0} items</Badge>
            {shipment.items && shipment.items.length > 0 && (
              <Tooltip label="Expand products view">
                <ActionIcon
                  variant="filled"
                  color="blue"
                  size="md"
                  onClick={() => setExpandedModalOpen(true)}
                >
                  <IconMaximize size={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>

        {!shipment.items || shipment.items.length === 0 ? (
          <Alert icon={<IconPackage size={16} />} color="blue">
            No products in this shipment yet.{' '}
            {canEdit ? 'Use the panel on the left to add products.' : ''}
          </Alert>
        ) : (
          <>
            {/* Desktop view */}
            <Box visibleFrom="md">{renderProductsTable(false)}</Box>

            {/* Mobile view */}
            <Box hiddenFrom="md">{renderMobileProductCards()}</Box>
          </>
        )}
      </Paper>

      {/* Expanded Products Modal */}
      <Modal
        opened={expandedModalOpen}
        onClose={() => {
          setExpandedModalOpen(false);
          setSearchQuery(''); // Reset search when modal closes
        }}
        size="90%"
        styles={{
          body: {
            height: 'calc(100vh - 80px)',
            maxHeight: 'calc(100vh - 80px)',
          },
        }}
        title={
          <Group>
            <IconPackage size={24} />
            <Title order={3}>Shipment Products - Expanded View</Title>
          </Group>
        }
      >
        <Stack gap="md" h="100%">
          <Group justify="space-between">
            <Text size="lg" fw={500}>
              Total Products:{' '}
              <Text span c="blue" fw={600}>
                {totalUniqueProducts}
              </Text>{' '}
              ({totalQuantity} items)
            </Text>
            <Text size="lg" fw={700}>
              Total Value: {currencySymbol} {totalPrice.toFixed(2)}
            </Text>
          </Group>

          {/* Search Input */}
          <TextInput
            placeholder="Search products by title, variant, SKU, or barcode..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            size="md"
            rightSection={
              searchQuery && (
                <ActionIcon size="sm" variant="subtle" onClick={() => setSearchQuery('')}>
                  <IconTrash size={14} />
                </ActionIcon>
              )
            }
          />

          {/* Filtered Results Summary */}
          {searchQuery.trim() && (
            <Group gap="xs">
              <Badge color="blue" variant="light">
                {filteredItems.length} of {shipment.items?.length || 0} items found
              </Badge>
              {filteredItems.length > 0 && (
                <Text size="sm" c="dimmed">
                  Filtered Total: {currencySymbol} {filteredTotalPrice.toFixed(2)} (
                  {filteredTotalQuantity} items)
                </Text>
              )}
            </Group>
          )}

          {loading ? (
            <Stack>
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} height={100} radius="sm" />
                ))}
            </Stack>
          ) : !shipment.items || shipment.items.length === 0 ? (
            <Center py="xl">
              <Stack align="center" gap="md">
                <IconPackage size={48} color="var(--mantine-color-gray-5)" />
                <Text size="lg" c="dimmed">
                  No products in this shipment yet
                </Text>
                {canEdit && (
                  <Text size="sm" c="dimmed">
                    Use the panel on the left to add products
                  </Text>
                )}
              </Stack>
            </Center>
          ) : (
            <>{renderProductsTable(true)}</>
          )}
        </Stack>
      </Modal>

      {/* Product Detail Modal */}
      <ProductDetailModal
        opened={productDetailModalOpen}
        onClose={() => setProductDetailModalOpen(false)}
        product={
          selectedProduct
            ? {
                id: selectedProduct.id.toString(),
                title: selectedProduct.productTitle,
                images: selectedProduct.productImageUrl
                  ? [
                      {
                        src: selectedProduct.productImageUrl,
                        alt: selectedProduct.productTitle,
                      },
                    ]
                  : [],
                variants: [
                  {
                    id: selectedProduct.id.toString(),
                    variantId: selectedProduct.id.toString(),
                    title: selectedProduct.variantTitle,
                    sku: selectedProduct.sku,
                    barcode: selectedProduct.productBarcode,
                    available: findAvailableQuantity(selectedProduct),
                    inventoryQuantity: findAvailableQuantity(selectedProduct),
                    price: selectedProduct.unitPrice,
                    currency: selectedProduct.currency,
                  },
                ],
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : null
        }
        showActions={false}
        showInventory={true}
        showPricing={true}
        showVariants={true}
        showImages={true}
        showMetadata={true}
        currency={selectedProduct?.currency || 'INR'}
      />
    </div>
  );
};

export default ShipmentProductsSection;
