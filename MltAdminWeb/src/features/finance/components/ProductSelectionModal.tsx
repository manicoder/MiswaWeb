import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  TextInput,
  Button,
  Table,
  Text,
  Group,
  Stack,
  Badge,
  ScrollArea,
  Skeleton,
  Alert,
  Pagination,
  Select,
  ActionIcon,
  Card,
  Center,
} from '@mantine/core';
import {
  IconSearch,
  IconPackage,
  IconPlus,
  IconCheck,
  IconX,
  IconInfoCircle,
} from '@tabler/icons-react';
import databaseInventoryService, {
  type InventoryItem,
  type InventoryParams,
} from '../../../services/databaseInventoryService';
import SquareImage from '../../../components/common/SquareImage';

interface ProductSelectionModalProps {
  opened: boolean;
  onClose: () => void;
  onProductSelect: (product: InventoryItem, variant: InventoryItem['variants'][0]) => void;
  selectedProducts?: Array<{ productId: string; variantId: string }>;
}

interface ProductRow {
  productId: string;
  title: string;
  status: string;
  imageUrl: string;
  imageAltText: string;
  variantId: string;
  sku: string;
  barcode?: string;
  price: string;
  compareAtPrice?: string;
  available: number;
  inventoryItemId: string;
}

const ProductSelectionModal: React.FC<ProductSelectionModalProps> = ({
  opened,
  onClose,
  onProductSelect,
  selectedProducts = [],
}) => {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Load all products from inventory API once
  const loadAllProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: InventoryParams = {
        page: 1,
        limit: 9999, // Get all products at once
        method: 'window',
      };

      const response = await databaseInventoryService.fetchInventory(params);

      if (response.success && response.data) {
        // Transform inventory items to product rows
        const productRows: ProductRow[] = response.data.inventory.flatMap((item) =>
          item.variants.map((variant) => ({
            productId: item.productId,
            title: item.title,
            status: item.status,
            imageUrl: item.imageUrl,
            imageAltText: item.imageAltText,
            variantId: variant.variantId,
            sku: variant.sku,
            barcode: variant.barcode,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            available: variant.available,
            inventoryItemId: variant.inventoryItemId,
          })),
        );

        setProducts(productRows);
        setTotal(response.data.total);
      } else {
        const errorMessage = response.error || 'Failed to load products';
        setError(errorMessage);
        setProducts([]);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load products';
      setError(errorMessage);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Local search and filter functionality
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((product) => {
        return (
          (product.title && product.title.toLowerCase().includes(query)) ||
          (product.sku && product.sku.toLowerCase().includes(query)) ||
          (product.barcode && product.barcode.toLowerCase().includes(query))
        );
      });
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter((product) => product.status && product.status === statusFilter);
    }

    // Apply inventory filter
    if (inventoryFilter !== 'all') {
      filtered = filtered.filter((product) => {
        const available = product.available ?? 0; // Default to 0 if null/undefined
        switch (inventoryFilter) {
          case 'in_stock':
            return available > 0;
          case 'out_of_stock':
            return available === 0;
          case 'low_stock':
            return available > 0 && available <= 10;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [products, searchQuery, statusFilter, inventoryFilter]);

  // Paginate filtered results
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage, pageSize]);

  // Calculate total pages for filtered results
  const totalPagesForFiltered = useMemo(() => {
    return Math.ceil(filteredProducts.length / pageSize);
  }, [filteredProducts.length, pageSize]);

  // Load products when modal opens
  useEffect(() => {
    if (opened) {
      loadAllProducts();
    }
  }, [opened, loadAllProducts]);

  // Search is now handled locally via useMemo, no need for handleSearch function

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setInventoryFilter('all');
    setCurrentPage(1);
    // No need to reload data since we're using local filtering
  };

  const handleProductSelect = (product: ProductRow) => {
    // Find the original inventory item and variant
    const inventoryItem: InventoryItem = {
      productId: product.productId,
      title: product.title,
      status: product.status,
      imageUrl: product.imageUrl,
      imageAltText: product.imageAltText,
      variants: [
        {
          variantId: product.variantId,
          sku: product.sku,
          barcode: product.barcode,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          available: product.available,
          inventoryItemId: product.inventoryItemId,
        },
      ],
    };

    const variant = inventoryItem.variants[0];
    onProductSelect(inventoryItem, variant);
  };

  const isProductSelected = (productId: string, variantId: string) => {
    return selectedProducts.some(
      (selected) => selected.productId === productId && selected.variantId === variantId,
    );
  };

  const getStockBadgeColor = (available: number) => {
    if (available === 0) return 'red';
    if (available <= 10) return 'yellow';
    return 'green';
  };

  const getStockBadgeText = (available: number) => {
    if (available === 0) return 'Out of Stock';
    if (available <= 10) return 'Low Stock';
    return 'In Stock';
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Select Products from Inventory"
      size="xl"
      styles={{
        body: { padding: 0 },
      }}
    >
      <Stack gap="md" p="md">
        {/* Search and Filters */}
        <Card withBorder p="md">
          <Stack gap="md">
            <Group>
              <TextInput
                placeholder="Search by product title, SKU, or barcode..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1 }}
              />
              <Select
                placeholder="Status"
                data={[
                  { value: '', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'archived', label: 'Archived' },
                ]}
                value={statusFilter}
                onChange={(value) => setStatusFilter(value || '')}
                clearable
              />
              <Select
                placeholder="Stock"
                data={[
                  { value: 'all', label: 'All Stock' },
                  { value: 'in_stock', label: 'In Stock' },
                  { value: 'out_of_stock', label: 'Out of Stock' },
                  { value: 'low_stock', label: 'Low Stock' },
                ]}
                value={inventoryFilter}
                onChange={(value) => setInventoryFilter(value || 'all')}
              />
              <Text size="xs" c="dimmed">
                Real-time local search
              </Text>
              <ActionIcon onClick={handleClearFilters} variant="light">
                <IconX size={16} />
              </ActionIcon>
            </Group>
          </Stack>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert icon={<IconInfoCircle size={16} />} title="Error" color="red">
            {error}
          </Alert>
        )}

        {/* Products Table */}
        <Card withBorder>
          <ScrollArea h={400}>
            <Table stickyHeader>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '60px' }}>Select</Table.Th>
                  <Table.Th style={{ width: '60px' }}>Image</Table.Th>
                  <Table.Th style={{ minWidth: '200px' }}>Product</Table.Th>
                  <Table.Th style={{ minWidth: '120px' }}>SKU/Barcode</Table.Th>
                  <Table.Th style={{ minWidth: '100px' }}>Price</Table.Th>
                  <Table.Th style={{ minWidth: '100px' }}>Stock</Table.Th>
                  <Table.Th style={{ minWidth: '100px' }}>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, index) => (
                    <Table.Tr key={index}>
                      <Table.Td>
                        <Skeleton height={20} width={20} />
                      </Table.Td>
                      <Table.Td>
                        <Skeleton height={60} width={60} />
                      </Table.Td>
                      <Table.Td>
                        <Skeleton height={40} />
                      </Table.Td>
                      <Table.Td>
                        <Skeleton height={40} />
                      </Table.Td>
                      <Table.Td>
                        <Skeleton height={40} />
                      </Table.Td>
                      <Table.Td>
                        <Skeleton height={40} />
                      </Table.Td>
                      <Table.Td>
                        <Skeleton height={40} />
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : paginatedProducts.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Center>
                        <Stack align="center" gap="md" py="xl">
                          <IconPackage size={48} color="var(--mantine-color-gray-5)" />
                          <Text size="lg" fw={500} c="dimmed">
                            No products found
                          </Text>
                          <Text size="sm" c="dimmed" ta="center">
                            {searchQuery || statusFilter || inventoryFilter !== 'all'
                              ? 'Try adjusting your search criteria'
                              : 'No products available in inventory'}
                          </Text>
                        </Stack>
                      </Center>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  paginatedProducts.map((product, index) => (
                    <Table.Tr
                      key={`${product.productId}-${product.variantId}`}
                      style={{
                        backgroundColor:
                          index % 2 === 0 ? 'transparent' : 'var(--mantine-color-gray-0)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Table.Td>
                        <ActionIcon
                          variant={
                            isProductSelected(product.productId, product.variantId)
                              ? 'filled'
                              : 'light'
                          }
                          color={
                            isProductSelected(product.productId, product.variantId)
                              ? 'green'
                              : 'gray'
                          }
                          onClick={() => handleProductSelect(product)}
                          disabled={isProductSelected(product.productId, product.variantId)}
                        >
                          {isProductSelected(product.productId, product.variantId) ? (
                            <IconCheck size={16} />
                          ) : (
                            <IconPlus size={16} />
                          )}
                        </ActionIcon>
                      </Table.Td>
                      <Table.Td>
                        <SquareImage
                          src={product.imageUrl}
                          alt={product.imageAltText || product.title}
                          fallbackIcon="package"
                        />
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={2}>
                          <Text size="sm" fw={500} lineClamp={2}>
                            {product.title || 'No Title'}
                          </Text>
                          <Text size="xs" c="dimmed">
                            ID: {product.productId || 'No ID'}
                          </Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={2}>
                          <Text size="sm" ff="monospace">
                            {product.sku || 'No SKU'}
                          </Text>
                          <Text
                            size="xs"
                            c={product.barcode ? 'dark' : 'dimmed'}
                            ff="monospace"
                            fw={product.barcode ? 700 : 400}
                            style={{
                              backgroundColor: product.barcode
                                ? 'var(--mantine-color-yellow-1)'
                                : 'transparent',
                              padding: product.barcode ? '1px 3px' : '0',
                              borderRadius: '3px',
                              border: product.barcode
                                ? '1px solid var(--mantine-color-yellow-3)'
                                : 'none',
                              display: product.barcode ? 'inline-block' : 'block',
                              width: product.barcode ? 'fit-content' : 'auto',
                            }}
                          >
                            {product.barcode || 'No Barcode'}
                          </Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={2}>
                          <Text size="sm" fw={500}>
                            ₹{product.price || '0.00'}
                          </Text>
                          {product.compareAtPrice && (
                            <Text size="xs" c="dimmed" td="line-through">
                              ₹{product.compareAtPrice}
                            </Text>
                          )}
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Badge
                            color={getStockBadgeColor(product.available ?? 0)}
                            variant="filled"
                            size="sm"
                          >
                            {product.available ?? 0}
                          </Badge>
                          <Text size="xs" c="dimmed">
                            {getStockBadgeText(product.available ?? 0)}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          variant="light"
                          color={
                            product.status === 'active'
                              ? 'green'
                              : product.status === 'draft'
                                ? 'yellow'
                                : 'gray'
                          }
                        >
                          {product.status
                            ? product.status.charAt(0).toUpperCase() + product.status.slice(1)
                            : 'Unknown'}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Card>

        {/* Pagination */}
        {totalPagesForFiltered > 1 && (
          <Group justify="center">
            <Pagination
              total={totalPagesForFiltered}
              value={currentPage}
              onChange={setCurrentPage}
              size="sm"
            />
          </Group>
        )}

        {/* Summary */}
        <Card withBorder p="sm">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Showing {paginatedProducts.length} of {filteredProducts.length} filtered products
              (Total: {total})
            </Text>
            <Text size="sm" c="dimmed">
              {selectedProducts.length} products selected
            </Text>
          </Group>
        </Card>

        {/* Actions */}
        <Group justify="flex-end">
          <Button variant="light" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onClose} disabled={selectedProducts.length === 0}>
            Done ({selectedProducts.length} selected)
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default ProductSelectionModal;
