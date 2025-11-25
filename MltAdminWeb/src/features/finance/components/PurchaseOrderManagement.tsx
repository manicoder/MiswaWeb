import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  Text,
  TextInput,
  Grid,
  Select,
  NumberInput,
  Table,
  ActionIcon,
  Modal,
  Divider,
  Group,
  Stack,
  Title,
  ScrollArea,
  Breadcrumbs,
  Anchor,
  Alert,
  Textarea,
  LoadingOverlay,
} from '@mantine/core';
import {
  IconPlus,
  IconTrash,
  IconDeviceFloppy,
  IconSearch,
  IconReceipt,
  IconArrowLeft,
  IconAlertCircle,
  IconPackage,
} from '@tabler/icons-react';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { supplierService } from '../../../services/financeService';
import { Supplier } from '../../../types/finance';
import { ShopifyService } from '../../../services/shopifyService';
import { ShopifyProduct } from '../../../types/shopify';
import ProductSelectionModal from './ProductSelectionModal';
import type { InventoryItem } from '../../../services/databaseInventoryService';
import { purchaseOrderService } from '../../../services/financeService';

interface PurchaseOrderItem {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  variantId: string;
  variantTitle: string;
  quantity: number;
  purchasePrice: number;
  gstAmount: number;
  gstRate: number;
  totalPrice: number;
  notes?: string;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  purchaseDate: Date;
  referenceNumber: string;
  billNumber: string;
  billDate: Date;
  expectedDeliveryDate: Date;
  notes: string;
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  totalAmount: number;
  currency: string;
  status: string;
  isReceived: boolean;
  receivedDate: Date;
  items: PurchaseOrderItem[];
}

const PurchaseOrderManagement: React.FC = () => {
  const navigate = useNavigate();
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder>({
    id: '',
    poNumber: '',
    supplierId: '',
    purchaseDate: new Date(),
    referenceNumber: '',
    billNumber: '',
    billDate: new Date(),
    expectedDeliveryDate: new Date(),
    notes: '',
    subtotal: 0,
    taxAmount: 0,
    shippingCost: 0,
    totalAmount: 0,
    currency: 'INR',
    status: 'draft',
    isReceived: false,
    receivedDate: new Date(),
    items: [],
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showProductSelectionModal, setShowProductSelectionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);

  // Get user from localStorage
  const getUser = () => {
    try {
      const userStr = localStorage.getItem('mlt-admin-user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  };

  // Load suppliers from database
  const loadSuppliers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const suppliersData = await supplierService.getSuppliers();
      setSuppliers(suppliersData);
    } catch (err) {
      setError('Failed to load suppliers. Please try again.');
      console.error('Error loading suppliers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load products from Shopify API
  const loadProducts = async (search?: string) => {
    try {
      setProductsLoading(true);
      const response = await ShopifyService.getProducts({
        page: 1,
        limit: 50,
        search: search || undefined,
        status: 'active',
      });
      setProducts(response.products || []);
    } catch (err) {
      console.error('Error loading products:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to load products from Shopify. Please check your store connection.',
        color: 'red',
      });
    } finally {
      setProductsLoading(false);
    }
  };

  // Search products when search term changes
  useEffect(() => {
    if (showProductSearch) {
      const debounceTimer = setTimeout(() => {
        if (searchTerm.trim()) {
          loadProducts(searchTerm);
        } else {
          loadProducts();
        }
      }, 500);

      return () => clearTimeout(debounceTimer);
    }
  }, [searchTerm, showProductSearch]);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const calculateTotals = useCallback(() => {
    const subtotal = purchaseOrder.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = purchaseOrder.items.reduce((sum, item) => sum + item.gstAmount, 0);
    const totalAmount = subtotal + taxAmount + purchaseOrder.shippingCost;

    setPurchaseOrder((prev) => ({
      ...prev,
      subtotal,
      taxAmount,
      totalAmount,
    }));
  }, [purchaseOrder.items, purchaseOrder.shippingCost]);

  useEffect(() => {
    calculateTotals();
  }, [calculateTotals]);

  const addItem = () => {
    const newItem: PurchaseOrderItem = {
      id: Date.now().toString(),
      productId: '',
      sku: '',
      productName: '',
      variantId: '',
      variantTitle: '',
      quantity: 1,
      purchasePrice: 0,
      gstAmount: 0,
      gstRate: 18,
      totalPrice: 0,
      notes: '',
    };

    setPurchaseOrder((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const removeItem = (itemId: string) => {
    setPurchaseOrder((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));
  };

  const updateItem = (itemId: string, field: keyof PurchaseOrderItem, value: string | number) => {
    setPurchaseOrder((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };

          // Recalculate item totals
          if (field === 'quantity' || field === 'purchasePrice' || field === 'gstRate') {
            const quantity = field === 'quantity' ? (value as number) : item.quantity;
            const price = field === 'purchasePrice' ? (value as number) : item.purchasePrice;
            const gstRate = field === 'gstRate' ? (value as number) : item.gstRate;

            const subtotal = quantity * price;
            const gstAmount = subtotal * (gstRate / 100);
            const totalPrice = subtotal + gstAmount;

            updatedItem.gstAmount = gstAmount;
            updatedItem.totalPrice = totalPrice;
          }

          return updatedItem;
        }
        return item;
      }),
    }));
  };

  const handleProductSelect = (itemId: string, product: ShopifyProduct) => {
    // Use the first variant for now, or allow user to select specific variant
    const variant = product.variants?.[0];
    if (variant) {
      updateItem(itemId, 'productId', product.id);
      updateItem(itemId, 'sku', variant.sku || '');
      updateItem(itemId, 'productName', product.title);
      updateItem(itemId, 'variantId', variant.id);
      updateItem(itemId, 'variantTitle', variant.title || '');
      // Set default purchase price from variant price if available
      if (variant.price) {
        const price = parseFloat(variant.price);
        if (!isNaN(price)) {
          updateItem(itemId, 'purchasePrice', price);
        }
      }
    }
    setShowProductSearch(false);
  };

  // New handler for inventory product selection
  const handleInventoryProductSelect = (
    inventoryItem: InventoryItem,
    variant: InventoryItem['variants'][0],
  ) => {
    setPurchaseOrder((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: Date.now().toString(),
          productId: inventoryItem.productId,
          sku: variant.sku,
          productName: inventoryItem.title,
          variantId: variant.variantId,
          variantTitle: variant.sku || inventoryItem.title,
          quantity: 1,
          purchasePrice: parseFloat(variant.price) || 0,
          gstAmount: 0,
          gstRate: 18,
          totalPrice: parseFloat(variant.price) || 0,
          notes: '',
        },
      ],
    }));

    // Close the modal after selection
    setShowProductSelectionModal(false);

    notifications.show({
      title: 'Product Added',
      message: `${inventoryItem.title} (${variant.sku}) added to purchase order`,
      color: 'green',
    });
  };

  const handleSaveDraft = async () => {
    if (!purchaseOrder.supplierId) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select a supplier',
        color: 'red',
      });
      return;
    }

    if (purchaseOrder.items.length === 0) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please add at least one item',
        color: 'red',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const createData = {
        supplierId: purchaseOrder.supplierId,
        purchaseDate: purchaseOrder.purchaseDate.toISOString(),
        referenceNumber: purchaseOrder.referenceNumber,
        billNumber: purchaseOrder.billNumber,
        billDate: purchaseOrder.billDate?.toISOString(),
        expectedDeliveryDate: purchaseOrder.expectedDeliveryDate?.toISOString(),
        notes: purchaseOrder.notes,
        taxAmount: purchaseOrder.taxAmount,
        gstAmount: 0, // Add GST amount if needed
        gstRate: 0, // Add GST rate if needed
        shippingCost: purchaseOrder.shippingCost,
        currency: purchaseOrder.currency,
        items: purchaseOrder.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          sku: item.sku,
          productName: item.productName,
          variantTitle: item.variantTitle,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
          gstAmount: item.gstAmount,
          gstRate: item.gstRate,
          notes: item.notes,
        })),
        createdBy: getUser()?.email || 'system',
      };

      await purchaseOrderService.createPurchaseOrder(createData);
      notifications.show({
        title: 'Success',
        message: 'Purchase order saved as draft',
        color: 'green',
      });
      navigate('/finance/purchase-orders');
    } catch (error) {
      console.error('Error saving purchase order:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save purchase order',
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitPurchase = async () => {
    if (!purchaseOrder.supplierId) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select a supplier',
        color: 'red',
      });
      return;
    }

    if (purchaseOrder.items.length === 0) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please add at least one item',
        color: 'red',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const createData = {
        supplierId: purchaseOrder.supplierId,
        purchaseDate: purchaseOrder.purchaseDate.toISOString(),
        referenceNumber: purchaseOrder.referenceNumber,
        billNumber: purchaseOrder.billNumber,
        billDate: purchaseOrder.billDate?.toISOString(),
        expectedDeliveryDate: purchaseOrder.expectedDeliveryDate?.toISOString(),
        notes: purchaseOrder.notes,
        taxAmount: purchaseOrder.taxAmount,
        gstAmount: 0, // Add GST amount if needed
        gstRate: 0, // Add GST rate if needed
        shippingCost: purchaseOrder.shippingCost,
        currency: purchaseOrder.currency,
        items: purchaseOrder.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          sku: item.sku,
          productName: item.productName,
          variantTitle: item.variantTitle,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
          gstAmount: item.gstAmount,
          gstRate: item.gstRate,
          notes: item.notes,
        })),
        createdBy: getUser()?.email || 'system',
      };

      await purchaseOrderService.createPurchaseOrder(createData);
      notifications.show({
        title: 'Success',
        message: 'Purchase order submitted successfully',
        color: 'green',
      });
      navigate('/finance/purchase-orders');
    } catch (error) {
      console.error('Error submitting purchase order:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to submit purchase order',
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const breadcrumbItems = [
    { title: 'Finance', href: '/finance' },
    { title: 'Purchase Orders', href: '/finance/purchase-orders' },
    { title: 'Create Purchase Order', href: '#' },
  ];

  return (
    <Box p="md">
      <LoadingOverlay visible={isLoading} />

      {/* Header */}
      <Group justify="space-between" mb="lg">
        <Box>
          <Title order={2} mb="xs">
            📋 Create Purchase Order
          </Title>
          <Breadcrumbs separator="→">
            {breadcrumbItems.map((item, index) => (
              <Anchor
                key={index}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.href);
                }}
                size="sm"
                c={index === breadcrumbItems.length - 1 ? 'dimmed' : 'blue'}
              >
                {item.title}
              </Anchor>
            ))}
          </Breadcrumbs>
        </Box>

        <Group>
          <Button
            variant="outline"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/finance/purchase-orders')}
          >
            Back to List
          </Button>
          <Button
            variant="outline"
            leftSection={<IconDeviceFloppy size={16} />}
            onClick={handleSaveDraft}
            loading={isSubmitting}
          >
            Save Draft
          </Button>
          <Button
            leftSection={<IconReceipt size={16} />}
            onClick={handleSubmitPurchase}
            loading={isSubmitting}
          >
            Submit Purchase Order
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" mb="md">
          {error}
        </Alert>
      )}

      <Grid gutter="md">
        {/* Supplier & Order Info Section */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card shadow="sm" padding="lg">
            <Title order={4} mb="md">
              📋 Supplier & Order Info
            </Title>

            <Stack gap="md">
              <Select
                label="Supplier Name"
                placeholder="Select a supplier"
                data={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
                value={purchaseOrder.supplierId}
                onChange={(value) =>
                  setPurchaseOrder((prev) => ({ ...prev, supplierId: value || '' }))
                }
                required
                disabled={isLoading}
              />

              <DatePickerInput
                label="Purchase Date"
                placeholder="Select date"
                value={purchaseOrder.purchaseDate}
                onChange={(value) =>
                  setPurchaseOrder((prev) => ({
                    ...prev,
                    purchaseDate:
                      value &&
                      typeof value === 'object' &&
                      'getTime' in value &&
                      !isNaN((value as Date).getTime())
                        ? (value as Date)
                        : new Date(),
                  }))
                }
              />

              <TextInput
                label="Reference Number"
                placeholder="Enter reference number (optional)"
                value={purchaseOrder.referenceNumber}
                onChange={(e) =>
                  setPurchaseOrder((prev) => ({ ...prev, referenceNumber: e.target.value }))
                }
                leftSection={<IconReceipt size={16} />}
              />

              <DatePickerInput
                label="Expected Delivery Date"
                placeholder="Select expected delivery date"
                value={purchaseOrder.expectedDeliveryDate}
                onChange={(value) =>
                  setPurchaseOrder((prev) => ({
                    ...prev,
                    expectedDeliveryDate:
                      value &&
                      typeof value === 'object' &&
                      'getTime' in value &&
                      !isNaN((value as Date).getTime())
                        ? (value as Date)
                        : new Date(),
                  }))
                }
              />

              <Textarea
                label="Notes"
                placeholder="Enter any additional notes..."
                value={purchaseOrder.notes}
                onChange={(e) => setPurchaseOrder((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </Stack>
          </Card>
        </Grid.Col>

        {/* Bill & Shipping Info Section */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card shadow="sm" padding="lg">
            <Title order={4} mb="md">
              📄 Bill & Shipping Info
            </Title>

            <Stack gap="md">
              <TextInput
                label="Bill Number"
                placeholder="Enter bill number (optional)"
                value={purchaseOrder.billNumber}
                onChange={(e) =>
                  setPurchaseOrder((prev) => ({ ...prev, billNumber: e.target.value }))
                }
                leftSection={<IconReceipt size={16} />}
              />

              <DatePickerInput
                label="Bill Date"
                placeholder="Select bill date"
                value={purchaseOrder.billDate}
                onChange={(value) =>
                  setPurchaseOrder((prev) => ({
                    ...prev,
                    billDate:
                      value &&
                      typeof value === 'object' &&
                      'getTime' in value &&
                      !isNaN((value as Date).getTime())
                        ? (value as Date)
                        : new Date(),
                  }))
                }
              />

              <NumberInput
                label="Shipping Cost"
                placeholder="Enter shipping cost"
                value={purchaseOrder.shippingCost}
                onChange={(value) =>
                  setPurchaseOrder((prev) => ({ ...prev, shippingCost: (value as number) || 0 }))
                }
                min={0}
                decimalScale={2}
                leftSection="$"
              />

              <Select
                label="Currency"
                data={[{ value: 'INR', label: 'INR - Indian Rupee' }]}
                value={purchaseOrder.currency}
                onChange={(value) =>
                  setPurchaseOrder((prev) => ({ ...prev, currency: value || 'INR' }))
                }
              />
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Products Section */}
      <Card shadow="sm" padding="lg" mt="lg">
        <Group justify="space-between" mb="md">
          <Title order={4}>📦 Add Products</Title>
          <Group>
            <Button
              leftSection={<IconPackage size={16} />}
              onClick={() => setShowProductSelectionModal(true)}
              variant="light"
              color="blue"
            >
              Select from Inventory
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={addItem}>
              Add Item
            </Button>
          </Group>
        </Group>

        <ScrollArea>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Product</Table.Th>
                <Table.Th>SKU</Table.Th>
                <Table.Th>Quantity</Table.Th>
                <Table.Th>Purchase Price</Table.Th>
                <Table.Th>GST Rate (%)</Table.Th>
                <Table.Th>GST Amount</Table.Th>
                <Table.Th>Total Price</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {purchaseOrder.items.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>
                    <TextInput
                      placeholder="Search product..."
                      value={item.productName}
                      onChange={(e) => updateItem(item.id, 'productName', e.target.value)}
                      onClick={() => setShowProductSearch(true)}
                      style={{ minWidth: 200 }}
                    />
                  </Table.Td>
                  <Table.Td>
                    <TextInput
                      placeholder="SKU"
                      value={item.sku}
                      onChange={(e) => updateItem(item.id, 'sku', e.target.value)}
                      style={{ minWidth: 100 }}
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(value) => updateItem(item.id, 'quantity', value || 0)}
                      min={1}
                      style={{ minWidth: 80 }}
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      placeholder="Price"
                      value={item.purchasePrice}
                      onChange={(value) => updateItem(item.id, 'purchasePrice', value || 0)}
                      min={0}
                      decimalScale={2}
                      style={{ minWidth: 100 }}
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      placeholder="GST %"
                      value={item.gstRate}
                      onChange={(value) => updateItem(item.id, 'gstRate', value || 0)}
                      min={0}
                      max={100}
                      style={{ minWidth: 80 }}
                    />
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      ${item.gstAmount.toFixed(2)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      ${item.totalPrice.toFixed(2)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon color="red" variant="subtle" onClick={() => removeItem(item.id)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>

        {purchaseOrder.items.length === 0 && (
          <Alert icon={<IconAlertCircle size={16} />} color="blue" mt="md">
            No items added yet. Click "Add Item" to start adding products to your purchase order.
          </Alert>
        )}
      </Card>

      {/* Totals Section */}
      <Card shadow="sm" padding="lg" mt="lg">
        <Title order={4} mb="md">
          💰 Order Totals
        </Title>

        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text>Subtotal:</Text>
                <Text fw={500}>${purchaseOrder.subtotal.toFixed(2)}</Text>
              </Group>
              <Group justify="space-between">
                <Text>Tax Amount:</Text>
                <Text fw={500}>${purchaseOrder.taxAmount.toFixed(2)}</Text>
              </Group>
              <Group justify="space-between">
                <Text>Shipping Cost:</Text>
                <Text fw={500}>${purchaseOrder.shippingCost.toFixed(2)}</Text>
              </Group>
              <Divider />
              <Group justify="space-between">
                <Text size="lg" fw={600}>
                  Total Amount:
                </Text>
                <Text size="lg" fw={600}>
                  ${purchaseOrder.totalAmount.toFixed(2)}
                </Text>
              </Group>
            </Stack>
          </Grid.Col>
        </Grid>
      </Card>

      {/* Product Search Modal */}
      <Modal
        opened={showProductSearch}
        onClose={() => setShowProductSearch(false)}
        title="Search Products from Shopify"
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            placeholder="Search products by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftSection={<IconSearch size={16} />}
          />

          <ScrollArea h={400}>
            <LoadingOverlay visible={productsLoading} />
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Product Name</Table.Th>
                  <Table.Th>SKU</Table.Th>
                  <Table.Th>Variant</Table.Th>
                  <Table.Th>Price</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {products.map((product) => (
                  <Table.Tr key={product.id}>
                    <Table.Td>
                      <Text fw={500}>{product.title}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{product.variants?.[0]?.sku || 'N/A'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{product.variants?.[0]?.title || 'Default'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">${product.variants?.[0]?.price || '0.00'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Button
                        size="xs"
                        onClick={() =>
                          handleProductSelect(purchaseOrder.items[0]?.id || '', product)
                        }
                      >
                        Select
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {products.length === 0 && !productsLoading && (
              <Alert icon={<IconAlertCircle size={16} />} color="yellow" mt="md">
                No products found. Make sure your Shopify store is connected and has products.
              </Alert>
            )}
          </ScrollArea>
        </Stack>
      </Modal>

      {/* Product Selection Modal from Inventory */}
      <ProductSelectionModal
        opened={showProductSelectionModal}
        onClose={() => setShowProductSelectionModal(false)}
        onProductSelect={handleInventoryProductSelect}
        selectedProducts={purchaseOrder.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
        }))}
      />
    </Box>
  );
};

export default PurchaseOrderManagement;
