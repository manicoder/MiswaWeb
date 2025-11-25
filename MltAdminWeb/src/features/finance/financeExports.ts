// Finance Module Non-Component Exports
// This file contains exports that are not React components to avoid Fast Refresh errors

// Re-export types for convenience
export type {
  SalesSummary,
  RevenueBreakdown,
  ProductPerformance,
  SalesFilter,
  Expense,
  ExpenseType,
  ExpenseCategory,
  ExpenseFilter,
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
  FinanceDashboard as FinanceDashboardType,
  ReportRequest,
  ReportResponse,
  FinanceApiResponse,
  PaginatedFinanceResponse,
} from '../../types/finance';

// Re-export hooks for convenience
export {
  useSalesSummary,
  useRevenueBreakdown,
  useProductPerformance,
  useExpenses,
  useExpenseCategories,
  useProductCosts,
  useProfitLossSummary,
  usePayouts,
  useTaxSummary,
  useFinanceDashboard,
  useReportGeneration,
  useDateRange,
  useCurrency,
} from '../../hooks/useFinance';

// Re-export services for convenience
export { financeService } from '../../services/financeService';
