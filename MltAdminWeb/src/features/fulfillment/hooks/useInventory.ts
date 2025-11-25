import { useState, useEffect, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import databaseInventoryService from '../../../services/databaseInventoryService';
import warehouseService from '../../../services/warehouseService';
import type { ProductSearchResult } from '../types';
import type { InventoryItem, InventoryVariant } from '../../../services/databaseInventoryService';

// Define a simple interface for warehouse locations
interface Warehouse {
  id: number;
  name: string;
}

// Extended type for inventory variant with product info
export interface InventoryVariantWithProduct extends InventoryVariant {
  title: string;
  imageUrl: string;
}

export const useInventory = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>('all');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [selectedInventoryItems, setSelectedInventoryItems] = useState<Set<string>>(new Set());

  // Load inventory data - load all inventory at once
  const loadInventory = useCallback(async () => {
    try {
      setInventoryLoading(true);

      const params: Record<string, unknown> = {
        page: 1,
        limit: 9999, // Backend will return all inventory when limit >= 9999
      };

      if (selectedLocationId && selectedLocationId !== 'all') {
        params.locationId = selectedLocationId;
      }

      const response = await databaseInventoryService.fetchInventory(params);

      if (response.success) {
        // Handle the inventory data based on the actual response structure
        setInventory(response.data?.inventory || []);
      } else {
        notifications.show({
          title: 'Error',
          message: response.error || 'Failed to load inventory',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load inventory data',
        color: 'red',
      });
    } finally {
      setInventoryLoading(false);
    }
  }, [selectedLocationId]);

  // Load warehouse locations
  const loadLocations = useCallback(async () => {
    try {
      setLocationsLoading(true);
      const warehouses = await warehouseService.getActiveWarehouses();

      // Map warehouses to the format we need
      setLocations(
        warehouses.map((warehouse: Warehouse) => ({
          id: warehouse.id.toString(),
          name: warehouse.name,
        })),
      );
    } catch (error) {
      console.error('Error loading locations:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load warehouse locations',
        color: 'red',
      });
    } finally {
      setLocationsLoading(false);
    }
  }, []);

  // Handle inventory search - now searches locally across all loaded inventory
  const handleInventorySearch = () => {
    // Search is now handled locally since we have all inventory loaded
    // The filtering will be done in the component using the existing inventory
    return;
  };

  // Handle inventory item selection
  const handleInventoryItemSelect = (variantId: string) => {
    setSelectedInventoryItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(variantId)) {
        newSet.delete(variantId);
      } else {
        newSet.add(variantId);
      }
      return newSet;
    });
  };

  // Find product in inventory by barcode or SKU
  const findProductInInventory = (barcodeOrSku: string): InventoryVariantWithProduct | null => {
    if (!barcodeOrSku.trim() || !inventory.length) return null;

    const searchTerm = barcodeOrSku.trim().toLowerCase();

    for (const product of inventory) {
      for (const variant of product.variants) {
        // Match by barcode or SKU
        if (
          (variant.barcode && variant.barcode.toLowerCase() === searchTerm) ||
          (variant.sku && variant.sku.toLowerCase() === searchTerm)
        ) {
          return {
            ...variant,
            title: product.title,
            imageUrl: product.imageUrl,
          };
        }
      }
    }

    return null;
  };

  // Search inventory by query - now searches across all loaded inventory
  const searchInventory = (query: string): ProductSearchResult[] => {
    if (!query || !inventory.length) return [];

    // Clean the search term
    const searchTerm = query.trim();
    if (!searchTerm) return [];

    const results: ProductSearchResult[] = [];

    // First check for exact barcode or SKU match while doing keyword search
    for (const product of inventory) {
      for (const variant of product.variants) {
        // If we find an exact barcode or SKU match, return only that product
        if (variant.barcode === searchTerm || variant.sku === searchTerm) {
          return [
            {
              id: variant.variantId,
              title: product.title,
              variantTitle: (variant as InventoryVariant & { title?: string }).title ?? '',
              sku: variant.sku,
              barcode: variant.barcode ?? '',
              price: typeof variant.price === 'number' ? variant.price : Number(variant.price) || 0,
              currency: (variant as InventoryVariant & { currency?: string }).currency ?? 'INR',
              imageUrl:
                (variant as InventoryVariant & { imageUrl?: string }).imageUrl ??
                product.imageUrl ??
                '',
              availableQuantity:
                (variant as InventoryVariant & { availableQuantity?: number }).availableQuantity ??
                variant.available ??
                0,
            },
          ];
        }

        // Continue collecting keyword matches
        const searchTermLower = searchTerm.toLowerCase();
        const titleMatch = product.title.toLowerCase().includes(searchTermLower);
        const skuMatch = variant.sku?.toLowerCase().includes(searchTermLower);
        const barcodeMatch = variant.barcode?.toLowerCase().includes(searchTermLower);
        const variantTitleMatch = (variant as InventoryVariant & { title?: string }).title
          ?.toLowerCase()
          .includes(searchTermLower);

        if (titleMatch || skuMatch || barcodeMatch || variantTitleMatch) {
          results.push({
            id: variant.variantId,
            title: product.title,
            variantTitle: (variant as InventoryVariant & { title?: string }).title ?? '',
            sku: variant.sku,
            barcode: variant.barcode ?? '',
            price: typeof variant.price === 'number' ? variant.price : Number(variant.price) || 0,
            currency: (variant as InventoryVariant & { currency?: string }).currency ?? 'INR',
            imageUrl:
              (variant as InventoryVariant & { imageUrl?: string }).imageUrl ??
              product.imageUrl ??
              '',
            availableQuantity:
              (variant as InventoryVariant & { availableQuantity?: number }).availableQuantity ??
              variant.available ??
              0,
          });
        }
      }
    }

    return results;
  };

  // Handle location tab change
  const handleLocationChange = (locationId: string | null) => {
    if (locationId) {
      setSelectedLocationId(locationId);
      // Reset selected items when changing location
      setSelectedInventoryItems(new Set());
    }
  };

  // Load locations on mount
  useEffect(() => {
    loadLocations();
    loadInventory(); // Load inventory data on mount
  }, [loadLocations, loadInventory]); // Include both functions in dependencies

  // Reload inventory when location changes
  useEffect(() => {
    if (locations.length > 0) {
      loadInventory();
    }
  }, [loadInventory, locations.length]); // Include loadInventory in dependencies

  return {
    inventory,
    locations,
    selectedLocationId,
    inventorySearch,
    inventoryLoading,
    locationsLoading,
    selectedInventoryItems,
    loadInventory,
    handleInventorySearch,
    handleInventoryItemSelect,
    findProductInInventory,
    searchInventory,
    handleLocationChange,
    setInventorySearch,
    setSelectedInventoryItems,
  };
};
