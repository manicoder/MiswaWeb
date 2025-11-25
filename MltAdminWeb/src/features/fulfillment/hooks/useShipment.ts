import { useState, useEffect, useCallback, useRef } from 'react';
import { notifications } from '@mantine/notifications';
import { warehouseShipmentService } from '../../../services/warehouseShipmentService';
import type { Shipment, ShipmentStatus } from '../types';

// Product info interface for adding products to shipment
interface ProductInfo {
  productTitle: string;
  variantTitle?: string;
  sku?: string;
  price: number;
  imageUrl?: string;
  shopifyProductId?: string;
  shopifyVariantId?: string;
  productId?: string;
  variantId?: string;
  title?: string;
  productImageUrl?: string;
  currency?: string;
}

// Request interface for adding product to shipment
interface AddProductRequest {
  shipmentId: number;
  barcode: string;
  quantity: number;
  shopifyProductId?: string;
  shopifyVariantId?: string;
  productTitle?: string;
  variantTitle?: string;
  sku?: string;
  price?: number;
  currency?: string;
  productImageUrl?: string;
}

export const useShipment = (shipmentId: string | undefined) => {
  const [loading, setLoading] = useState(true);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shipment, setShipment] = useState<Shipment | null>(null);

  // Use ref to store current shipment state to avoid dependency issues
  const shipmentRef = useRef<Shipment | null>(null);

  // Update ref whenever shipment state changes
  useEffect(() => {
    shipmentRef.current = shipment;
  }, [shipment]);

  // Load shipment data
  const loadShipment = useCallback(
    async (forceRefresh = false) => {
      if (!shipmentId) return;

      try {
        // Only set loading states if needed
        if (!shipmentRef.current) {
          setLoading(true);
        } else if (forceRefresh) {
          setRefreshLoading(true);
        }

        const response = await warehouseShipmentService.getShipmentById(parseInt(shipmentId));

        if (response.success) {
          setShipment(response.data as unknown as Shipment);
        } else {
          notifications.show({
            title: 'Error',
            message: response.error || 'Failed to load shipment',
            color: 'red',
          });
          return null;
        }
      } catch (error) {
        console.error('Error loading shipment:', error);
        notifications.show({
          title: 'Error',
          message: 'Failed to load shipment details',
          color: 'red',
        });
        return null;
      } finally {
        setLoading(false);
        setRefreshLoading(false);
      }

      return shipmentRef.current;
    },
    [shipmentId],
  );

  // Update shipment status
  const updateShipmentStatus = async (status: ShipmentStatus) => {
    if (!shipment) return;

    try {
      setSaving(true);
      const response = await warehouseShipmentService.updateShipmentStatus(shipment.id, status);

      if (response.success) {
        // Update the shipment state with the new status
        setShipment(response.data as unknown as Shipment);

        notifications.show({
          title: 'Success',
          message: `Shipment status updated to ${status.replace('_', ' ')}`,
          color: 'green',
        });
      } else {
        notifications.show({
          title: 'Error',
          message: response.error || 'Failed to update shipment status',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Error updating shipment status:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to update shipment status',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  // Update item quantity
  const updateItemQuantity = async (itemId: number, quantity: number) => {
    if (!shipment) return;

    try {
      // Optimistic update: update local state immediately without global loading
      const previousShipment = shipment;
      setShipment({
        ...shipment,
        items: shipment.items.map((it) =>
          it.id === itemId ? { ...it, quantityPlanned: quantity } : it,
        ),
      } as Shipment);

      const response = await warehouseShipmentService.updateItemQuantity(itemId, quantity);

      if (!response.success) {
        // Revert on failure
        setShipment(previousShipment);
        notifications.show({
          title: 'Error',
          message: response.error || 'Failed to update item quantity',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Error updating item quantity:', error);
      // Revert on error
      if (shipmentRef.current) {
        setShipment(shipmentRef.current);
      }
      notifications.show({
        title: 'Error',
        message: 'Failed to update item quantity',
        color: 'red',
      });
    }
  };

  // Remove item from shipment
  const removeItem = async (itemId: number) => {
    if (!shipment) return;

    try {
      setSaving(true);
      const response = await warehouseShipmentService.removeProductFromShipment(
        shipment.id,
        itemId,
      );

      if (response.success) {
        // Reload the shipment to get updated data
        await loadShipment(true);
        notifications.show({
          title: 'Success',
          message: 'Item removed from shipment',
          color: 'green',
        });
      } else {
        notifications.show({
          title: 'Error',
          message: response.error || 'Failed to remove item',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Error removing item:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to remove item from shipment',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  // Add product to shipment
  const addProductToShipment = async (
    barcode: string,
    quantity: number,
    productInfo?: ProductInfo,
  ) => {
    if (!shipment) return;

    try {
      setSaving(true);

      // Prepare the request with complete product information if available
      const request: AddProductRequest = {
        shipmentId: shipment.id,
        barcode,
        quantity,
      };

      // If we have complete product information from local inventory, include it
      if (productInfo) {
        request.shopifyProductId = productInfo.shopifyProductId || productInfo.productId || '';
        request.shopifyVariantId = productInfo.shopifyVariantId || productInfo.variantId || '';
        request.productTitle = productInfo.productTitle || productInfo.title || '';
        request.variantTitle = productInfo.variantTitle || '';
        request.sku = productInfo.sku || '';
        request.price = productInfo.price || 0;
        request.currency = productInfo.currency || 'INR';
        request.productImageUrl = productInfo.imageUrl || productInfo.productImageUrl || '';
      }

      const response = await warehouseShipmentService.addProductToShipment(request);

      if (response.success) {
        // Reload the shipment to get updated data
        await loadShipment(true);

        // Show appropriate message based on whether it was a new item or quantity update

        return true;
      } else {
        notifications.show({
          title: 'Error',
          message: response.error || 'Failed to add product',
          color: 'red',
        });
        return false;
      }
    } catch (error) {
      console.error('Error adding product:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to add product to shipment',
        color: 'red',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Get color for status badge
  const getStatusColor = (status: ShipmentStatus) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'blue';
      case 'created':
        return 'violet';
      case 'dispatched':
        return 'orange';
      case 'received':
        return 'green';
      case 'completed':
        return 'teal';
      default:
        return 'gray';
    }
  };

  // Load shipment on mount and when ID changes
  useEffect(() => {
    if (shipmentId) {
      loadShipment(false);
    }
  }, [shipmentId, loadShipment]); // Include loadShipment in dependencies

  return {
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
  };
};
