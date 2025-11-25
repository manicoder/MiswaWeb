import api from './api';

// Warehouse Types
export interface Warehouse {
  id: number;
  name: string;
  code: string;
  description?: string;
  address?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  isDefaultSource: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CreateWarehouseRequest {
  name: string;
  code: string;
  description?: string;
  address?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive?: boolean;
  isDefaultSource?: boolean;
}

export interface UpdateWarehouseRequest {
  name?: string;
  description?: string;
  address?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive?: boolean;
  isDefaultSource?: boolean;
}

export interface WarehouseListResponse {
  warehouses: Warehouse[];
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
  defaultSourceWarehouse?: Warehouse;
}

export interface CreateWarehouseTransferRequest {
  sourceWarehouseId: number;
  destinationWarehouseId: number;
  notes?: string;
}

export interface WarehouseTransferReport {
  shipmentId: number;
  shipmentNumber: string;
  sourceWarehouseName: string;
  destinationWarehouseName: string;
  status: string;
  createdAt: string;
  dispatchedAt?: string;
  receivedAt?: string;
  completedAt?: string;
  totalItems: number;
  totalValue: number;
  itemVariances: TransferItemVariance[];
}

export interface TransferItemVariance {
  itemId: number;
  productTitle: string;
  barcode: string;
  quantityPlanned: number;
  quantityDispatched: number;
  quantityReceived: number;
  varianceDispatched: number;
  varianceReceived: number;
  unitPrice: number;
  varianceValue: number;
}

export interface ValidateTransferRequest {
  sourceWarehouseId: number;
  destinationWarehouseId: number;
}

class WarehouseService {
  private baseUrl = '/warehouse';

  // Warehouse CRUD Operations
  async getWarehouses(): Promise<WarehouseListResponse> {
    const response = await api.get(`${this.baseUrl}`);
    return response.data;
  }

  async getActiveWarehouses(): Promise<Warehouse[]> {
    const response = await api.get(`${this.baseUrl}/active`);
    return response.data;
  }

  async getWarehouseById(id: number): Promise<Warehouse> {
    const response = await api.get(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async getWarehouseByCode(code: string): Promise<Warehouse> {
    const response = await api.get(`${this.baseUrl}/code/${code}`);
    return response.data;
  }

  async createWarehouse(warehouse: CreateWarehouseRequest): Promise<Warehouse> {
    const response = await api.post(`${this.baseUrl}`, warehouse);
    return response.data;
  }

  async updateWarehouse(id: number, warehouse: UpdateWarehouseRequest): Promise<Warehouse> {
    const response = await api.put(`${this.baseUrl}/${id}`, warehouse);
    return response.data;
  }

  async deleteWarehouse(id: number): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  async setDefaultSourceWarehouse(id: number): Promise<void> {
    await api.post(`${this.baseUrl}/${id}/set-default`);
  }

  // Transfer Operations
  async validateWarehouseTransfer(request: ValidateTransferRequest): Promise<{ isValid: boolean }> {
    const response = await api.post(`${this.baseUrl}/validate-transfer`, request);
    return response.data;
  }

  async createWarehouseTransfer(
    request: CreateWarehouseTransferRequest,
  ): Promise<Record<string, unknown>> {
    const response = await api.post('/warehouseshipment/transfer', request);
    return response.data;
  }

  // Transfer Reports
  async getTransferReports(
    sourceWarehouseId?: number,
    destinationWarehouseId?: number,
    startDate?: string,
    endDate?: string,
  ): Promise<WarehouseTransferReport[]> {
    const params = new URLSearchParams();
    if (sourceWarehouseId) params.append('sourceWarehouseId', sourceWarehouseId.toString());
    if (destinationWarehouseId)
      params.append('destinationWarehouseId', destinationWarehouseId.toString());
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await api.get(`${this.baseUrl}/transfer-reports?${params.toString()}`);
    return response.data;
  }

  // Barcode Operations (Proxy to warehouse shipment service)
  async getProductByBarcode(barcode: string): Promise<Record<string, unknown>> {
    const response = await api.get(`/warehouseshipment/products/barcode/${barcode}`);
    return response.data;
  }

  async addProductToShipment(data: {
    shipmentId: number;
    barcode: string;
    quantity: number;
  }): Promise<Record<string, unknown>> {
    const response = await api.post('/warehouseshipment/items', data);
    return response.data;
  }

  // Utility Methods
  getWarehouseDisplayName(warehouse: Warehouse): string {
    return `${warehouse.code} - ${warehouse.name}`;
  }

  isValidWarehouseCode(code: string): boolean {
    // Warehouse codes should be 3-10 characters, alphanumeric with dashes
    const regex = /^[A-Z0-9\-]{3,10}$/;
    return regex.test(code);
  }

  generateWarehouseCode(name: string): string {
    // Generate a warehouse code from name (first 3 letters + random number)
    const prefix = name
      .substring(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, '');
    const suffix = Math.floor(100 + Math.random() * 900);
    return `${prefix}${suffix}`;
  }

  // Status and validation helpers
  canDeleteWarehouse(warehouse: Warehouse): boolean {
    // Can't delete if it's the default source or has active transfers
    return !warehouse.isDefaultSource;
  }

  canDeactivateWarehouse(warehouse: Warehouse): boolean {
    // Can't deactivate the default source warehouse
    return !warehouse.isDefaultSource;
  }

  getWarehouseStatusColor(warehouse: Warehouse): string {
    if (!warehouse.isActive) return 'text-red-600';
    if (warehouse.isDefaultSource) return 'text-blue-600';
    return 'text-green-600';
  }

  getWarehouseStatusText(warehouse: Warehouse): string {
    if (!warehouse.isActive) return 'Inactive';
    if (warehouse.isDefaultSource) return 'Default Source';
    return 'Active';
  }
}

export default new WarehouseService();
