// Shopify Store Connection Types
export interface ShopifyStore {
  id: string;
  storeName: string;
  shopDomain: string;
  isConnected: boolean;
  connectedAt: string;
  lastSyncAt?: string;
  status: 'active' | 'inactive' | 'error';
}

export interface ShopifyStoreConnection {
  storeName: string;
  accessToken: string;
  shopDomain?: string;
}

export interface ShopifyConnectionStatus {
  isConnected: boolean;
  store?: ShopifyStore;
  error?: string;
}

// Shopify Product Types (from Shopify API)
export interface ShopifyProduct {
  id: string;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  created_at: string;
  updated_at: string;
  published_at: string;
  template_suffix: string;
  status: 'active' | 'archived' | 'draft';
  published_scope: string;
  tags: string;
  admin_graphql_api_id: string;
  variants: ShopifyProductVariant[];
  options: ShopifyProductOption[];
  images: ShopifyProductImage[];
  image: ShopifyProductImage;
}

export interface ShopifyProductVariant {
  id: string;
  product_id: string;
  title: string;
  price: string;
  priceV2: {
    amount: string;
    currencyCode: string;
  };
  sku: string;
  position: number;
  inventory_policy: string;
  compare_at_price: string;
  fulfillment_service: string;
  inventory_management: string;
  option1: string;
  option2: string;
  option3: string;
  created_at: string;
  updated_at: string;
  taxable: boolean;
  barcode: string;
  grams: number;
  image_id: string;
  weight: number;
  weight_unit: string;
  inventory_item_id: string;
  inventory_quantity: number;
  old_inventory_quantity: number;
  requires_shipping: boolean;
  admin_graphql_api_id: string;
}

export interface ShopifyProductOption {
  id: string;
  product_id: string;
  name: string;
  position: number;
  values: string[];
}

export interface ShopifyProductImage {
  id: string;
  product_id: string;
  position: number;
  created_at: string;
  updated_at: string;
  alt: string;
  width: number;
  height: number;
  src: string;
  variant_ids: string[];
  admin_graphql_api_id: string;
}

// Shopify Customer Types
export interface ShopifyCustomer {
  id: string;
  email: string;
  accepts_marketing: boolean;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  orders_count: number;
  state: string;
  total_spent: string;
  last_order_id: string;
  note: string;
  verified_email: boolean;
  multipass_identifier: string;
  tax_exempt: boolean;
  phone: string;
  tags: string;
  last_order_name: string;
  currency: string;
  addresses: ShopifyAddress[];
  accepts_marketing_updated_at: string;
  marketing_opt_in_level: string;
  tax_exemptions: string[];
  admin_graphql_api_id: string;
  default_address: ShopifyAddress;
}

export interface ShopifyAddress {
  id: string;
  customer_id: string;
  first_name: string;
  last_name: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  province: string;
  country: string;
  zip: string;
  phone: string;
  name: string;
  province_code: string;
  country_code: string;
  country_name: string;
  default: boolean;
}

// Shopify Order Types
export interface ShopifyOrder {
  id: string;
  admin_graphql_api_id: string;
  app_id: number;
  browser_ip: string;
  buyer_accepts_marketing: boolean;
  cancel_reason: string;
  cancelled_at: string;
  cart_token: string;
  checkout_id: string;
  checkout_token: string;
  closed_at: string;
  confirmed: boolean;
  contact_email: string;
  created_at: string;
  currency: string;
  current_subtotal_price: string;
  current_subtotal_price_set: ShopifyMoneySet;
  current_total_discounts: string;
  current_total_discounts_set: ShopifyMoneySet;
  current_total_duties_set: ShopifyMoneySet;
  current_total_price: string;
  current_total_price_set: ShopifyMoneySet;
  current_total_tax: string;
  current_total_tax_set: ShopifyMoneySet;
  customer_locale: string;
  device_id: string;
  discount_codes: ShopifyDiscountCode[];
  email: string;
  estimated_taxes: boolean;
  financial_status: string;
  fulfillment_status: string;
  gateway: string;
  landing_site: string;
  landing_site_ref: string;
  location_id: string;
  name: string;
  note: string;
  note_attributes: ShopifyNoteAttribute[];
  number: number;
  order_number: number;
  order_status_url: string;
  original_total_duties_set: ShopifyMoneySet;
  payment_gateway_names: string[];
  phone: string;
  presentment_currency: string;
  processed_at: string;
  processing_method: string;
  reference: string;
  referring_site: string;
  source_identifier: string;
  source_name: string;
  source_url: string;
  subtotal_price: string;
  subtotal_price_set: ShopifyMoneySet;
  tags: string;
  tax_lines: ShopifyTaxLine[];
  taxes_included: boolean;
  test: boolean;
  token: string;
  total_discounts: string;
  total_discounts_set: ShopifyMoneySet;
  total_line_items_price: string;
  total_line_items_price_set: ShopifyMoneySet;
  total_outstanding: string;
  total_price: string;
  total_price_set: ShopifyMoneySet;
  total_price_usd: string;
  total_shipping_price_set: ShopifyMoneySet;
  total_tax: string;
  total_tax_set: ShopifyMoneySet;
  total_tip_received: string;
  total_weight: number;
  updated_at: string;
  user_id: string;
  billing_address: ShopifyAddress;
  customer: ShopifyCustomer;
  discount_applications: ShopifyDiscountApplication[];
  fulfillments: ShopifyFulfillment[];
  line_items: ShopifyLineItem[];
  payment_terms: ShopifyPaymentTerms;
  refunds: ShopifyRefund[];
  shipping_address: ShopifyAddress;
  shipping_lines: ShopifyShippingLine[];
}

export interface ShopifyMoneySet {
  shop_money: ShopifyMoney;
  presentment_money: ShopifyMoney;
}

export interface ShopifyMoney {
  amount: string;
  currency_code: string;
}

export interface ShopifyDiscountCode {
  code: string;
  amount: string;
  type: string;
}

export interface ShopifyNoteAttribute {
  name: string;
  value: string;
}

export interface ShopifyTaxLine {
  price: string;
  rate: number;
  title: string;
  price_set: ShopifyMoneySet;
}

export interface ShopifyDiscountApplication {
  target_type: string;
  type: string;
  value: string;
  value_type: string;
  allocation_method: string;
  target_selection: string;
  title: string;
  description: string;
}

export interface ShopifyFulfillment {
  id: string;
  order_id: string;
  status: string;
  created_at: string;
  service: string;
  updated_at: string;
  tracking_company: string;
  tracking_number: string;
  tracking_numbers: string[];
  tracking_url: string;
  tracking_urls: string[];
  receipt: ShopifyFulfillmentReceipt;
  name: string;
  admin_graphql_api_id: string;
  line_items: ShopifyLineItem[];
}

export interface ShopifyFulfillmentReceipt {
  testcase: boolean;
  authorization: string;
}

export interface ShopifyLineItem {
  id: string;
  admin_graphql_api_id: string;
  fulfillable_quantity: number;
  fulfillment_service: string;
  fulfillment_status: string;
  gift_card: boolean;
  grams: number;
  name: string;
  origin_location: ShopifyOriginLocation;
  price: string;
  price_set: ShopifyMoneySet;
  product_exists: boolean;
  product_id: string;
  properties: ShopifyProperty[];
  quantity: number;
  requires_shipping: boolean;
  sku: string;
  taxable: boolean;
  title: string;
  total_discount: string;
  total_discount_set: ShopifyMoneySet;
  variant_id: string;
  variant_inventory_management: string;
  variant_title: string;
  vendor: string;
  tax_lines: ShopifyTaxLine[];
  duties: ShopifyDuty[];
  discount_allocations: ShopifyDiscountAllocation[];
}

export interface ShopifyOriginLocation {
  id: string;
  country_code: string;
  province_code: string;
  name: string;
  address1: string;
  address2: string;
  city: string;
  zip: string;
}

export interface ShopifyProperty {
  name: string;
  value: string;
}

export interface ShopifyDuty {
  id: string;
  harmonized_system_code: string;
  country_code_of_origin: string;
  shop_money: ShopifyMoney;
  presentment_money: ShopifyMoney;
  tax_lines: ShopifyTaxLine[];
  admin_graphql_api_id: string;
}

export interface ShopifyDiscountAllocation {
  amount: string;
  amount_set: ShopifyMoneySet;
  discount_application_index: number;
}

export interface ShopifyPaymentTerms {
  amount: number;
  currency: string;
  payment_terms_name: string;
  payment_terms_type: string;
  due_in_days: number;
  payment_schedules: ShopifyPaymentSchedule[];
}

export interface ShopifyPaymentSchedule {
  amount: number;
  currency: string;
  issued_at: string;
  due_at: string;
  completed_at: string;
  expected_payment_method: string;
}

export interface ShopifyRefund {
  id: string;
  order_id: string;
  created_at: string;
  note: string;
  user_id: string;
  processed_at: string;
  restock: boolean;
  duties: ShopifyDuty[];
  admin_graphql_api_id: string;
  refund_line_items: ShopifyRefundLineItem[];
  transactions: ShopifyTransaction[];
  order_adjustments: ShopifyOrderAdjustment[];
}

export interface ShopifyRefundLineItem {
  id: string;
  quantity: number;
  line_item_id: string;
  location_id: string;
  restock_type: string;
  subtotal: number;
  subtotal_set: ShopifyMoneySet;
  total_tax: number;
  total_tax_set: ShopifyMoneySet;
  line_item: ShopifyLineItem;
}

export interface ShopifyTransaction {
  id: string;
  order_id: string;
  kind: string;
  gateway: string;
  status: string;
  message: string;
  created_at: string;
  test: boolean;
  authorization: string;
  location_id: string;
  user_id: string;
  parent_id: string;
  processed_at: string;
  device_id: string;
  receipt: unknown;
  currency_exchange_adjustment: unknown;
  amount: string;
  currency: string;
  admin_graphql_api_id: string;
}

export interface ShopifyOrderAdjustment {
  id: string;
  order_id: string;
  refund_id: string;
  amount: string;
  amount_set: ShopifyMoneySet;
  kind: string;
  reason: string;
  admin_graphql_api_id: string;
}

export interface ShopifyShippingLine {
  id: string;
  carrier_identifier: string;
  code: string;
  delivery_category: string;
  discounted_price: string;
  discounted_price_set: ShopifyMoneySet;
  phone: string;
  price: string;
  price_set: ShopifyMoneySet;
  requested_fulfillment_service_id: string;
  source: string;
  title: string;
  tax_lines: ShopifyTaxLine[];
  discount_allocations: ShopifyDiscountAllocation[];
}

// API Response Types
export interface ShopifyApiResponse<T> {
  data?: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface ShopifyProductsResponse {
  products: ShopifyProduct[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ShopifyCustomersResponse {
  customers: ShopifyCustomer[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ShopifyOrdersResponse {
  orders: ShopifyOrder[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Inventory Types
export interface VariantInventory {
  variantId: string;
  sku: string;
  barcode?: string;
  price: string;
  compareAtPrice?: string;
  inventoryItemId: string;
  available: number;
}

export interface ProductInventory {
  productId: string;
  title: string;
  status?: string;
  imageUrl?: string;
  imageAltText?: string;
  variants: VariantInventory[];
}

export interface ShopifyLocation {
  id: string;
  name: string;
  address?: {
    address1?: string;
    city?: string;
    province?: string;
    country?: string;
    zip?: string;
  };
  isActive: boolean;
  legacy: boolean;
  fulfillsOnlineOrders: boolean;
  hasActiveInventory: boolean;
}

export interface ShopifyInventoryResponse {
  inventory: ProductInventory[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string;
    endCursor: string;
  };
  total: number;
  totalProducts: number;
  totalVariants: number;
  limit: number;
  hasMore: boolean;
  locationId: string;
}

export interface ShopifyLocationsResponse {
  locations: ShopifyLocation[];
  total: number;
}
