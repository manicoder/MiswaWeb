import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Alert, Grid } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { usePermissions } from '../../../hooks/usePermissions';

// Import components
import { ShipmentDetailSkeleton } from './FulfillmentSkeletons';

// Import hooks
import { useShipment } from '../hooks/useShipment';
import { useInventory } from '../hooks/useInventory';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { useExport } from '../hooks/useExport';
import ShipmentHeader from './ShipmentDetail/ShipmentHeader';
import ShipmentSummaryCards from './ShipmentDetail/ShipmentSummaryCards';
import ShipmentProductsSection from './ShipmentDetail/ShipmentProductsSection';
import ShipmentAddProductsSection from './ShipmentDetail/ShipmentAddProductsSection';
import BarcodeScanner from '../../../components/common/BarcodeScanner';
import type { InventoryVariantWithProduct } from '../hooks/useInventory';

// CSV upload result interface
interface CSVUploadResult {
  success: boolean;
  processedCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    sku: string;
    error: string;
  }>;
}

interface ScannedProduct {
  barcode?: string;
  sku?: string;
  quantity?: number;
}

// Import BarcodeProduct type from BarcodeScanner component
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

const ShipmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  // Add state for product section loading
  const [productSectionLoading, setProductSectionLoading] = useState(false);

  // Bulk upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<CSVUploadResult | null>(null);

  // Add button loading state
  const [addButtonLoading, setAddButtonLoading] = useState(false);

  // Use custom hooks
  const {
    shipment,
    loading,
    refreshLoading,
    saving,
    loadShipment,
    updateShipmentStatus,
    updateItemQuantity,
    removeItem,
    addProductToShipment,
    getStatusColor,
  } = useShipment(id);

  const {
    inventory,
    locations,
    selectedLocationId,
    inventorySearch,
    inventoryLoading,
    locationsLoading,
    selectedInventoryItems,
    handleInventorySearch,
    handleInventoryItemSelect,
    findProductInInventory,
    handleLocationChange,
    setInventorySearch,
    setSelectedInventoryItems,
  } = useInventory();

  const {
    exportBarcodesLoading,
    exportListLoading,
    exportCsvLoading,
    exportBarcodes,
    exportProductList,
    exportCsv,
  } = useExport(shipment);

  // State for barcode scanner

  // Handle product found from barcode scanner
  const handleProductFound = async (product: ScannedProduct) => {
    if (!product) return;

    // Get the product barcode or SKU
    const identifier = product.barcode || product.sku;
    if (!identifier) {
      notifications.show({
        title: 'Error',
        message: 'Product has no valid barcode or SKU',
        color: 'red',
      });
      return;
    }

    // Check if the product is in inventory to get available quantity
    const inventoryProduct = findProductInInventory(identifier);

    if (inventoryProduct) {
      // Calculate how many are already in the shipment
      const availableQty = inventoryProduct.available || 0;
      const alreadyAddedQty = getAlreadyAddedQuantity(
        inventoryProduct.variantId,
        inventoryProduct.barcode || '',
        inventoryProduct.sku || '',
      );

      // Get the requested quantity
      const requestedQty = product.quantity || 1;
      const totalQty = alreadyAddedQty + requestedQty;

      // Check if total quantity exceeds available inventory
      if (totalQty > availableQty) {
        notifications.show({
          title: 'Quantity Limited',
          message: `Only ${availableQty} items available. Quantity adjusted.`,
          color: 'yellow',
        });
        product.quantity = Math.max(0, availableQty - alreadyAddedQty);
      }

      // Convert InventoryVariantWithProduct to ProductInfo format
      const productInfo = {
        productTitle: inventoryProduct.title,
        variantTitle: inventoryProduct.title,
        sku: inventoryProduct.sku,
        price:
          typeof inventoryProduct.price === 'number'
            ? inventoryProduct.price
            : Number(inventoryProduct.price) || 0,
        imageUrl: inventoryProduct.imageUrl,
        shopifyProductId: '', // InventoryVariantWithProduct doesn't have productId
        shopifyVariantId: inventoryProduct.variantId,
      };

      // Add the product to the shipment with the adjusted quantity and product info
      await addProductToShipment(identifier, product.quantity || 1, productInfo);
    } else {
      // Product not in inventory, use the specified quantity
      const quantity = product.quantity || 1;
      await addProductToShipment(identifier, quantity);
    }
  };

  // Helper function to check already added quantity in shipment
  const getAlreadyAddedQuantity = (variantId: string, barcode: string, sku: string): number => {
    if (!shipment || !shipment.items) return 0;

    // First try to match by variant ID
    if (variantId) {
      const matchByVariantId = shipment.items.filter((item) => item.shopifyVariantId === variantId);

      if (matchByVariantId.length > 0) {
        return matchByVariantId.reduce((total, item) => total + item.quantityPlanned, 0);
      }
    }

    // Then try by barcode
    if (barcode) {
      const matchByBarcode = shipment.items.filter((item) => item.productBarcode === barcode);

      if (matchByBarcode.length > 0) {
        return matchByBarcode.reduce((total, item) => total + item.quantityPlanned, 0);
      }
    }

    // Finally try by SKU
    if (sku) {
      const matchBySku = shipment.items.filter((item) => item.sku === sku);

      if (matchBySku.length > 0) {
        return matchBySku.reduce((total, item) => total + item.quantityPlanned, 0);
      }
    }

    return 0;
  };

  // Handle adding selected inventory items to the shipment
  const handleAddSelectedItems = async (plannedQuantities?: Record<string, number>) => {
    if (!selectedInventoryItems.size) return;

    // Set loading state to prevent multiple clicks
    setAddButtonLoading(true);

    try {
      let successCount = 0;
      let failCount = 0;
      let limitedCount = 0;

      // Find each selected item in the inventory and add it to the shipment
      for (const variantId of selectedInventoryItems) {
        // Find the product and variant in inventory
        for (const product of inventory) {
          for (const variant of product.variants) {
            if (variant.variantId === variantId) {
              // Check available quantity
              const availableQty = variant.available || 0;

              // Skip if out of stock
              if (availableQty <= 0) {
                notifications.show({
                  title: 'Out of Stock',
                  message: `${product.title} is out of stock`,
                  color: 'red',
                });
                failCount++;
                continue;
              }

              // Calculate how many are already in the shipment
              const alreadyAddedQty = shipment?.items
                ? shipment.items
                    .filter(
                      (item) =>
                        (item.shopifyVariantId && item.shopifyVariantId === variant.variantId) ||
                        (item.productBarcode && item.productBarcode === variant.barcode) ||
                        (item.sku && item.sku === variant.sku),
                    )
                    .reduce((sum, item) => sum + item.quantityPlanned, 0)
                : 0;

              // Calculate remaining quantity
              const remainingQty = Math.max(0, availableQty - alreadyAddedQty);

              // Skip if all inventory already added to shipment
              if (remainingQty <= 0) {
                notifications.show({
                  title: 'Already Added',
                  message: `All available ${product.title} units are already in the shipment`,
                  color: 'yellow',
                });
                failCount++;
                continue;
              }

              // Add the product to the shipment using barcode or sku
              const identifier = variant.barcode || variant.sku;
              if (identifier) {
                // Use planned quantity if available, otherwise default to 1
                const requestedQty = plannedQuantities?.[variantId] || 1;
                const actualQty = Math.min(requestedQty, remainingQty);

                if (actualQty < requestedQty) {
                  limitedCount++;
                }

                // Convert InventoryVariant to ProductInfo format
                const productInfo = {
                  productTitle: product.title,
                  variantTitle: product.title, // InventoryVariant doesn't have title property
                  sku: variant.sku,
                  price:
                    typeof variant.compareAtPrice === 'number'
                      ? variant.compareAtPrice
                      : Number(variant.compareAtPrice) || 0,
                  imageUrl: product.imageUrl,
                  shopifyProductId: product.productId,
                  shopifyVariantId: variant.variantId,
                };

                const success = await addProductToShipment(identifier, actualQty, productInfo);
                if (success) {
                  successCount++;
                } else {
                  failCount++;
                }
              } else {
                failCount++;
              }
            }
          }
        }
      }

      // Clear selected items after adding
      setSelectedInventoryItems(new Set());

      // Show notification with results
      if (successCount > 0) {
        let message = `Added ${successCount} items to shipment`;
        let color: 'green' | 'yellow' = 'green';

        if (limitedCount > 0) {
          message += `, ${limitedCount} with limited quantity`;
          color = 'yellow';
        }

        if (failCount > 0) {
          message += `, ${failCount} failed`;
          color = 'yellow';
        }

        notifications.show({
          title: successCount === 0 ? 'Failed' : 'Success',
          message,
          color,
        });
      } else if (failCount > 0) {
        // All items failed
      }
    } catch (error) {
      console.error('Error adding selected items:', error);
      notifications.show({
        title: 'Error',
        message: 'An error occurred while adding selected items',
        color: 'red',
      });
    } finally {
      setAddButtonLoading(false);
    }
  };

  // Wrapper function to convert InventoryVariantWithProduct to the correct ProductInfo type
  const findProductInInventoryForScanner = (
    barcodeOrSku: string,
  ): { barcode?: string; sku?: string; quantity?: number; [key: string]: unknown } | null => {
    const result = findProductInInventory(barcodeOrSku);
    if (!result) return null;

    return {
      barcode: result.barcode,
      sku: result.sku,
      quantity: 1,
      productTitle: result.title,
      variantTitle: result.title,
      price: typeof result.price === 'number' ? result.price : Number(result.price) || 0,
      imageUrl: result.imageUrl,
    };
  };

  const {
    scannerOpened,
    manualBarcode,
    manualQuantity,
    manualAddLoading,
    openScanner,
    closeScanner,
    handleBarcodeScanned,
    lookupProduct,
    handleManualBarcodeSubmit,
    setManualBarcode,
    setManualQuantity,
  } = useBarcodeScanner(handleProductFound, findProductInInventoryForScanner);

  // Wrapper function to convert ProductInfo to BarcodeProduct for BarcodeScanner
  const lookupProductForScanner = async (barcode: string): Promise<BarcodeProduct> => {
    const result = await lookupProduct(barcode);
    if (!result) {
      // Return a default BarcodeProduct when no product is found
      return {
        barcode,
        productId: '',
        variantId: '',
        title: 'Product Not Found',
        variantTitle: '',
        sku: '',
        price: 0,
        currency: 'INR',
        imageUrl: '',
        inventoryQuantity: 0,
        isFound: false,
      };
    }
    // Type guard for BarcodeProductInfo
    const isBarcodeProductInfo = (obj: unknown): obj is BarcodeProduct => {
      return (
        !!obj &&
        typeof obj === 'object' &&
        'shopifyProductId' in obj &&
        'productTitle' in obj &&
        'price' in obj
      );
    };
    if (isBarcodeProductInfo(result)) {
      return {
        barcode: typeof result.barcode === 'string' ? result.barcode : barcode,
        productId:
          typeof result.productId === 'string'
            ? result.productId
            : typeof result.shopifyProductId === 'string'
              ? result.shopifyProductId
              : '',
        variantId:
          typeof result.variantId === 'string'
            ? result.variantId
            : typeof result.shopifyVariantId === 'string'
              ? result.shopifyVariantId
              : '',
        title:
          typeof result.title === 'string'
            ? result.title
            : typeof result.productTitle === 'string'
              ? result.productTitle
              : 'Unknown Product',
        variantTitle: typeof result.variantTitle === 'string' ? result.variantTitle : '',
        sku: typeof result.sku === 'string' ? result.sku : '',
        price: typeof result.price === 'number' ? result.price : Number(result.price) || 0,
        currency: typeof result.currency === 'string' ? result.currency : 'INR',
        imageUrl: typeof result.imageUrl === 'string' ? result.imageUrl : '',
        inventoryQuantity:
          typeof result.inventoryQuantity === 'number'
            ? result.inventoryQuantity
            : (result as { availableQuantity?: number }).availableQuantity || 0,
        isFound: true,
      };
    }
    // Type guard for InventoryVariantWithProduct
    const isInventoryVariantWithProduct = (obj: unknown): obj is InventoryVariantWithProduct => {
      return (
        !!obj &&
        typeof obj === 'object' &&
        'title' in obj &&
        'variantId' in obj &&
        'price' in obj &&
        'available' in obj
      );
    };
    if (isInventoryVariantWithProduct(result)) {
      return {
        barcode: typeof result.barcode === 'string' ? result.barcode : barcode,
        productId: '',
        variantId: typeof result.variantId === 'string' ? result.variantId : '',
        title: typeof result.title === 'string' ? result.title : 'Unknown Product',
        variantTitle: typeof result.title === 'string' ? result.title : '',
        sku: typeof result.sku === 'string' ? result.sku : '',
        price: typeof result.price === 'number' ? result.price : Number(result.price) || 0,
        currency: 'INR',
        imageUrl: typeof result.imageUrl === 'string' ? result.imageUrl : '',
        inventoryQuantity: typeof result.available === 'number' ? result.available : 0,
        isFound: true,
      };
    }
    // fallback: do not access any properties on result
    return {
      barcode: typeof barcode === 'string' ? barcode : '',
      productId: '',
      variantId: '',
      title: 'Unknown Product',
      variantTitle: '',
      sku: '',
      price: 0,
      currency: 'INR',
      imageUrl: '',
      inventoryQuantity: 0,
      isFound: false,
    };
  };

  // Only allow editing in draft status
  const canEdit = shipment?.status === 'draft' || shipment?.status === 'created';

  // Modify the updateItemQuantity to run in background (no section skeleton)
  const handleUpdateItemQuantity = async (itemId: number, quantity: number) => {
    await updateItemQuantity(itemId, quantity);
  };

  // Modify the removeItem function to use local loading state
  const handleRemoveItem = async (itemId: number) => {
    setProductSectionLoading(true);
    try {
      await removeItem(itemId);
    } finally {
      setProductSectionLoading(false);
    }
  };

  // CSV Bulk Upload
  const handleCsvUpload = async () => {
    if (!csvFile || !shipment) return;

    try {
      setUploadLoading(true);
      setUploadProgress(0);

      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const csvContent = e.target?.result as string;
          const lines = csvContent.split('\n');
          const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

          const skuIndex = headers.findIndex((h) => h === 'sku');
          const fnskuIndex = headers.findIndex((h) => h === 'fnsku');
          const barcodeIndex = headers.findIndex((h) => h === 'barcode');
          const quantityIndex = headers.findIndex((h) => h === 'qty' || h === 'quantity');

          if (skuIndex === -1 && fnskuIndex === -1 && barcodeIndex === -1) {
            throw new Error('CSV must contain SKU, FNSKU, or Barcode column');
          }
          if (quantityIndex === -1) {
            throw new Error('CSV must contain Qty or Quantity column');
          }

          const processedItems = [];
          const errors = [];

          // Process CSV lines in batches
          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            const columns = lines[i].split(',').map((col) => col.trim());

            const identifiers = {
              sku: skuIndex !== -1 ? columns[skuIndex] : undefined,
              fnsku: fnskuIndex !== -1 ? columns[fnskuIndex] : undefined,
              barcode: barcodeIndex !== -1 ? columns[barcodeIndex] : undefined,
            };

            const quantity = parseInt(columns[quantityIndex] || '1', 10);

            if (!identifiers.sku && !identifiers.fnsku && !identifiers.barcode) {
              errors.push({ row: i, sku: 'N/A', error: 'Missing product identifier' });
              continue;
            }

            processedItems.push({
              identifiers,
              quantity: isNaN(quantity) ? 1 : quantity,
            });

            // Update progress less frequently
            if (i % 10 === 0) {
              requestAnimationFrame(() => {
                setUploadProgress(Math.floor((i / lines.length) * 30));
              });
            }
          }

          const itemsToAdd = [];

          // Process inventory matches
          for (const item of processedItems) {
            let found = false;
            const { sku, fnsku, barcode } = item.identifiers;
            const displayIdentifier = sku || fnsku || barcode || 'N/A';

            for (const invItem of inventory) {
              for (const variant of invItem.variants) {
                if (
                  (sku && variant.sku === sku) ||
                  (fnsku && variant.barcode === fnsku) ||
                  (barcode && variant.barcode === barcode)
                ) {
                  const barcodeToUse = variant.barcode?.trim() || variant.sku?.trim() || '';

                  if (!barcodeToUse) {
                    errors.push({
                      row: 0,
                      sku: displayIdentifier,
                      error: 'No valid barcode or SKU',
                    });
                    found = true;
                    break;
                  }

                  const availableQty = variant.available || 0;
                  if (availableQty <= 0) {
                    errors.push({
                      row: 0,
                      sku: displayIdentifier,
                      error: 'Product is out of stock',
                    });
                    found = true;
                    break;
                  }

                  const alreadyAddedQty = getAlreadyAddedQuantity(
                    variant.variantId,
                    barcodeToUse,
                    variant.sku,
                  );
                  const remainingQty = Math.max(0, availableQty - alreadyAddedQty);

                  if (remainingQty <= 0) {
                    errors.push({
                      row: 0,
                      sku: displayIdentifier,
                      error: `All ${availableQty} items already added`,
                    });
                    found = true;
                    break;
                  }

                  let actualQty = item.quantity;
                  if (item.quantity > remainingQty) {
                    actualQty = remainingQty;
                    errors.push({
                      row: 0,
                      sku: displayIdentifier,
                      error: `Quantity adjusted from ${item.quantity} to ${remainingQty}`,
                    });
                  }

                  itemsToAdd.push({
                    barcode: barcodeToUse,
                    quantity: actualQty,
                  });

                  found = true;
                  break;
                }
              }
              if (found) break;
            }

            if (!found) {
              errors.push({
                row: 0,
                sku: displayIdentifier,
                error: 'Product not found in inventory or out of stock',
              });
            }
          }

          requestAnimationFrame(() => {
            setUploadProgress(60);
          });

          // Add items to shipment in larger batches
          const UPLOAD_BATCH_SIZE = 20;
          for (let i = 0; i < itemsToAdd.length; i += UPLOAD_BATCH_SIZE) {
            const batch = itemsToAdd.slice(i, i + UPLOAD_BATCH_SIZE);

            // Process batch in parallel
            await Promise.all(
              batch.map(async (item) => {
                try {
                  if (!item.barcode?.trim()) {
                    errors.push({ row: 0, sku: item.barcode || 'N/A', error: 'Empty barcode/SKU' });
                    return;
                  }

                  // Check if the product already exists in the shipment
                  const existingQuantity = getAlreadyAddedQuantity('', item.barcode, item.barcode);
                  if (existingQuantity > 0) {
                    // Update the quantity of the existing item
                    const newQuantity = existingQuantity + item.quantity;
                    const existingItem = shipment.items.find(
                      (i) => i.productBarcode === item.barcode || i.sku === item.barcode,
                    );
                    if (existingItem) {
                      await updateItemQuantity(existingItem.id, newQuantity);
                    }
                  } else {
                    // Add as a new item - find the product info from inventory
                    let productInfo: {
                      productTitle: string;
                      variantTitle: string;
                      sku: string;
                      price: number;
                      imageUrl: string;
                      shopifyProductId: string;
                      shopifyVariantId: string;
                    } | null = null;
                    for (const invItem of inventory) {
                      for (const variant of invItem.variants) {
                        if (variant.barcode === item.barcode || variant.sku === item.barcode) {
                          productInfo = {
                            productTitle: invItem.title,
                            variantTitle: invItem.title, // InventoryVariant doesn't have title property
                            sku: variant.sku,
                            price:
                              typeof variant.price === 'number'
                                ? variant.price
                                : Number(variant.price) || 0,
                            imageUrl: invItem.imageUrl,
                            shopifyProductId: invItem.productId,
                            shopifyVariantId: variant.variantId,
                          };
                          break;
                        }
                      }
                      if (productInfo) break;
                    }
                    if (productInfo) {
                      await addProductToShipment(item.barcode, item.quantity, productInfo);
                    } else {
                      // If no product info found, add without product info
                      await addProductToShipment(item.barcode, item.quantity);
                    }
                  }
                } catch (err) {
                  console.error('Error adding product:', err);
                  errors.push({ row: 0, sku: item.barcode, error: 'Failed to add product' });
                }
              }),
            );

            // Update progress less frequently
            if (i % UPLOAD_BATCH_SIZE === 0) {
              requestAnimationFrame(() => {
                setUploadProgress(60 + Math.floor((i / itemsToAdd.length) * 40));
              });
            }
          }

          const successCount = itemsToAdd.length;
          const warningCount = errors.filter((e) => e.error.includes('adjusted')).length;
          const actualErrorCount = errors.filter((e) => !e.error.includes('adjusted')).length;

          const result: CSVUploadResult = {
            success: successCount > 0,
            processedCount: successCount,
            errorCount: actualErrorCount,
            errors,
          };

          let message = '';
          let color: 'green' | 'yellow' | 'red' = 'green';

          if (successCount > 0) {
            message = `${successCount} products added`;
            if (warningCount > 0) {
              message += `, ${warningCount} with adjusted quantity`;
              color = 'yellow';
            }
            if (actualErrorCount > 0) {
              message += `, ${actualErrorCount} failed`;
              color = 'yellow';
            }
          } else {
            message = `Failed to add any products. ${actualErrorCount} errors.`;
            color = 'red';
          }

          // Final update using requestAnimationFrame
          requestAnimationFrame(() => {
            setUploadProgress(100);
            setUploadResult(result);
          });

          // Load shipment data only once at the end
          await loadShipment();

          notifications.show({
            title: 'Upload Complete',
            message,
            color,
          });

          // Only reset progress and file, keep the result visible
          setTimeout(() => {
            requestAnimationFrame(() => {
              setUploadProgress(0);
              setCsvFile(null);
            });
          }, 1000);
        } catch (error) {
          console.error('CSV error:', error);
          notifications.show({
            title: 'Upload Failed',
            message: error instanceof Error ? error.message : 'Failed to process CSV',
            color: 'red',
          });
        } finally {
          setUploadLoading(false);
        }
      };

      reader.onerror = () => {
        setUploadLoading(false);
        notifications.show({
          title: 'Upload Failed',
          message: 'Failed to read CSV file',
          color: 'red',
        });
      };

      reader.readAsText(csvFile);
    } catch (error) {
      console.error('CSV upload error:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to upload CSV',
        color: 'red',
      });
      setUploadLoading(false);
    }
  };

  const downloadSampleCSV = () => {
    const sampleData = `SKU,FNSKU,ASIN,Title,MRP,Qty
X002C8GP3R,X002C8GP3R,B0DWMKS6J1,MyLittleTales Wooden Shapes Puzzle,1199,2
X002C8GP41,X002C8GP41,B0DWMLY397,MyLittleTales Wooden Educational Multi-functional Busy House,5455,1
fifteen-holes-shapes-intelligence-box,X002C8GNQ1,B0DVSSCB3Y,MyLittleTales Fifteen 15 Holes Shape Sorter,1780,2
3d-jigsaw-puzzle-wooden-toys-set-B,X00284OYMT,B0DT6ZC1V4,MyLittleTales 3D Wooden Jigsaw Puzzle,1780,1`;

    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_bulk_upload.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Wrapper function to match the expected loadShipment type
  const handleLoadShipment = async (): Promise<void> => {
    await loadShipment();
  };

  if (loading && !shipment) {
    return <ShipmentDetailSkeleton />;
  }

  if (!shipment) {
    return (
      <Container size="xl" p="md">
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          Shipment not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" p="md" pos="relative">
      {/* Header with actions */}
      <ShipmentHeader
        shipment={shipment}
        refreshLoading={refreshLoading}
        exportBarcodesLoading={exportBarcodesLoading}
        exportListLoading={exportListLoading}
        exportCsvLoading={exportCsvLoading}
        saving={saving}
        loadShipment={handleLoadShipment}
        exportBarcodes={exportBarcodes}
        exportProductList={exportProductList}
        exportCsv={exportCsv}
        updateShipmentStatus={updateShipmentStatus}
        navigate={navigate}
        getStatusColor={getStatusColor}
      />

      {/* Summary cards */}
      <ShipmentSummaryCards
        shipment={shipment}
        saving={saving}
        updateShipmentStatus={updateShipmentStatus}
        getStatusColor={getStatusColor}
      />

      {/* Main content */}
      <Grid gutter="md">
        {/* Add Products section (only for draft status) */}
        {canEdit && hasPermission('canEditWarehouse') && (
          <Grid.Col span={{ base: 12, md: 4 }}>
            <ShipmentAddProductsSection
              locations={locations}
              locationsLoading={locationsLoading}
              selectedLocationId={selectedLocationId}
              handleLocationChange={handleLocationChange}
              inventory={inventory}
              inventoryLoading={inventoryLoading}
              inventorySearch={inventorySearch}
              setInventorySearch={setInventorySearch}
              handleInventorySearch={handleInventorySearch}
              selectedInventoryItems={selectedInventoryItems}
              handleInventoryItemSelect={handleInventoryItemSelect}
              manualBarcode={manualBarcode}
              setManualBarcode={setManualBarcode}
              manualQuantity={manualQuantity}
              setManualQuantity={setManualQuantity}
              manualAddLoading={manualAddLoading}
              handleManualBarcodeSubmit={handleManualBarcodeSubmit}
              openScanner={openScanner}
              handleAddSelectedItems={handleAddSelectedItems}
              addButtonLoading={addButtonLoading}
              csvFile={csvFile}
              setCsvFile={setCsvFile}
              uploadProgress={uploadProgress}
              uploadLoading={uploadLoading}
              uploadResult={uploadResult}
              setUploadResult={setUploadResult}
              handleCsvUpload={handleCsvUpload}
              downloadSampleCSV={downloadSampleCSV}
              findProductInInventory={findProductInInventory}
              getAlreadyAddedQuantity={getAlreadyAddedQuantity}
              sectionLoading={productSectionLoading}
            />
          </Grid.Col>
        )}

        {/* Products List */}
        <Grid.Col span={{ base: 12, md: canEdit ? 8 : 12 }}>
          <ShipmentProductsSection
            shipment={shipment}
            canEdit={canEdit}
            updateItemQuantity={handleUpdateItemQuantity}
            removeItem={handleRemoveItem}
            inventory={inventory}
            loading={loading || productSectionLoading}
          />
        </Grid.Col>
      </Grid>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        opened={scannerOpened}
        onClose={closeScanner}
        onBarcodeScanned={handleBarcodeScanned}
        onProductFound={handleProductFound}
        lookupProduct={lookupProductForScanner}
        title="Scan Product Barcode"
        placeholder="Enter barcode to add product"
      />
    </Container>
  );
};

export default ShipmentDetail;
