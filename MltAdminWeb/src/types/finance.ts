// Finance Module Types
import { BaseEntity } from './index';

// ===== SALES & REVENUE TYPES =====
export interface SalesSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  period: 'day' | 'week' | 'month' | 'year';
  startDate: string;
  endDate: string;
  currency: string;
}

export interface RevenueBreakdown {
  date: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

export interface ProductPerformance {
  productId: string;
  productTitle: string;
  sku: string;
  totalRevenue: number;
  totalSold: number;
  averagePrice: number;
  costPrice: number;
  grossMargin: number;
  grossMarginPercentage: number;
  profit: number;
}

export interface SalesFilter {
  startDate: string;
  endDate: string;
  productIds?: string[];
  locationIds?: string[];
  currency?: string;
}

// ===== EXPENSE TYPES =====
export interface Expense extends BaseEntity {
  type: ExpenseType;
  category: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  paymentMode: string; // Cash, Card, Bank Transfer, UPI, etc.
  paidTo: string; // Person or entity paid to
  chartOfAccountCode?: string; // Mapping to chart of accounts
  chartOfAccountName?: string; // Chart of account name for display
  tags: string[];
  receiptUrl?: string;
  createdBy: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

export type ExpenseType =
  | 'rent'
  | 'utilities'
  | 'transport'
  | 'advertising'
  | 'shipping'
  | 'salaries'
  | 'tools'
  | 'marketing'
  | 'software'
  | 'inventory'
  | 'maintenance'
  | 'insurance'
  | 'legal'
  | 'consulting'
  | 'travel'
  | 'meals'
  | 'office_supplies'
  | 'other';

export interface ExpenseCategory {
  id: string;
  name: string;
  type: ExpenseType;
  description?: string;
  isActive: boolean;
}

export interface PaymentMode {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ExpenseTag {
  id: string;
  name: string;
  displayName: string;
  color?: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type: string; // Asset, Liability, Equity, Revenue, Expense
  description?: string;
  parentCode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChartOfAccountCreate {
  code: string;
  name: string;
  type: string;
  description?: string;
  parentCode?: string;
}

export interface ChartOfAccountUpdate {
  name?: string;
  type?: string;
  description?: string;
  parentCode?: string;
  isActive?: boolean;
}

export interface ExpenseFilter {
  startDate?: string;
  endDate?: string;
  types?: ExpenseType[];
  categories?: string[];
  tags?: string[];
  status?: 'pending' | 'approved' | 'rejected';
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

// ===== PRODUCT COST TYPES =====
export interface ProductCost extends BaseEntity {
  productId: string;
  variantId: string;
  sku: string;
  costPrice: number;
  currency: string;
  supplier?: string;
  notes?: string;
  lastUpdatedBy: string;
}

export interface ProductCostUpdate {
  productId: string;
  variantId: string;
  costPrice: number;
  currency?: string;
  supplier?: string;
  notes?: string;
}

// ===== PROFIT & LOSS TYPES =====
export interface ProfitLossSummary {
  period: 'month' | 'quarter' | 'year';
  startDate: string;
  endDate: string;
  currency: string;

  // Revenue
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;

  // Costs
  totalCostOfGoods: number;
  totalExpenses: number;

  // Profit
  grossProfit: number;
  grossMargin: number;
  netProfit: number;
  netMargin: number;

  // Breakdown
  revenueBreakdown: RevenueBreakdown[];
  expenseBreakdown: ExpenseBreakdown[];
  productPerformance: ProductPerformance[];
}

export interface ExpenseBreakdown {
  category: string;
  type: ExpenseType;
  totalAmount: number;
  percentage: number;
  count: number;
}

export interface ProfitLossComparison {
  currentPeriod: ProfitLossSummary;
  previousPeriod: ProfitLossSummary;
  changes: {
    revenueChange: number;
    revenueChangePercentage: number;
    profitChange: number;
    profitChangePercentage: number;
    marginChange: number;
  };
}

// ===== PAYOUT TYPES =====
export interface Payout extends BaseEntity {
  payoutId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed';
  expectedDate: string;
  actualDate?: string;
  fees: number;
  netAmount: number;
  orderIds: string[];
  period: {
    startDate: string;
    endDate: string;
  };
  notes?: string;
}

export interface PayoutReconciliation {
  payoutId: string;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  matchedOrders: number;
  unmatchedOrders: number;
  fees: number;
  status: 'reconciled' | 'unreconciled' | 'partial';
}

export interface PayoutFilter {
  startDate?: string;
  endDate?: string;
  status?: 'pending' | 'paid' | 'failed';
  minAmount?: number;
  maxAmount?: number;
}

// ===== TAX TYPES =====
export interface TaxSummary {
  period: string;
  country: string;
  state?: string;
  taxType: 'GST' | 'VAT' | 'HST' | 'PST' | 'other';
  totalTaxCollected: number;
  totalTaxableAmount: number;
  taxRate: number;
  currency: string;
  orderCount: number;
}

export interface TaxReport {
  period: string;
  currency: string;
  totalTaxCollected: number;
  totalTaxableAmount: number;
  breakdown: TaxSummary[];
  generatedAt: string;
  generatedBy: string;
}

export interface TaxFilter {
  startDate: string;
  endDate: string;
  countries?: string[];
  states?: string[];
  taxTypes?: string[];
}

// ===== DASHBOARD TYPES =====
export interface FinanceDashboard {
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    grossMargin: number;
    netMargin: number;
    averageOrderValue: number;
  };
  charts: {
    revenueChart: RevenueBreakdown[];
    expenseChart: ExpenseBreakdown[];
    profitChart: {
      date: string;
      revenue: number;
      expenses: number;
      profit: number;
    }[];
  };
  topProducts: ProductPerformance[];
  recentExpenses: Expense[];
  upcomingPayouts: Payout[];
}

// ===== REPORT TYPES =====
export interface ReportRequest {
  type: 'sales' | 'expenses' | 'profit-loss' | 'payouts' | 'taxes';
  format: 'csv' | 'pdf';
  filters: SalesFilter | ExpenseFilter | PayoutFilter | TaxFilter;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  customPeriod?: {
    startDate: string;
    endDate: string;
  };
}

export interface ReportResponse {
  downloadUrl: string;
  fileName: string;
  generatedAt: string;
  recordCount: number;
}

// ===== API RESPONSE TYPES =====
export interface FinanceApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedFinanceResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ===== SUPPLIER TYPES =====
export interface Supplier {
  id: string;
  name: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  paymentTerms?: string;
  notes?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ===== PURCHASE ORDER TYPES =====
export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  variantId: string;
  sku: string;
  productName: string;
  variantTitle?: string;
  quantity: number;
  purchasePrice: number;
  totalPrice: number;
  gstAmount: number;
  gstRate: number;
  quantityReceived: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplier: Supplier;
  purchaseDate: string;
  referenceNumber?: string;
  billNumber?: string;
  billDate?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  subtotal: number;
  taxAmount: number;
  gstAmount: number;
  gstRate: number;
  shippingCost: number;
  totalAmount: number;
  totalPaid: number;
  balanceDue: number;
  currency: string;
  status: 'draft' | 'ordered' | 'received' | 'cancelled';
  invoiceUrl?: string;
  isReceived: boolean;
  receivedDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items: PurchaseOrderItem[];
  payments: SupplierPayment[];
}

export interface CreatePurchaseOrderItem {
  productId: string;
  variantId: string;
  sku: string;
  productName: string;
  variantTitle?: string;
  quantity: number;
  purchasePrice: number;
  gstAmount: number;
  gstRate: number;
  notes?: string;
}

export interface CreatePurchaseOrder {
  supplierId: string;
  purchaseDate: string;
  referenceNumber?: string;
  billNumber?: string;
  billDate?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  taxAmount: number;
  gstAmount: number;
  gstRate: number;
  shippingCost: number;
  currency: string;
  items: CreatePurchaseOrderItem[];
  createdBy: string;
}

export interface UpdatePurchaseOrder {
  supplierId?: string;
  purchaseDate?: string;
  referenceNumber?: string;
  billNumber?: string;
  billDate?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  taxAmount?: number;
  gstAmount?: number;
  gstRate?: number;
  shippingCost?: number;
  currency?: string;
  status?: string;
  invoiceUrl?: string;
  isReceived?: boolean;
  receivedDate?: string;
}

// ===== SUPPLIER PAYMENT TYPES =====
export interface SupplierPayment {
  id: string;
  purchaseOrderId: string;
  supplierId: string;
  paymentNumber: string;
  paymentDate: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierPayment {
  purchaseOrderId: string;
  supplierId: string;
  paymentDate: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  createdBy: string;
}

export interface UpdateSupplierPayment {
  paymentDate?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
  status?: string;
}

// ===== FILTER TYPES =====
export interface PurchaseOrderFilter {
  startDate?: string;
  endDate?: string;
  supplierId?: string;
  status?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  isReceived?: boolean;
}

export interface SupplierPaymentFilter {
  purchaseOrderId?: string;
  supplierId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateSupplier {
  name: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  paymentTerms?: string;
  notes?: string;
  createdBy: string;
}

export interface UpdateSupplier {
  name?: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  paymentTerms?: string;
  notes?: string;
  isActive?: boolean;
}

export interface ReceivePurchaseOrder {
  receivedDate?: string;
  notes?: string;
  items: {
    itemId: string;
    quantityReceived: number;
    notes?: string;
  }[];
}

export interface PurchaseOrderSummary {
  totalOrders: number;
  totalAmount: number;
  averageOrderValue: number;
  pendingOrders: number;
  receivedOrders: number;
  cancelledOrders: number;
  currency: string;
}

// ===== PURCHASE ORDER WORKFLOW TYPES =====
export interface PurchaseOrderJourneyEntry {
  id: string;
  purchaseOrderId: string;
  fromStatus: string;
  toStatus: string;
  notes?: string;
  actionBy?: string;
  createdAt: string;
}

export interface UpdatePurchaseOrderStatusRequest {
  newStatus: string;
  notes?: string;
  actionBy?: string;
}

export interface PurchaseOrderStatusTransition {
  currentStatus: string;
  availableTransitions: string[];
  canTransition: boolean;
  transitionMessage?: string;
}

export interface PurchaseOrderWorkflow {
  id: string;
  poNumber: string;
  status: string;
  journey: PurchaseOrderJourneyEntry[];
  availableTransitions: PurchaseOrderStatusTransition;
  createdAt: string;
  updatedAt: string;
}
