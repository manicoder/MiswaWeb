import { useState, useEffect, useCallback } from 'react';
import { financeService } from '../services/financeService';
import {
  SalesSummary,
  RevenueBreakdown,
  ProductPerformance,
  SalesFilter,
  Expense,
  ExpenseFilter,
  ProductCost,
  ProfitLossSummary,
  Payout,
  PayoutFilter,
  TaxSummary,
  TaxFilter,
  FinanceDashboard,
  ReportRequest,
  ReportResponse,
  PaginatedFinanceResponse,
} from '../types/finance';

// ===== SALES & REVENUE HOOKS =====
export const useSalesSummary = (filter: SalesFilter) => {
  const [data, setData] = useState<SalesSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await financeService.sales.getSalesSummary(filter);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales summary');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

export const useRevenueBreakdown = (filter: SalesFilter) => {
  const [data, setData] = useState<RevenueBreakdown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await financeService.sales.getRevenueBreakdown(filter);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch revenue breakdown');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

export const useProductPerformance = (filter: SalesFilter) => {
  const [data, setData] = useState<ProductPerformance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await financeService.sales.getProductPerformance(filter);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch product performance');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

// ===== EXPENSE HOOKS =====
export const useExpenses = (filter: ExpenseFilter, page = 1, limit = 20) => {
  const [data, setData] = useState<PaginatedFinanceResponse<Expense> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await financeService.expenses.getExpenses(filter, page, limit);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  }, [filter, page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createExpense = useCallback(
    async (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const result = await financeService.expenses.createExpense(expense);
        fetchData(); // Refresh the list
        return result;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to create expense');
      }
    },
    [fetchData],
  );

  const updateExpense = useCallback(
    async (id: string, expense: Partial<Expense>) => {
      try {
        const result = await financeService.expenses.updateExpense(id, expense);
        fetchData(); // Refresh the list
        return result;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to update expense');
      }
    },
    [fetchData],
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      try {
        await financeService.expenses.deleteExpense(id);
        fetchData(); // Refresh the list
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to delete expense');
      }
    },
    [fetchData],
  );

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    createExpense,
    updateExpense,
    deleteExpense,
  };
};

export const useExpenseCategories = () => {
  const [data, setData] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await financeService.expenses.getExpenseCategories();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch expense categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

// ===== PRODUCT COST HOOKS =====
export const useProductCosts = (page = 1, limit = 20, search?: string) => {
  const [data, setData] = useState<PaginatedFinanceResponse<ProductCost> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await financeService.productCosts.getProductCosts(page, limit, search);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch product costs');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateProductCost = useCallback(
    async (
      productId: string,
      variantId: string,
      costPrice: number,
      currency = 'INR',
      supplier?: string,
      notes?: string,
    ) => {
      try {
        const result = await financeService.productCosts.updateProductCost({
          productId,
          variantId,
          costPrice,
          currency,
          supplier,
          notes,
        });
        fetchData(); // Refresh the list
        return result;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to update product cost');
      }
    },
    [fetchData],
  );

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    updateProductCost,
  };
};

// ===== PROFIT & LOSS HOOKS =====
export const useProfitLossSummary = (
  period: 'month' | 'quarter' | 'year',
  startDate: string,
  endDate: string,
) => {
  const [data, setData] = useState<ProfitLossSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await financeService.profitLoss.getProfitLossSummary(
        period,
        startDate,
        endDate,
      );
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profit & loss summary');
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

// ===== PAYOUT HOOKS =====
export const usePayouts = (filter: PayoutFilter, page = 1, limit = 20) => {
  const [data, setData] = useState<PaginatedFinanceResponse<Payout> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await financeService.payouts.getPayouts(filter, page, limit);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payouts');
    } finally {
      setLoading(false);
    }
  }, [filter, page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

// ===== TAX HOOKS =====
export const useTaxSummary = (filter: TaxFilter) => {
  const [data, setData] = useState<TaxSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await financeService.taxes.getTaxSummary(filter);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tax summary');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

// ===== DASHBOARD HOOKS =====
export const useFinanceDashboard = (period: 'day' | 'week' | 'month' = 'month') => {
  const [data, setData] = useState<FinanceDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await financeService.dashboard.getDashboard(period);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch finance dashboard');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

// ===== REPORT HOOKS =====
export const useReportGeneration = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = useCallback(async (request: ReportRequest): Promise<ReportResponse> => {
    setLoading(true);
    setError(null);
    try {
      const result = await financeService.reports.generateReport(request);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate report';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return { generateReport, loading, error };
};

// ===== UTILITY HOOKS =====
export const useDateRange = (defaultStartDate?: string, defaultEndDate?: string) => {
  const [startDate, setStartDate] = useState(
    defaultStartDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(defaultEndDate || new Date().toISOString().split('T')[0]);

  const updateDateRange = useCallback((newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  }, []);

  return { startDate, endDate, updateDateRange };
};

export const useCurrency = (defaultCurrency = 'INR') => {
  const [currency, setCurrency] = useState(defaultCurrency);

  return { currency, setCurrency };
};
