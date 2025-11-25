// Base order interface that all platforms should implement
export interface IBaseOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  totalPrice: string;
  currency: string;
  status: string;
  platform: 'shopify' | 'amazon' | 'flipkart';
}

// Shopify-specific order interface
export interface IShopifyOrder extends IBaseOrder {
  platform: 'shopify';
  name: string;
  fulfillmentStatus: string;
  displayFulfillmentStatus: string;
  displayFinancialStatus: string;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  lineItems: {
    id: string;
    title: string;
    quantity: number;
    originalTotalPrice: string;
    image?: {
      url: string;
      altText: string;
    };
  }[];
  shippingAddress?: {
    firstName: string;
    lastName: string;
    address1: string;
    city: string;
    province: string;
    country: string;
    zip: string;
  };
}

// Amazon-specific order interface (for future use)
export interface IAmazonOrder extends IBaseOrder {
  platform: 'amazon';
  amazonOrderId: string;
  orderStatus: string;
  fulfillmentChannel: string;
  salesChannel: string;
  orderType: string;
  // Add Amazon-specific fields as needed
}

// Flipkart-specific order interface (for future use)
export interface IFlipkartOrder extends IBaseOrder {
  platform: 'flipkart';
  flipkartOrderId: string;
  orderState: string;
  // Add Flipkart-specific fields as needed
}

// Union type for all order types
export type IOrder = IShopifyOrder | IAmazonOrder | IFlipkartOrder;

// Response interfaces
export interface IShopifyOrdersResponse {
  orders: IShopifyOrder[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
  orderType?: 'all' | 'unfulfilled' | 'today';
  isPaginated?: boolean;
}

export interface IAmazonOrdersResponse {
  orders: IAmazonOrder[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

export interface IFlipkartOrdersResponse {
  orders: IFlipkartOrder[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

// Order sync result interface
export interface OrderSyncResult {
  success: boolean;
  data?: {
    synced: number;
    totalFetched: number;
    newOrders: number;
    updatedOrders: number;
    totalLineItems: number;
    durationMs: number;
  };
  error?: string;
  message?: string;
  synced?: number;
  total?: number;
  duration?: number;
}

// Order list result interface
export interface OrderListResult {
  orders: ShopifyOrder[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  hasPrevious: boolean;
}

// Order count result interface
export interface OrderCountResult {
  total: number;
  fulfilled: number;
  unfulfilled: number;
  cancelled: number;
  pending: number;
  paid: number;
  unpaid: number;
  refunded: number;
}

// Shopify order interface (for backward compatibility)
export interface ShopifyOrder {
  id: string;
  shopifyOrderId: string;
  name: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  totalPrice: string;
  currency: string;
  status: string;
  fulfillmentStatus: string;
  displayFulfillmentStatus: string;
  displayFinancialStatus: string;
  customer?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  shippingAddress?: {
    firstName: string;
    lastName: string;
    address1: string;
    city: string;
    province: string;
    country: string;
    zip: string;
  };
  lineItems: Array<{
    id: string;
    title: string;
    quantity: number;
    originalTotal: string;
    image?: {
      url: string;
      altText?: string;
    };
  }>;
}
