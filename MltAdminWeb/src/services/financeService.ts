import { api, API_ENDPOINTS } from './api';
import type {
  SalesSummary,
  RevenueBreakdown,
  ProductPerformance,
  SalesFilter,
  Expense,
  ExpenseCategory,
  PaymentMode,
  ExpenseTag,
  ExpenseFilter,
  ChartOfAccount,
  ChartOfAccountCreate,
  ChartOfAccountUpdate,
  ProductCost,
  ProductCostUpdate,
  ProfitLossSummary,
  ProfitLossComparison,
  Payout,
  PayoutReconciliation,
  PayoutFilter,
  TaxSummary,
  TaxReport,
  TaxFilter,
  FinanceDashboard,
  ReportRequest,
  ReportResponse,
  FinanceApiResponse,
  PaginatedFinanceResponse,
  Supplier,
  CreateSupplier,
  UpdateSupplier,
  PurchaseOrder,
  CreatePurchaseOrder,
  UpdatePurchaseOrder,
  ReceivePurchaseOrder,
  PurchaseOrderSummary,
  SupplierPayment,
  CreateSupplierPayment,
  UpdateSupplierPayment,
  SupplierPaymentFilter,
  PurchaseOrderFilter,
  PurchaseOrderWorkflow,
  UpdatePurchaseOrderStatusRequest,
  PurchaseOrderStatusTransition,
  PurchaseOrderJourneyEntry,
} from '../types/finance';

// ===== SALES & REVENUE SERVICES =====
export const salesService = {
  // Get sales summary for a period
  getSalesSummary: async (filter: SalesFilter): Promise<SalesSummary> => {
    const response = await api.get<FinanceApiResponse<SalesSummary>>(
      `${API_ENDPOINTS.FINANCE_SALES_SUMMARY}?${new URLSearchParams({
        startDate: filter.startDate,
        endDate: filter.endDate,
        ...(filter.productIds && { productIds: filter.productIds.join(',') }),
        ...(filter.locationIds && { locationIds: filter.locationIds.join(',') }),
        ...(filter.currency && { currency: filter.currency }),
      })}`,
    );
    return response.data.data;
  },

  // Get revenue breakdown for charting
  getRevenueBreakdown: async (filter: SalesFilter): Promise<RevenueBreakdown[]> => {
    const response = await api.get<FinanceApiResponse<RevenueBreakdown[]>>(
      `${API_ENDPOINTS.FINANCE_REVENUE_BREAKDOWN}?${new URLSearchParams({
        startDate: filter.startDate,
        endDate: filter.endDate,
        ...(filter.productIds && { productIds: filter.productIds.join(',') }),
        ...(filter.locationIds && { locationIds: filter.locationIds.join(',') }),
        ...(filter.currency && { currency: filter.currency }),
      })}`,
    );
    return response.data.data;
  },

  // Get product performance analysis
  getProductPerformance: async (filter: SalesFilter): Promise<ProductPerformance[]> => {
    const response = await api.get<FinanceApiResponse<ProductPerformance[]>>(
      `${API_ENDPOINTS.FINANCE_PRODUCT_PERFORMANCE}?${new URLSearchParams({
        startDate: filter.startDate,
        endDate: filter.endDate,
        ...(filter.productIds && { productIds: filter.productIds.join(',') }),
        ...(filter.locationIds && { locationIds: filter.locationIds.join(',') }),
        ...(filter.currency && { currency: filter.currency }),
      })}`,
    );
    return response.data.data;
  },
};

// ===== EXPENSE SERVICES =====
export const expenseService = {
  // Get expenses with pagination and filtering
  getExpenses: async (
    filter: ExpenseFilter,
    page = 1,
    limit = 20,
  ): Promise<PaginatedFinanceResponse<Expense>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filter.startDate && { startDate: filter.startDate }),
      ...(filter.endDate && { endDate: filter.endDate }),
      ...(filter.types && { type: filter.types.join(',') }),
      ...(filter.categories && { category: filter.categories.join(',') }),
      ...(filter.status && { status: filter.status }),
      ...(filter.minAmount && { minAmount: filter.minAmount.toString() }),
      ...(filter.maxAmount && { maxAmount: filter.maxAmount.toString() }),
      ...(filter.search && { search: filter.search }),
    });

    const response = await api.get<FinanceApiResponse<PaginatedFinanceResponse<Expense>>>(
      `${API_ENDPOINTS.FINANCE_EXPENSES}?${params}`,
    );
    return response.data.data;
  },

  // Get single expense
  getExpense: async (id: string): Promise<Expense> => {
    const response = await api.get<FinanceApiResponse<Expense>>(
      `${API_ENDPOINTS.FINANCE_EXPENSES}/${id}`,
    );
    return response.data.data;
  },

  // Create new expense
  createExpense: async (
    expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Expense> => {
    const response = await api.post<FinanceApiResponse<Expense>>(API_ENDPOINTS.FINANCE_EXPENSES, {
      type: expense.type,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      date: expense.date,
      paymentMode: expense.paymentMode,
      paidTo: expense.paidTo,
      chartOfAccountCode: expense.chartOfAccountCode,
      chartOfAccountName: expense.chartOfAccountName,
      tags: expense.tags,
      receiptUrl: expense.receiptUrl,
      notes: expense.notes,
      createdBy: expense.createdBy,
    });
    return response.data.data;
  },

  // Update expense
  updateExpense: async (id: string, expense: Partial<Expense>): Promise<Expense> => {
    const response = await api.put<FinanceApiResponse<Expense>>(
      `${API_ENDPOINTS.FINANCE_EXPENSES}/${id}`,
      {
        type: expense.type,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        date: expense.date,
        paymentMode: expense.paymentMode,
        paidTo: expense.paidTo,
        chartOfAccountCode: expense.chartOfAccountCode,
        chartOfAccountName: expense.chartOfAccountName,
        tags: expense.tags,
        receiptUrl: expense.receiptUrl,
        notes: expense.notes,
        status: expense.status,
      },
    );
    return response.data.data;
  },

  // Delete expense
  deleteExpense: async (id: string): Promise<void> => {
    await api.delete(`${API_ENDPOINTS.FINANCE_EXPENSES}/${id}`);
  },

  // Get expense categories
  getExpenseCategories: async (): Promise<ExpenseCategory[]> => {
    const response = await api.get<FinanceApiResponse<ExpenseCategory[]>>(
      API_ENDPOINTS.FINANCE_EXPENSE_CATEGORIES,
    );
    return response.data.data;
  },

  // Create expense category
  createExpenseCategory: async (
    category: Omit<ExpenseCategory, 'id'>,
  ): Promise<ExpenseCategory> => {
    const response = await api.post<FinanceApiResponse<ExpenseCategory>>(
      API_ENDPOINTS.FINANCE_EXPENSE_CATEGORIES,
      category,
    );
    return response.data.data;
  },

  // Get payment modes
  getPaymentModes: async (): Promise<PaymentMode[]> => {
    const response = await api.get<FinanceApiResponse<PaymentMode[]>>(
      API_ENDPOINTS.FINANCE_PAYMENT_MODES,
    );
    return response.data.data;
  },

  // Get expense tags
  getExpenseTags: async (): Promise<ExpenseTag[]> => {
    const response = await api.get<FinanceApiResponse<ExpenseTag[]>>(
      API_ENDPOINTS.FINANCE_EXPENSE_TAGS,
    );
    return response.data.data;
  },
};

// ===== CHART OF ACCOUNTS SERVICES =====
export const chartOfAccountsService = {
  // Get chart of accounts
  getChartOfAccounts: async (): Promise<ChartOfAccount[]> => {
    const response = await api.get<FinanceApiResponse<ChartOfAccount[]>>(
      API_ENDPOINTS.FINANCE_CHART_OF_ACCOUNTS,
    );
    return response.data.data;
  },

  // Get single chart of account
  getChartOfAccount: async (code: string): Promise<ChartOfAccount> => {
    const response = await api.get<FinanceApiResponse<ChartOfAccount>>(
      `${API_ENDPOINTS.FINANCE_CHART_OF_ACCOUNTS}/${code}`,
    );
    return response.data.data;
  },

  // Create chart of account
  createChartOfAccount: async (account: ChartOfAccountCreate): Promise<ChartOfAccount> => {
    const response = await api.post<FinanceApiResponse<ChartOfAccount>>(
      API_ENDPOINTS.FINANCE_CHART_OF_ACCOUNTS,
      account,
    );
    return response.data.data;
  },

  // Update chart of account
  updateChartOfAccount: async (
    code: string,
    account: ChartOfAccountUpdate,
  ): Promise<ChartOfAccount> => {
    const response = await api.put<FinanceApiResponse<ChartOfAccount>>(
      `${API_ENDPOINTS.FINANCE_CHART_OF_ACCOUNTS}/${code}`,
      account,
    );
    return response.data.data;
  },

  // Delete chart of account
  deleteChartOfAccount: async (code: string): Promise<void> => {
    await api.delete(`${API_ENDPOINTS.FINANCE_CHART_OF_ACCOUNTS}/${code}`);
  },
};

// ===== PRODUCT COST SERVICES =====
export const productCostService = {
  // Get product costs with pagination
  getProductCosts: async (
    page = 1,
    limit = 20,
    search?: string,
  ): Promise<PaginatedFinanceResponse<ProductCost>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
    });

    const response = await api.get<FinanceApiResponse<PaginatedFinanceResponse<ProductCost>>>(
      `${API_ENDPOINTS.FINANCE_PRODUCT_COSTS}?${params}`,
    );
    return response.data.data;
  },

  // Get product cost by SKU
  getProductCostBySku: async (sku: string): Promise<ProductCost | null> => {
    const response = await api.get<FinanceApiResponse<ProductCost | null>>(
      `${API_ENDPOINTS.FINANCE_PRODUCT_COSTS}/sku/${sku}`,
    );
    return response.data.data;
  },

  // Update product cost
  updateProductCost: async (update: ProductCostUpdate): Promise<ProductCost> => {
    const response = await api.put<FinanceApiResponse<ProductCost>>(
      `${API_ENDPOINTS.FINANCE_PRODUCT_COSTS}/${update.productId}/${update.variantId}`,
      update,
    );
    return response.data.data;
  },

  // Bulk update product costs
  bulkUpdateProductCosts: async (updates: ProductCostUpdate[]): Promise<ProductCost[]> => {
    const response = await api.post<FinanceApiResponse<ProductCost[]>>(
      `${API_ENDPOINTS.FINANCE_PRODUCT_COSTS}/bulk`,
      { updates },
    );
    return response.data.data;
  },
};

// ===== PROFIT & LOSS SERVICES =====
export const profitLossService = {
  // Get P&L summary
  getProfitLossSummary: async (
    period: 'month' | 'quarter' | 'year',
    startDate: string,
    endDate: string,
  ): Promise<ProfitLossSummary> => {
    const response = await api.get<FinanceApiResponse<ProfitLossSummary>>(
      `${API_ENDPOINTS.FINANCE_PROFIT_LOSS}?${new URLSearchParams({
        period,
        startDate,
        endDate,
      })}`,
    );
    return response.data.data;
  },

  // Get P&L comparison
  getProfitLossComparison: async (
    currentStartDate: string,
    currentEndDate: string,
    previousStartDate: string,
    previousEndDate: string,
  ): Promise<ProfitLossComparison> => {
    const response = await api.get<FinanceApiResponse<ProfitLossComparison>>(
      `${API_ENDPOINTS.FINANCE_PROFIT_LOSS_COMPARISON}?${new URLSearchParams({
        currentStartDate,
        currentEndDate,
        previousStartDate,
        previousEndDate,
      })}`,
    );
    return response.data.data;
  },
};

// ===== PAYOUT SERVICES =====
export const payoutService = {
  // Get payouts with filtering
  getPayouts: async (
    filter: PayoutFilter,
    page = 1,
    limit = 20,
  ): Promise<PaginatedFinanceResponse<Payout>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filter.startDate && { startDate: filter.startDate }),
      ...(filter.endDate && { endDate: filter.endDate }),
      ...(filter.status && { status: filter.status }),
      ...(filter.minAmount && { minAmount: filter.minAmount.toString() }),
      ...(filter.maxAmount && { maxAmount: filter.maxAmount.toString() }),
    });

    const response = await api.get<FinanceApiResponse<PaginatedFinanceResponse<Payout>>>(
      `${API_ENDPOINTS.FINANCE_PAYOUTS}?${params}`,
    );
    return response.data.data;
  },

  // Get single payout
  getPayout: async (id: string): Promise<Payout> => {
    const response = await api.get<FinanceApiResponse<Payout>>(
      `${API_ENDPOINTS.FINANCE_PAYOUTS}/${id}`,
    );
    return response.data.data;
  },

  // Get payout reconciliation
  getPayoutReconciliation: async (payoutId: string): Promise<PayoutReconciliation> => {
    const response = await api.get<FinanceApiResponse<PayoutReconciliation>>(
      `${API_ENDPOINTS.FINANCE_PAYOUTS}/${payoutId}/reconciliation`,
    );
    return response.data.data;
  },

  // Reconcile payout
  reconcilePayout: async (payoutId: string, orderIds: string[]): Promise<PayoutReconciliation> => {
    const response = await api.post<FinanceApiResponse<PayoutReconciliation>>(
      `${API_ENDPOINTS.FINANCE_PAYOUTS}/${payoutId}/reconcile`,
      { orderIds },
    );
    return response.data.data;
  },
};

// ===== TAX SERVICES =====
export const taxService = {
  // Get tax summary
  getTaxSummary: async (filter: TaxFilter): Promise<TaxSummary[]> => {
    const response = await api.get<FinanceApiResponse<TaxSummary[]>>(
      `${API_ENDPOINTS.FINANCE_TAXES}?${new URLSearchParams({
        startDate: filter.startDate,
        endDate: filter.endDate,
        ...(filter.countries && { countries: filter.countries.join(',') }),
        ...(filter.states && { states: filter.states.join(',') }),
        ...(filter.taxTypes && { taxTypes: filter.taxTypes.join(',') }),
      })}`,
    );
    return response.data.data;
  },

  // Generate tax report
  generateTaxReport: async (filter: TaxFilter): Promise<TaxReport> => {
    const response = await api.post<FinanceApiResponse<TaxReport>>(
      API_ENDPOINTS.FINANCE_TAX_REPORT,
      filter,
    );
    return response.data.data;
  },
};

// ===== DASHBOARD SERVICES =====
export const financeDashboardService = {
  // Get finance dashboard data
  getDashboard: async (period: 'day' | 'week' | 'month' = 'month'): Promise<FinanceDashboard> => {
    const response = await api.get<FinanceApiResponse<FinanceDashboard>>(
      `${API_ENDPOINTS.FINANCE_DASHBOARD}?period=${period}`,
    );
    return response.data.data;
  },
};

// ===== REPORT SERVICES =====
export const reportService = {
  // Generate and download report
  generateReport: async (request: ReportRequest): Promise<ReportResponse> => {
    const response = await api.post<FinanceApiResponse<ReportResponse>>(
      API_ENDPOINTS.FINANCE_REPORTS,
      request,
    );
    return response.data.data;
  },

  // Get report status
  getReportStatus: async (reportId: string): Promise<ReportResponse> => {
    const response = await api.get<FinanceApiResponse<ReportResponse>>(
      `${API_ENDPOINTS.FINANCE_REPORTS}/${reportId}`,
    );
    return response.data.data;
  },
};

// ===== SUPPLIER SERVICES =====
export const supplierService = {
  // Get suppliers with filtering
  getSuppliers: async (search?: string, isActive?: boolean): Promise<Supplier[]> => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (isActive !== undefined) params.append('isActive', isActive.toString());

    const url = `${API_ENDPOINTS.FINANCE_SUPPLIERS}?${params}`;

    try {
      const response = await api.get<FinanceApiResponse<Supplier[]>>(url);
      return response.data.data;
    } catch (error) {
      throw new Error(
        `Failed to fetch suppliers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  },

  // Get single supplier
  getSupplier: async (id: string): Promise<Supplier> => {
    const response = await api.get<FinanceApiResponse<Supplier>>(
      `${API_ENDPOINTS.FINANCE_SUPPLIERS}/${id}`,
    );
    return response.data.data;
  },

  // Create supplier
  createSupplier: async (data: CreateSupplier): Promise<Supplier> => {
    try {
      const response = await api.post<FinanceApiResponse<Supplier>>(
        API_ENDPOINTS.FINANCE_SUPPLIERS,
        data,
      );
      return response.data.data;
    } catch (error) {
      throw new Error(
        `Failed to create supplier: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  },

  // Update supplier
  updateSupplier: async (id: string, data: UpdateSupplier): Promise<Supplier> => {
    const response = await api.put<FinanceApiResponse<Supplier>>(
      `${API_ENDPOINTS.FINANCE_SUPPLIERS}/${id}`,
      data,
    );
    return response.data.data;
  },

  // Delete supplier
  deleteSupplier: async (id: string): Promise<void> => {
    await api.delete(`${API_ENDPOINTS.FINANCE_SUPPLIERS}/${id}`);
  },
};

// ===== PURCHASE ORDER SERVICES =====
export const purchaseOrderService = {
  // Get purchase orders with filtering
  getPurchaseOrders: async (
    filter: PurchaseOrderFilter,
    page = 1,
    limit = 20,
  ): Promise<PaginatedFinanceResponse<PurchaseOrder>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filter.startDate && { startDate: filter.startDate }),
      ...(filter.endDate && { endDate: filter.endDate }),
      ...(filter.supplierId && { supplierId: filter.supplierId }),
      ...(filter.status && { status: filter.status }),
      ...(filter.search && { search: filter.search }),
      ...(filter.minAmount && { minAmount: filter.minAmount.toString() }),
      ...(filter.maxAmount && { maxAmount: filter.maxAmount.toString() }),
      ...(filter.isReceived !== undefined && { isReceived: filter.isReceived.toString() }),
    });

    const response = await api.get<FinanceApiResponse<PaginatedFinanceResponse<PurchaseOrder>>>(
      `${API_ENDPOINTS.FINANCE_PURCHASE_ORDERS}?${params}`,
    );
    return response.data.data;
  },

  // Get single purchase order
  getPurchaseOrder: async (id: string): Promise<PurchaseOrder> => {
    const response = await api.get<FinanceApiResponse<PurchaseOrder>>(
      `${API_ENDPOINTS.FINANCE_PURCHASE_ORDERS}/${id}`,
    );
    return response.data.data;
  },

  // Create purchase order
  createPurchaseOrder: async (data: CreatePurchaseOrder): Promise<PurchaseOrder> => {
    const response = await api.post<FinanceApiResponse<PurchaseOrder>>(
      API_ENDPOINTS.FINANCE_PURCHASE_ORDERS,
      data,
    );
    return response.data.data;
  },

  // Update purchase order
  updatePurchaseOrder: async (id: string, data: UpdatePurchaseOrder): Promise<PurchaseOrder> => {
    const response = await api.put<FinanceApiResponse<PurchaseOrder>>(
      `${API_ENDPOINTS.FINANCE_PURCHASE_ORDERS}/${id}`,
      data,
    );
    return response.data.data;
  },

  // Delete purchase order
  deletePurchaseOrder: async (id: string): Promise<void> => {
    await api.delete(`${API_ENDPOINTS.FINANCE_PURCHASE_ORDERS}/${id}`);
  },

  // Receive purchase order
  receivePurchaseOrder: async (id: string, data: ReceivePurchaseOrder): Promise<PurchaseOrder> => {
    const response = await api.post<FinanceApiResponse<PurchaseOrder>>(
      `${API_ENDPOINTS.FINANCE_PURCHASE_ORDERS}/${id}/receive`,
      data,
    );
    return response.data.data;
  },

  // Get purchase order summary
  getPurchaseOrderSummary: async (
    startDate?: string,
    endDate?: string,
  ): Promise<PurchaseOrderSummary> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await api.get<FinanceApiResponse<PurchaseOrderSummary>>(
      `${API_ENDPOINTS.FINANCE_PURCHASE_ORDERS}/summary?${params}`,
    );
    return response.data.data;
  },

  // Get purchase order workflow
  getPurchaseOrderWorkflow: async (id: string): Promise<PurchaseOrderWorkflow> => {
    const response = await api.get<FinanceApiResponse<PurchaseOrderWorkflow>>(
      API_ENDPOINTS.FINANCE_PURCHASE_ORDER_WORKFLOW(id),
    );
    return response.data.data;
  },

  // Update purchase order status
  updatePurchaseOrderStatus: async (
    id: string,
    data: UpdatePurchaseOrderStatusRequest,
  ): Promise<PurchaseOrder> => {
    const response = await api.put<FinanceApiResponse<PurchaseOrder>>(
      API_ENDPOINTS.FINANCE_PURCHASE_ORDER_STATUS(id),
      data,
    );
    return response.data.data;
  },

  // Get available status transitions
  getAvailableStatusTransitions: async (id: string): Promise<PurchaseOrderStatusTransition> => {
    const response = await api.get<FinanceApiResponse<PurchaseOrderStatusTransition>>(
      API_ENDPOINTS.FINANCE_PURCHASE_ORDER_TRANSITIONS(id),
    );
    return response.data.data;
  },

  // Get purchase order journey
  getPurchaseOrderJourney: async (id: string): Promise<PurchaseOrderJourneyEntry[]> => {
    const response = await api.get<FinanceApiResponse<PurchaseOrderJourneyEntry[]>>(
      API_ENDPOINTS.FINANCE_PURCHASE_ORDER_JOURNEY(id),
    );
    return response.data.data;
  },
};

// ===== SUPPLIER PAYMENT SERVICES =====
export const supplierPaymentService = {
  // Get supplier payments with filtering
  getSupplierPayments: async (
    filter: SupplierPaymentFilter,
    page = 1,
    limit = 20,
  ): Promise<PaginatedFinanceResponse<SupplierPayment>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filter.purchaseOrderId && { purchaseOrderId: filter.purchaseOrderId }),
      ...(filter.supplierId && { supplierId: filter.supplierId }),
      ...(filter.status && { status: filter.status }),
      ...(filter.startDate && { startDate: filter.startDate }),
      ...(filter.endDate && { endDate: filter.endDate }),
    });

    const response = await api.get<FinanceApiResponse<PaginatedFinanceResponse<SupplierPayment>>>(
      `${API_ENDPOINTS.FINANCE_SUPPLIER_PAYMENTS}?${params}`,
    );
    return response.data.data;
  },

  // Get single supplier payment
  getSupplierPayment: async (id: string): Promise<SupplierPayment> => {
    const response = await api.get<FinanceApiResponse<SupplierPayment>>(
      `${API_ENDPOINTS.FINANCE_SUPPLIER_PAYMENTS}/${id}`,
    );
    return response.data.data;
  },

  // Create supplier payment
  createSupplierPayment: async (data: CreateSupplierPayment): Promise<SupplierPayment> => {
    const response = await api.post<FinanceApiResponse<SupplierPayment>>(
      API_ENDPOINTS.FINANCE_SUPPLIER_PAYMENTS,
      data,
    );
    return response.data.data;
  },

  // Update supplier payment
  updateSupplierPayment: async (
    id: string,
    data: UpdateSupplierPayment,
  ): Promise<SupplierPayment> => {
    const response = await api.put<FinanceApiResponse<SupplierPayment>>(
      `${API_ENDPOINTS.FINANCE_SUPPLIER_PAYMENTS}/${id}`,
      data,
    );
    return response.data.data;
  },

  // Delete supplier payment
  deleteSupplierPayment: async (id: string): Promise<void> => {
    await api.delete(`${API_ENDPOINTS.FINANCE_SUPPLIER_PAYMENTS}/${id}`);
  },
};

// Export all services
export const financeService = {
  sales: salesService,
  expenses: expenseService,
  productCosts: productCostService,
  profitLoss: profitLossService,
  payouts: payoutService,
  taxes: taxService,
  dashboard: financeDashboardService,
  reports: reportService,
  suppliers: supplierService,
  purchaseOrders: purchaseOrderService,
  supplierPayments: supplierPaymentService,
};
