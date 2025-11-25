import { useState, useEffect, useCallback } from 'react';
import { api, API_ENDPOINTS } from '../../../services/api';

export interface FinanceDashboardData {
  TotalRevenue: number;
  TotalOrders: number;
  AverageOrderValue: number;
  TotalProfit: number;
  TotalCostOfGoods: number;
  TotalExpenses: number;
  ApprovedExpenses: number;
  PendingExpenses: number;
  Income: number;
  Profit: number;
  Loss: number;
  GrossMargin: number;
  NetMargin: number;
  RecentAnalytics: AnalyticsData[];
  RecentExpenses: ExpenseData[];
  UpcomingPayouts: PayoutData[];
  ApprovedExpensesBreakdown: ApprovedExpenseData[];
  PlatformBreakdown: {
    shopify: { revenue: number; orders: number; profit: number };
    amazon: { revenue: number; orders: number; profit: number };
    flipkart: { revenue: number; orders: number; profit: number };
  };
}

export interface AnalyticsData {
  date: string;
  revenue: number;
  orders: number;
  profit: number;
}

export interface ExpenseData {
  Id: string;
  Description: string;
  Category: string;
  Amount: number;
  Date: string;
  Status: string;
}

export interface ApprovedExpenseData {
  Id: string;
  Description: string;
  Category: string;
  Amount: number;
  Date: string;
  Status: string;
  PaymentMode: string;
  PaidTo: string;
}

export interface PayoutData {
  Id: string;
  PayoutId: string;
  Amount: number;
  ExpectedDate: string;
  Status: string;
}

// Interface for the raw API response
interface FinanceDashboardResponse {
  totalRevenue?: number;
  totalOrders?: number;
  averageOrderValue?: number;
  totalProfit?: number;
  grossMargin?: number;
  recentAnalytics?: AnalyticsData[];
  recentExpenses?: RawExpenseData[];
  upcomingPayouts?: RawPayoutData[];
  totalCostOfGoods?: number;
  totalExpenses?: number;
  approvedExpenses?: number;
  pendingExpenses?: number;
  income?: number;
  profit?: number;
  loss?: number;
  netMargin?: number;
  approvedExpensesBreakdown?: RawExpenseData[];
  platformBreakdown?: {
    shopify: { revenue: number; orders: number; profit: number };
    amazon: { revenue: number; orders: number; profit: number };
    flipkart: { revenue: number; orders: number; profit: number };
  };
}

interface RawExpenseData {
  id?: string;
  Id?: string;
  description?: string;
  Description?: string;
  category?: string;
  Category?: string;
  amount?: number;
  Amount?: number;
  date?: string;
  Date?: string;
  status?: string;
  Status?: string;
  paymentMode?: string;
  PaymentMode?: string;
  paidTo?: string;
  PaidTo?: string;
}

interface RawPayoutData {
  id?: string;
  Id?: string;
  payoutId?: string;
  PayoutId?: string;
  amount?: number;
  Amount?: number;
  expectedDate?: string;
  ExpectedDate?: string;
  status?: string;
  Status?: string;
}

interface UseFinanceDashboardProps {
  startDate?: Date | null;
  endDate?: Date | null;
  currency?: string;
}

export const useFinanceDashboard = ({ startDate, endDate }: UseFinanceDashboardProps) => {
  const [dashboardData, setDashboardData] = useState<FinanceDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query parameters: only send when both dates are present to avoid backend single-date errors
      const params = new URLSearchParams();
      if (startDate && endDate) {
        // Send date-only; backend sets UTC and end-of-day
        params.append('startDate', startDate.toISOString().split('T')[0]);
        params.append('endDate', endDate.toISOString().split('T')[0]);
      }

      const response = await api.get(`${API_ENDPOINTS.FINANCE_DASHBOARD}?${params}`);

      // Transform the response to match our interface
      // Backend returns data wrapped in ApiResponse object
      const apiResponse = response.data as { data: FinanceDashboardResponse };
      const rawResponse = apiResponse.data;
      const transformedData: FinanceDashboardData = {
        TotalRevenue: rawResponse.totalRevenue || 0,
        TotalOrders: rawResponse.totalOrders || 0,
        AverageOrderValue: rawResponse.averageOrderValue || 0,
        TotalProfit: rawResponse.totalProfit || 0,
        TotalCostOfGoods: rawResponse.totalCostOfGoods || 0,
        TotalExpenses: rawResponse.totalExpenses || 0,
        ApprovedExpenses: rawResponse.approvedExpenses || 0,
        PendingExpenses: rawResponse.pendingExpenses || 0,
        Income: rawResponse.income || 0,
        Profit: rawResponse.profit || 0,
        Loss: rawResponse.loss || 0,
        GrossMargin: rawResponse.grossMargin || 0,
        NetMargin: rawResponse.netMargin || 0,
        RecentAnalytics: rawResponse.recentAnalytics || [],
        RecentExpenses: (rawResponse.recentExpenses || []).map((expense: RawExpenseData) => ({
          Id: expense.id || expense.Id || '',
          Description: expense.description || expense.Description || '',
          Category: expense.category || expense.Category || '',
          Amount: expense.amount || expense.Amount || 0,
          Date: expense.date || expense.Date || '',
          Status: expense.status || expense.Status || '',
        })),
        UpcomingPayouts: (rawResponse.upcomingPayouts || []).map((payout: RawPayoutData) => ({
          Id: payout.id || payout.Id || '',
          PayoutId: payout.payoutId || payout.PayoutId || '',
          Amount: payout.amount || payout.Amount || 0,
          ExpectedDate: payout.expectedDate || payout.ExpectedDate || '',
          Status: payout.status || payout.Status || '',
        })),
        ApprovedExpensesBreakdown: (rawResponse.approvedExpensesBreakdown || []).map(
          (expense: RawExpenseData) => ({
            Id: expense.id || expense.Id || '',
            Description: expense.description || expense.Description || '',
            Category: expense.category || expense.Category || '',
            Amount: expense.amount || expense.Amount || 0,
            Date: expense.date || expense.Date || '',
            Status: expense.status || expense.Status || '',
            PaymentMode: expense.paymentMode || '',
            PaidTo: expense.paidTo || '',
          }),
        ),
        PlatformBreakdown: rawResponse.platformBreakdown || {
          shopify: { revenue: 0, orders: 0, profit: 0 },
          amazon: { revenue: 0, orders: 0, profit: 0 },
          flipkart: { revenue: 0, orders: 0, profit: 0 },
        },
      };

      setDashboardData(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const refetch = () => {
    fetchDashboardData();
  };

  return {
    dashboardData,
    isLoading,
    error,
    refetch,
  };
};
