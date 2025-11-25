import { useState } from 'react';
import { notifications } from '@mantine/notifications';

interface ScannedProduct {
  barcode?: string;
  sku?: string;
  quantity?: number;
  [key: string]: unknown;
}

type ProductInfo = ScannedProduct;

export const useBarcodeScanner = (
  onProductFound: (product: ProductInfo) => Promise<void>,
  findProductInInventory: (barcodeOrSku: string) => ProductInfo | null,
) => {
  const [scannerOpened, setScannerOpened] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [manualQuantity, setManualQuantity] = useState<string | number>(1);
  const [manualAddLoading, setManualAddLoading] = useState(false);

  // Open and close scanner
  const openScanner = () => setScannerOpened(true);
  const closeScanner = () => setScannerOpened(false);

  // Handle barcode scanned
  const handleBarcodeScanned = (barcode: string) => {
    if (!barcode) return;

    // Look up the product by barcode
    lookupProduct(barcode);
  };

  // Lookup product by barcode
  const lookupProduct = async (barcode: string): Promise<ProductInfo | null> => {
    // Check if the product exists in local inventory only
    const product = findProductInInventory(barcode);

    if (product) {
      await onProductFound(product);
      return product;
    }

    // Product not found in local inventory
    notifications.show({
      title: 'Product Not Found',
      message: `No product found with barcode ${barcode} in local inventory`,
      color: 'yellow',
    });
    return null;
  };

  // Handle manual barcode submit
  const handleManualBarcodeSubmit = async () => {
    if (!manualBarcode) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a barcode',
        color: 'red',
      });
      return;
    }

    try {
      setManualAddLoading(true);

      // Simple normalization: just trim and split by whitespace
      const cleanBarcode = manualBarcode.trim();
      if (!cleanBarcode) {
        notifications.show({
          title: 'Error',
          message: 'Please enter a valid barcode',
          color: 'red',
        });
        return;
      }

      // Split by any whitespace
      const barcodes = cleanBarcode.split(/\s+/);
      const uniqueBarcode = barcodes[0]; // Take only the first barcode
      const scannedQuantity = barcodes.length;

      // First check if the product exists in local inventory
      const inventoryProduct = findProductInInventory(uniqueBarcode);

      if (inventoryProduct) {
        // Set the quantity based on manual input or number of scanned barcodes
        const requestedQuantity =
          typeof manualQuantity === 'string'
            ? parseInt(manualQuantity) || scannedQuantity
            : manualQuantity;

        // Set the quantity on the product if it's a ScannedProduct
        if ('quantity' in inventoryProduct) {
          inventoryProduct.quantity = requestedQuantity;
        }

        // Call the onProductFound callback with the product
        await onProductFound(inventoryProduct);

        // Reset the form
        setManualBarcode('');
        setManualQuantity(1);
        return;
      }

      // If not found in local inventory, show error
      notifications.show({
        title: 'Product Not Found',
        message: `No product found with barcode ${uniqueBarcode} in local inventory`,
        color: 'yellow',
      });
    } finally {
      setManualAddLoading(false);
    }
  };

  return {
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
  };
};
