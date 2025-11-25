import api from './api';

export interface TrackingInfo {
  number: string;
  url: string;
  company: string;
}

export interface Customer {
  firstName: string;
  lastName: string;
  email: string;
  fullName: string;
}

export interface ShippingAddress {
  name: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  province: string;
  country: string;
  zip: string;
  phone: string;
  fullAddress: string;
}

export interface Fulfillment {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  trackingInfo?: TrackingInfo;
  service?: {
    serviceName: string;
    type: string;
  };
  lineItems: LineItem[];
}

export interface LineItem {
  id: string;
  title: string;
  quantity: number;
  amount: number;
  currency: string;
  image?: {
    url: string;
    altText: string;
  };
}

export interface JobManagementOrder {
  id: string;
  name: string;
  createdAt: string;
  fulfillmentStatus: string;
  financialStatus: string;
  totalAmount: number;
  currency: string;
  customer?: Customer;
  shippingAddress?: ShippingAddress;
  fulfillments: Fulfillment[];
  lineItems: LineItem[];
}

export interface CourierGroup {
  courierName: string;
  orderCount: number;
  orders: JobManagementOrder[];
}

export interface JobManagementResponse {
  courierGroups: CourierGroup[];
  totalOrders: number;
  nextCursor?: string;
  hasNextPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

class JobManagementService {
  async getFulfilledOrders(
    limit: number = 250,
    cursor?: string,
    dateFilter?: string,
  ): Promise<ApiResponse<JobManagementResponse>> {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (cursor) {
        params.append('cursor', cursor);
      }
      if (dateFilter) {
        params.append('dateFilter', dateFilter);
      }

      const response = await api.get(`/jobmanagement/fulfilled-orders?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching fulfilled orders:', error);
      throw new Error('Failed to fetch fulfilled orders');
    }
  }

  async getCourierSummary(): Promise<ApiResponse<Record<string, unknown>>> {
    try {
      const response = await api.get('/jobmanagement/courier-summary');
      return response.data;
    } catch (error) {
      console.error('Error fetching courier summary:', error);
      throw new Error('Failed to fetch courier summary');
    }
  }

  async healthCheck(): Promise<ApiResponse<Record<string, unknown>>> {
    try {
      const response = await api.get('/jobmanagement/health');
      return response.data;
    } catch (error) {
      console.error('Error checking job management health:', error);
      throw new Error('Failed to check job management health');
    }
  }
}

export const jobManagementService = new JobManagementService();
