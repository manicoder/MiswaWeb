import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Paper,
  Title,
  Tabs,
  Group,
  Button,
  TextInput,
  NumberInput,
  Stack,
  Text,
  Alert,
  ScrollArea,
  Table,
  Checkbox,
  FileInput,
  Progress,
  Skeleton,
  Badge,
  Modal,
  Center,
  Card,
  ActionIcon,
  Box,
  Tooltip,
} from '@mantine/core';
import {
  IconSearch,
  IconPlus,
  IconPackage,
  IconDatabase,
  IconUpload,
  IconFileText,
  IconDownload,
  IconAlertCircle,
  IconMaximize,
  IconBarcode,
  IconList,
  IconScan,
  IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import ClickableProductImage from '../../../../components/common/ClickableProductImage';
import ProductDetailModal from '../../../../components/common/ProductDetailModal';

interface UploadError {
  row: number;
  sku: string;
  error: string;
}

interface CSVUploadResult {
  success: boolean;
  processedCount: number;
  errorCount: number;
  errors: UploadError[];
}

interface InventoryVariant {
  variantId: string;
  title?: string;
  sku?: string;
  barcode?: string;
  price?: string;
  compareAtPrice?: string;
  available: number;
}

interface InventoryProduct {
  title: string;
  imageUrl?: string;
  variants: InventoryVariant[];
}

interface ShipmentAddProductsSectionProps {
  locations: Array<{ id: string; name: string }>;
  locationsLoading: boolean;
  selectedLocationId: string | null;
  handleLocationChange: (locationId: string | null) => void;
  inventory: InventoryProduct[];
  inventoryLoading: boolean;
  inventorySearch: string;
  setInventorySearch: (value: string) => void;
  handleInventorySearch: () => void;
  selectedInventoryItems: Set<string>;
  handleInventoryItemSelect: (variantId: string) => void;
  manualBarcode: string;
  setManualBarcode: (value: string) => void;
  manualQuantity: string | number;
  setManualQuantity: (value: string | number) => void;
  manualAddLoading: boolean;
  handleManualBarcodeSubmit: () => Promise<void>;
  openScanner: () => void;
  handleAddSelectedItems: (plannedQuantities?: Record<string, number>) => Promise<void>;
  addButtonLoading: boolean;
  // Bulk upload props
  csvFile: File | null;
  setCsvFile: (file: File | null) => void;
  uploadProgress: number;
  uploadLoading: boolean;
  uploadResult: CSVUploadResult | null;
  setUploadResult: (result: CSVUploadResult | null) => void;
  handleCsvUpload: () => Promise<void>;
  downloadSampleCSV: () => void;
  // Added props for quantity validation
  findProductInInventory: (barcodeOrSku: string) => InventoryVariant | null;
  getAlreadyAddedQuantity: (variantId: string, barcode: string, sku: string) => number;
  sectionLoading?: boolean;
}

const ShipmentAddProductsSection: React.FC<ShipmentAddProductsSectionProps> = ({
  inventory,
  inventoryLoading,
  inventorySearch,
  setInventorySearch,
  handleInventorySearch,
  selectedInventoryItems,
  handleInventoryItemSelect,
  manualBarcode,
  setManualBarcode,
  manualQuantity,
  setManualQuantity,
  manualAddLoading,
  handleManualBarcodeSubmit,
  openScanner,
  handleAddSelectedItems,
  addButtonLoading,
  // Bulk upload props
  csvFile,
  setCsvFile,
  uploadProgress,
  uploadLoading,
  uploadResult,
  setUploadResult,
  handleCsvUpload,
  downloadSampleCSV,
  // Added props for quantity validation
  findProductInInventory,
  getAlreadyAddedQuantity,
  sectionLoading = false,
}): React.ReactElement => {
  const [activeTab, setActiveTab] = useState('barcode');
  const [expandedModalOpen, setExpandedModalOpen] = useState(false);
  const [productDetailModalOpen, setProductDetailModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // State for planned quantities
  const [plannedQuantities, setPlannedQuantities] = useState<Record<string, number>>({});

  // Focus barcode input when tab changes to barcode
  useEffect(() => {
    if (activeTab === 'barcode') {
      barcodeInputRef.current?.focus();
    }
  }, [activeTab]);

  // Focus barcode input after adding a product
  useEffect(() => {
    if (!manualAddLoading && activeTab === 'barcode') {
      barcodeInputRef.current?.focus();
    }
  }, [manualAddLoading, activeTab]);

  const handleTabChange = (value: string | null) => {
    if (value) {
      setActiveTab(value);
    }
  };

  // Handle planned quantity change
  const handlePlannedQuantityChange = (variantId: string, value: string | number) => {
    setPlannedQuantities((prev) => ({
      ...prev,
      [variantId]: value === '' ? 1 : Number(value),
    }));
  };

  // Handle adding selected items with planned quantities
  const handleAddSelectedItemsWithQuantities = async () => {
    await handleAddSelectedItems(plannedQuantities);
  };

  // Handle product image click to show details
  const handleProductImageClick = (product: InventoryProduct) => {
    setSelectedProduct(product);
    setProductDetailModalOpen(true);
  };

  // Render inventory table
  // Filter inventory based on search term
  const filteredInventory = useMemo(() => {
    if (!inventorySearch.trim()) {
      return inventory;
    }

    const searchTerm = inventorySearch.toLowerCase().trim();
    return inventory.filter((product: InventoryProduct) => {
      // Check if product title matches
      if (product.title.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // Check if any variant matches
      return product.variants.some((variant) => {
        const skuMatch = variant.sku?.toLowerCase().includes(searchTerm);
        const barcodeMatch = variant.barcode?.toLowerCase().includes(searchTerm);
        const variantTitleMatch = variant.title?.toLowerCase().includes(searchTerm);

        return skuMatch || barcodeMatch || variantTitleMatch;
      });
    });
  }, [inventory, inventorySearch]);

  const renderInventoryTable = (expanded = false) => (
    <Table highlightOnHover withTableBorder withColumnBorders>
      <Table.Thead>
        <Table.Tr>
          <Table.Th style={{ width: expanded ? 120 : 120, textAlign: 'center' }}>Image</Table.Th>
          {expanded && <Table.Th style={{ width: 350 }}>Product</Table.Th>}
          <Table.Th style={{ width: expanded ? 150 : 300 }}>SKU/Barcode</Table.Th>
          {expanded && <Table.Th style={{ width: 120, textAlign: 'center' }}>Price</Table.Th>}
          {expanded && <Table.Th style={{ width: 120, textAlign: 'center' }}>Available</Table.Th>}
          {expanded && <Table.Th style={{ width: 120, textAlign: 'center' }}>Planned</Table.Th>}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {filteredInventory.map((product) =>
          product.variants.map((variant: InventoryVariant) => (
            <Table.Tr key={variant.variantId}>
              <Table.Td style={{ textAlign: 'center', padding: '0' }}>
                <Stack gap={0} align="center">
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    ₹{variant.compareAtPrice}
                  </Text>
                  <ClickableProductImage
                    src={product.imageUrl}
                    alt={product.title}
                    width={expanded ? 105 : 60}
                    height={expanded ? 105 : 60}
                    fit="contain"
                    onClick={() => handleProductImageClick(product)}
                  />
                  {!expanded && (
                    <Badge
                      color={variant.available > 0 ? 'green' : 'red'}
                      size="xm"
                      variant="light"
                    >
                      {variant.available}
                    </Badge>
                  )}
                </Stack>
              </Table.Td>
              {expanded && (
                <Table.Td>
                  <div style={{ maxWidth: '450px' }}>
                    <Text size="md" fw={500} lineClamp={3}>
                      {product.title}
                    </Text>
                    {variant.title && variant.title !== 'Default Title' && (
                      <Text size="sm" c="dimmed" lineClamp={2}>
                        {variant.title}
                      </Text>
                    )}
                  </div>
                </Table.Td>
              )}
              <Table.Td>
                <div style={{ maxWidth: expanded ? '150px' : '300px' }}>
                  <Group gap="xs" align="flex-start">
                    <Checkbox
                      checked={selectedInventoryItems.has(variant.variantId)}
                      onChange={() => handleInventoryItemSelect(variant.variantId)}
                      size={expanded ? 'md' : 'sm'}
                      style={{ marginTop: '2px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <Stack gap="xs">
                        <div>
                          <Text size={expanded ? 'sm' : 'xs'} c="dimmed" fw={500}>
                            SKU:
                          </Text>
                          <Text size={expanded ? 'sm' : 'xs'} fw={600} c="blue">
                            {variant.sku || 'N/A'}
                          </Text>
                        </div>
                        {variant.barcode && (
                          <div>
                            <Text size={expanded ? 'sm' : 'xs'} c="dimmed" fw={500}>
                              Barcode:
                            </Text>
                            <div
                              style={{
                                border: '2px solid var(--mantine-color-yellow-4)',
                                backgroundColor: 'var(--mantine-color-yellow-0)',
                                padding: expanded ? '4px 8px' : '2px 4px',
                                borderRadius: '4px',
                                marginTop: '2px',
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
                                lineClamp={1}
                              >
                                {variant.barcode}
                              </Text>
                            </div>
                          </div>
                        )}
                      </Stack>
                    </div>
                  </Group>
                </div>
              </Table.Td>
              {expanded && (
                <Table.Td style={{ textAlign: 'center' }}>
                  <Stack gap={2}>
                    {variant.price && (
                      <Text size="sm" fw={500}>
                        ₹{variant.price}
                      </Text>
                    )}
                    {variant.compareAtPrice && (
                      <div
                        style={{
                          backgroundColor: '#f3e8ff',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #e9d5ff',
                          display: 'inline-block',
                        }}
                      >
                        <Text size="sm" fw={600} c="violet.7">
                          ₹{variant.compareAtPrice}
                        </Text>
                      </div>
                    )}
                  </Stack>
                </Table.Td>
              )}
              {expanded && (
                <Table.Td style={{ textAlign: 'center' }}>
                  <Badge
                    color={variant.available > 0 ? 'green' : 'red'}
                    size="lg"
                    variant="light"
                    style={{ fontSize: '16px', fontWeight: 'bold' }}
                  >
                    {variant.available}
                  </Badge>
                </Table.Td>
              )}
              {expanded && (
                <Table.Td style={{ textAlign: 'center' }}>
                  <NumberInput
                    value={plannedQuantities[variant.variantId] || 1}
                    onChange={(value) => handlePlannedQuantityChange(variant.variantId, value)}
                    min={0}
                    max={variant.available}
                    w={100}
                    size="md"
                    placeholder="1"
                  />
                </Table.Td>
              )}
            </Table.Tr>
          )),
        )}
      </Table.Tbody>
    </Table>
  );

  // Render the barcode scanner tab content
  const renderBarcodeTab = () => {
    const handleBarcodeSubmit = async () => {
      if (!manualBarcode || manualAddLoading || sectionLoading) return;

      // Clean and split the barcode input
      const barcodes = manualBarcode.trim().split(/\s+/);
      const uniqueBarcode = barcodes[0]; // Take only the first barcode
      const scannedQuantity = barcodes.length;

      // Check if this barcode is already in the shipment
      const existingQuantity = getAlreadyAddedQuantity('', uniqueBarcode, uniqueBarcode);

      // If product exists in shipment, update its quantity
      if (existingQuantity > 0) {
        // Find the product in inventory to get its details
        const inventoryProduct = findProductInInventory(uniqueBarcode);
        if (inventoryProduct) {
          // Set the new quantity (existing + scanned)
          const newQuantity = existingQuantity + scannedQuantity;

          // Check available quantity
          const availableQty = inventoryProduct.available || 0;
          if (newQuantity > availableQty) {
            notifications.show({
              title: 'Quantity Limited',
              message: `Only ${availableQty} items available. Cannot add more.`,
              color: 'yellow',
            });
            setManualBarcode('');
            barcodeInputRef.current?.focus();
            return;
          }

          // Update quantity and submit
          setManualQuantity(newQuantity);
          setManualBarcode(uniqueBarcode);
          handleManualBarcodeSubmit();
          return;
        }
      }

      // If product doesn't exist in shipment, proceed with normal add
      setManualQuantity(scannedQuantity);
      setManualBarcode(uniqueBarcode);
      handleManualBarcodeSubmit();
    };

    return (
      <Stack gap="md">
        <Paper withBorder>
          <Stack gap="md" p="md">
            <TextInput
              label="Barcode"
              placeholder="Enter product barcode"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualBarcode && !manualAddLoading && !sectionLoading) {
                  e.preventDefault();
                  handleBarcodeSubmit();
                }
              }}
              disabled={manualAddLoading || sectionLoading}
              ref={barcodeInputRef}
              autoFocus
            />
            <NumberInput
              label="Quantity"
              placeholder="Enter quantity"
              value={manualQuantity}
              onChange={setManualQuantity}
              min={1}
              disabled={manualAddLoading || sectionLoading}
            />
            <Group>
              <Button
                onClick={handleBarcodeSubmit}
                loading={manualAddLoading}
                disabled={!manualBarcode || sectionLoading}
                leftSection={<IconPlus size={20} />}
              >
                Add Product
              </Button>
              <Button
                variant="light"
                onClick={openScanner}
                disabled={sectionLoading}
                leftSection={<IconScan size={20} />}
              >
                Open Scanner
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    );
  };

  // Render the inventory selection tab content
  const renderProductsTab = () => (
    <Stack gap="md">
      <Paper withBorder p="md" style={{ minHeight: '400px' }}>
        <Stack gap="md">
          <Group>
            <TextInput
              placeholder="Search by title, SKU, or barcode"
              value={inventorySearch}
              onChange={(e) => {
                setInventorySearch(e.target.value);
                // Don't trigger API call for local search
              }}
              onPaste={(e) => {
                e.preventDefault();
                const pastedText = e.clipboardData.getData('text');
                setInventorySearch(pastedText);
                // Don't trigger API call for local search
              }}
              style={{ width: '300px' }}
              leftSection={<IconSearch size={20} />}
            />

            <Tooltip label="Expand products view">
              <ActionIcon
                variant="filled"
                color="blue"
                size="md"
                onClick={() => setExpandedModalOpen(true)}
              >
                <IconMaximize size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>

          <Button
            variant="filled"
            onClick={handleAddSelectedItemsWithQuantities}
            loading={addButtonLoading}
            disabled={selectedInventoryItems.size === 0}
            leftSection={<IconPlus size={20} />}
            fullWidth
          >
            Add Selected ({selectedInventoryItems.size})
          </Button>

          {inventoryLoading && inventory.length === 0 ? (
            <Stack>
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} height={80} radius="sm" />
                ))}
            </Stack>
          ) : filteredInventory.length === 0 ? (
            <Center py="xl">
              <Stack align="center" gap="md">
                <IconDatabase size={48} color="var(--mantine-color-gray-5)" />
                <Text size="lg" c="dimmed">
                  No products found
                </Text>
              </Stack>
            </Center>
          ) : (
            <>
              <ScrollArea h={300}>{renderInventoryTable(false)}</ScrollArea>
            </>
          )}
        </Stack>
      </Paper>

      {/* Expanded View Modal */}
      <Modal
        opened={expandedModalOpen}
        onClose={() => setExpandedModalOpen(false)}
        size="90%"
        styles={{
          body: {
            height: 'calc(100vh - 80px)',
            maxHeight: 'calc(100vh - 80px)',
          },
        }}
        title={
          <Group>
            <IconDatabase size={24} />
            <Title order={3}>Inventory List - Expanded View</Title>
          </Group>
        }
      >
        <Stack gap="md" h="100%">
          <Group gap="md" align="flex-end" style={{ marginTop: '8px' }}>
            <TextInput
              placeholder="Search by title, SKU, or barcode"
              value={inventorySearch}
              onChange={(e) => {
                setInventorySearch(e.target.value);
                handleInventorySearch();
              }}
              onPaste={(e) => {
                e.preventDefault();
                const pastedText = e.clipboardData.getData('text');
                setInventorySearch(pastedText);
                handleInventorySearch();
              }}
              style={{ width: '300px' }}
              leftSection={<IconSearch size={20} />}
            />

            <Button
              variant="filled"
              onClick={handleAddSelectedItemsWithQuantities}
              loading={addButtonLoading}
              disabled={selectedInventoryItems.size === 0}
              leftSection={<IconPlus size={20} />}
            >
              Add Selected ({selectedInventoryItems.size})
            </Button>
          </Group>

          {inventoryLoading && inventory.length === 0 ? (
            <Stack>
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} height={100} radius="sm" />
                ))}
            </Stack>
          ) : filteredInventory.length === 0 ? (
            <Center py="xl">
              <Stack align="center" gap="md">
                <IconDatabase size={48} color="var(--mantine-color-gray-5)" />
                <Text size="lg" c="dimmed">
                  No products found
                </Text>
              </Stack>
            </Center>
          ) : (
            <>
              <ScrollArea h="calc(100vh - 220px)">{renderInventoryTable(true)}</ScrollArea>
            </>
          )}
        </Stack>
      </Modal>
    </Stack>
  );

  // Render the bulk upload tab content
  const renderBulkTab = () => (
    <Stack gap="md">
      <Paper withBorder>
        <Stack gap="md" p="md">
          <Group wrap="nowrap">
            <FileInput
              placeholder="Select CSV file"
              value={csvFile}
              onChange={(file) => {
                setCsvFile(file);
                // Clear previous results when selecting a new file
                setUploadResult(null);
              }}
              accept=".csv"
              style={{ flex: 1, minWidth: 0 }}
              leftSection={<IconFileText size={20} />}
              clearable
            />
            <Button
              onClick={handleCsvUpload}
              loading={uploadLoading}
              disabled={!csvFile}
              leftSection={<IconUpload size={20} />}
              w={120}
            >
              Upload
            </Button>
          </Group>

          <Group>
            <Button
              variant="light"
              onClick={downloadSampleCSV}
              leftSection={<IconDownload size={20} />}
            >
              Download Sample CSV
            </Button>
          </Group>

          {/* Progress section */}
          {uploadLoading && (
            <Stack gap="xs">
              <Text size="sm">Uploading and processing file...</Text>
              <Progress value={uploadProgress} size="sm" radius="sm" />
            </Stack>
          )}

          {/* Results section */}
          {uploadResult && (
            <Paper withBorder p="md">
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={4}>Upload Results</Title>
                  <ActionIcon
                    variant="subtle"
                    onClick={() => setUploadResult(null)}
                    color="gray"
                    size="sm"
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Group>

                <Alert
                  color={uploadResult.success ? 'green' : 'red'}
                  icon={
                    uploadResult.success ? <IconPackage size={20} /> : <IconAlertCircle size={20} />
                  }
                >
                  <Text>
                    Processed {uploadResult.processedCount} items
                    {uploadResult.errorCount > 0 && ` with ${uploadResult.errorCount} errors`}
                  </Text>
                </Alert>

                {/* Show failed uploads */}
                {uploadResult.errorCount > 0 && (
                  <Stack gap="xs">
                    <Text fw={500} c="red">
                      Failed Items:
                    </Text>
                    <ScrollArea h={200}>
                      <Table striped highlightOnHover withTableBorder withColumnBorders>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>SKU/Barcode</Table.Th>
                            <Table.Th>Error</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {uploadResult.errors
                            .filter((error) => !error.error.toLowerCase().includes('adjusted'))
                            .map((error, index) => {
                              // Extract SKU and FNSKU from the displayIdentifier
                              const [sku = '', fnsku = ''] = error.sku
                                .split(',')
                                .map((s) => s.trim());

                              // Determine the appropriate error message
                              let errorMessage = error.error;
                              if (error.error.toLowerCase().includes('out of stock')) {
                                errorMessage = 'Out of stock';
                              } else if (error.error.toLowerCase().includes('not found')) {
                                errorMessage = 'Product not found in inventory';
                              } else if (error.error.toLowerCase().includes('already added')) {
                                errorMessage = 'All items already added to shipment';
                              } else if (
                                error.error.toLowerCase().includes('missing product identifier')
                              ) {
                                errorMessage = 'Missing SKU, FNSKU, or Barcode';
                              } else if (
                                error.error.toLowerCase().includes('no valid barcode or sku')
                              ) {
                                errorMessage = 'No valid barcode or SKU';
                              } else if (
                                error.error.toLowerCase().includes('failed to add product')
                              ) {
                                errorMessage = 'Failed to add product to shipment';
                              } else if (error.error.toLowerCase().includes('empty barcode/sku')) {
                                errorMessage = 'Empty barcode/SKU';
                              }

                              return (
                                <Table.Tr key={`error-${index}`}>
                                  <Table.Td>
                                    <Stack gap={2}>
                                      <Text c="dimmed" size="sm">
                                        {sku || 'N/A'}
                                      </Text>
                                      <Box
                                        p={2}
                                        style={{
                                          border: '1px solid #FFE5B4',
                                          borderRadius: '4px',
                                          display: 'inline-block',
                                          backgroundColor: '#FFFAF0',
                                        }}
                                      >
                                        <Text fw={500}>{fnsku || 'N/A'}</Text>
                                      </Box>
                                    </Stack>
                                  </Table.Td>
                                  <Table.Td>
                                    <Text c="red">{errorMessage}</Text>
                                  </Table.Td>
                                </Table.Tr>
                              );
                            })}
                        </Table.Tbody>
                      </Table>
                    </ScrollArea>
                  </Stack>
                )}
              </Stack>
            </Paper>
          )}
        </Stack>
      </Paper>
    </Stack>
  );

  return (
    <Card withBorder>
      <Stack gap="md">
        <Title order={3}>Add Products</Title>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tabs.List>
            <Tabs.Tab value="barcode" leftSection={<IconBarcode size={20} />}>
              Barcode
            </Tabs.Tab>
            <Tabs.Tab value="inventory" leftSection={<IconList size={20} />}>
              Inventory
            </Tabs.Tab>
            <Tabs.Tab value="bulk" leftSection={<IconUpload size={20} />}>
              Bulk Upload
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="barcode">{renderBarcodeTab()}</Tabs.Panel>
          <Tabs.Panel value="inventory">{renderProductsTab()}</Tabs.Panel>
          <Tabs.Panel value="bulk">{renderBulkTab()}</Tabs.Panel>
        </Tabs>
      </Stack>

      {/* Product Detail Modal */}
      <ProductDetailModal
        opened={productDetailModalOpen}
        onClose={() => setProductDetailModalOpen(false)}
        product={
          selectedProduct
            ? {
                id: selectedProduct.variants[0]?.variantId,
                title: selectedProduct.title,
                images: selectedProduct.imageUrl
                  ? [
                      {
                        src: selectedProduct.imageUrl,
                        alt: selectedProduct.title,
                      },
                    ]
                  : [],
                variants: selectedProduct.variants.map((variant) => ({
                  id: variant.variantId,
                  variantId: variant.variantId,
                  title: variant.title,
                  sku: variant.sku,
                  barcode: variant.barcode,
                  available: variant.available,
                  inventoryQuantity: variant.available,
                })),
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : null
        }
        showActions={false}
        showInventory={true}
        showPricing={false}
        showVariants={true}
        showImages={true}
        showMetadata={true}
      />
    </Card>
  );
};

export default ShipmentAddProductsSection;
