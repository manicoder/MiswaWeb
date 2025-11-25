import React, { useState, useEffect, useCallback } from 'react';
import {
  orderSyncService,
  type ShopifyOrder,
  type OrderCountResult,
  type OrderSyncResult,
} from '../../../../services/orderSyncService';
import PagePagination from '../../../../components/common/PagePagination';
import ExportButton from '../../../../components/common/ExportButton';

interface OrderListProps {
  className?: string;
}

export const OrderList: React.FC<OrderListProps> = ({ className = '' }) => {
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<OrderSyncResult | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fulfillmentFilter, setFulfillmentFilter] = useState('');

  // Counts
  const [counts, setCounts] = useState<OrderCountResult | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await orderSyncService.getLocalOrders({
        search,
        status: statusFilter,
        fulfillmentStatus: fulfillmentFilter,
        page: currentPage,
        limit: pageSize,
        method: 'optimized',
      });

      setOrders(result.orders);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, fulfillmentFilter, currentPage, pageSize]);

  const loadCounts = useCallback(async () => {
    try {
      const result = await orderSyncService.getOrderCount();
      setCounts(result);
    } catch (err) {
      console.error('Failed to load order counts:', err);
    }
  }, []);

  const handleSync = async (forceRefresh = false) => {
    try {
      setSyncing(true);
      setError(null);

      const result = await orderSyncService.syncOrders(forceRefresh);

      if (result.success) {
        setSyncResult(result);
        await loadOrders();
        await loadCounts();
      } else {
        setError(result.error || 'Sync failed');
      }
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleFulfillmentFilter = (value: string) => {
    setFulfillmentFilter(value);
    setCurrentPage(1);
  };

  useEffect(() => {
    loadOrders();
    loadCounts();
  }, [loadOrders, loadCounts]);

  const formatOrder = (order: ShopifyOrder) => {
    return orderSyncService.formatOrderForDisplay(order);
  };

  const getStatusColor = (status: string) => {
    return orderSyncService.getStatusColor(status);
  };

  const getFinancialStatusColor = (status: string) => {
    return orderSyncService.getFinancialStatusColor(status);
  };

  if (loading && orders.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600">
            {total} orders • {counts?.fulfilled || 0} fulfilled • {counts?.unfulfilled || 0}{' '}
            unfulfilled
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleSync(false)}
            disabled={syncing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync Orders'}
          </button>

          <button
            onClick={() => handleSync(true)}
            disabled={syncing}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Force Sync'}
          </button>

          <ExportButton
            data={orders}
            exportConfig={{
              filename: 'shopify-orders',
              title: 'Shopify Orders',
              columns: [
                { key: 'name', label: 'Order', width: 20 },
                { key: 'customer.firstName', label: 'Customer', width: 25 },
                { key: 'totalPrice', label: 'Total', width: 15 },
                { key: 'fulfillmentStatus', label: 'Status', width: 15 },
                { key: 'createdAt', label: 'Date', width: 25 },
              ],
            }}
            size="sm"
            variant="filled"
          />
        </div>
      </div>

      {/* Sync Result */}
      {syncResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-green-800 font-semibold">Sync Completed</h3>
          <p className="text-green-700 text-sm">
            Synced {syncResult.data?.totalFetched || 0} orders with{' '}
            {syncResult.data?.totalLineItems || 0} line items in {syncResult.data?.durationMs || 0}
            ms
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search orders..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="unfulfilled">Unfulfilled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Financial Status</label>
          <select
            value={fulfillmentFilter}
            onChange={(e) => handleFulfillmentFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Financial Statuses</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => {
                const formatted = formatOrder(order);
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatted.displayName}
                        </div>
                        <div className="text-sm text-gray-500">{formatted.totalItems} items</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatted.displayCustomer}</div>
                      {order.customer?.email && (
                        <div className="text-sm text-gray-500">{order.customer.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatted.displayTotal}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${getStatusColor(formatted.displayStatus)}-100 text-${getStatusColor(formatted.displayStatus)}-800`}
                        >
                          {formatted.displayStatus}
                        </span>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${getFinancialStatusColor(formatted.displayFinancialStatus)}-100 text-${getFinancialStatusColor(formatted.displayFinancialStatus)}-800`}
                        >
                          {formatted.displayFinancialStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{formatted.displayDate}</div>
                      <div>{formatted.displayTime}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6">
          <PagePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            total={total}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Empty State */}
      {!loading && orders.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-600 mb-4">
            {search || statusFilter || fulfillmentFilter
              ? 'Try adjusting your filters'
              : 'Sync orders from Shopify to get started'}
          </p>
          {!search && !statusFilter && !fulfillmentFilter && (
            <button
              onClick={() => handleSync(false)}
              disabled={syncing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync Orders'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
