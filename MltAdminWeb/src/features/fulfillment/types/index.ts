// Shipment status types
export type ShipmentStatus = 'draft' | 'created' | 'dispatched' | 'received' | 'completed';

// Product search result interface
export interface ProductSearchResult {
  id: string;
  title: string;
  variantTitle?: string;
  sku: string;
  barcode: string;
  price: number;
  currency: string;
  imageUrl?: string;
  availableQuantity: number;
  category?: string;
}

// CSV upload result interface
export interface CSVUploadResult {
  success: boolean;
  processedCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    sku: string;
    error: string;
  }>;
}

// Warehouse interface
export interface Warehouse {
  id: number;
  name: string;
  location?: string;
  isActive?: boolean;
}

// Shipment item interface
export interface ShipmentItem {
  id: number;
  productTitle: string;
  variantTitle?: string;
  productBarcode: string;
  sku?: string;
  shopifyVariantId?: string;
  quantityPlanned: number;
  unitPrice: number;
  compareAtPrice?: number;
  currency: string;
  productImageUrl?: string;
  isExistingItem?: boolean;
}

// Shipment interface
export interface Shipment {
  id: number;
  shipmentNumber: string;
  status: ShipmentStatus;
  createdAt: string;
  createdBy: string;
  totalItemsCount: number;
  totalValue: number;
  items: ShipmentItem[];
  sourceWarehouse?: Warehouse;
  destinationWarehouse?: Warehouse;
  notes?: string;
}

// Alias for backward compatibility
export type WarehouseShipment = Shipment;
