import { api } from './api';
import { safeAsync } from '../utils/errorHandler';

export interface OrderPickupStatusDto {
  id: number;
  shopifyOrderId: string;
  orderName: string;
  pickupStatus: 'pickup' | 'not_pickup' | 'missing';
  notes?: string;
  fulfillmentDate: string;
  courierCompany: string;
  trackingNumber: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export interface UpdatePickupStatusDto {
  shopifyOrderId: string;
  orderName: string;
  pickupStatus: 'pickup' | 'not_pickup' | 'missing';
  notes?: string;
  fulfillmentDate: string;
  courierCompany: string;
  trackingNumber: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
  timestamp: string;
}

class OrderPickupService {
  private baseUrl = '/orderpickup';

  async updatePickupStatus(
    updateDto: UpdatePickupStatusDto,
  ): Promise<ApiResponse<OrderPickupStatusDto>> {
    return await safeAsync(async () => {
      const response = await api.post<ApiResponse<OrderPickupStatusDto>>(
        `${this.baseUrl}/update-status`,
        updateDto,
      );
      return response.data;
    }, 'updatePickupStatus');
  }

  async getPickupStatus(
    shopifyOrderId: string,
    trackingNumber: string,
  ): Promise<ApiResponse<OrderPickupStatusDto>> {
    return await safeAsync(async () => {
      const response = await api.get<ApiResponse<OrderPickupStatusDto>>(
        `${this.baseUrl}/${shopifyOrderId}/${trackingNumber}`,
      );
      return response.data;
    }, 'getPickupStatus');
  }

  async getPickupStatusSummary(
    startDate?: string,
    endDate?: string,
  ): Promise<ApiResponse<Record<string, number>>> {
    return await safeAsync(async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await api.get<ApiResponse<Record<string, number>>>(
        `${this.baseUrl}/summary?${params}`,
      );
      return response.data;
    }, 'getPickupStatusSummary');
  }

  async getPickupStatusesByDateRange(
    startDate?: string,
    endDate?: string,
    courierCompany?: string,
  ): Promise<ApiResponse<OrderPickupStatusDto[]>> {
    return await safeAsync(async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (courierCompany) params.append('courierCompany', courierCompany);

      const response = await api.get<ApiResponse<OrderPickupStatusDto[]>>(
        `${this.baseUrl}/by-date-range?${params}`,
      );
      return response.data;
    }, 'getPickupStatusesByDateRange');
  }
}

export const orderPickupService = new OrderPickupService();
