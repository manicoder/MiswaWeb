import api from './api';
import { safeAsync } from '../utils/errorHandler';

export interface LabelDocument {
  id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  courierCompany: 'XpressBees' | 'Bluedart' | 'Delhivery' | 'Amazon' | 'Others';
  uploadedAt: string;
  uploadedBy: string;
  description?: string;
}

export interface CourierLabelGroup {
  courierName: string;
  labelCount: number;
  labels: LabelDocument[];
  totalSize: number;
}

export interface LabelManagementResponse {
  courierGroups: CourierLabelGroup[];
  totalLabels: number;
  totalSize: number;
}

export interface UploadLabelDto {
  file: File;
  courierCompany: string;
  description?: string;
}

export interface UploadMultipleLabelDto {
  files: File[];
  courierCompany: string;
  description?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

class LabelManagementService {
  async getLabels(): Promise<ApiResponse<LabelManagementResponse>> {
    return await safeAsync(async () => {
      const response = await api.get('/labels');
      return response.data;
    }, 'getLabels');
  }

  async uploadLabel(uploadData: UploadLabelDto): Promise<ApiResponse<LabelDocument>> {
    return await safeAsync(async () => {
      const formData = new FormData();
      formData.append('file', uploadData.file);
      formData.append('courierCompany', uploadData.courierCompany);
      if (uploadData.description) {
        formData.append('description', uploadData.description);
      }

      const response = await api.post('/labels/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    }, 'uploadLabel');
  }

  async uploadMultipleLabels(
    uploadData: UploadMultipleLabelDto,
  ): Promise<ApiResponse<LabelDocument[]>> {
    return await safeAsync(async () => {
      const uploadPromises = uploadData.files.map(async (file, index) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('courierCompany', uploadData.courierCompany);
        if (uploadData.description) {
          formData.append(
            'description',
            `${uploadData.description} (${index + 1}/${uploadData.files.length})`,
          );
        }

        const response = await api.post('/labels/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return response.data.data;
      });

      const results = await Promise.all(uploadPromises);

      return {
        success: true,
        data: results,
        message: `Successfully uploaded ${results.length} labels`,
      };
    }, 'uploadMultipleLabels');
  }

  async deleteLabel(labelId: string): Promise<ApiResponse<void>> {
    return await safeAsync(async () => {
      const response = await api.delete(`/labels/${labelId}`);
      return response.data;
    }, 'deleteLabel');
  }

  async downloadLabel(labelId: string): Promise<Blob> {
    return await safeAsync(async () => {
      const response = await api.get(`/labels/${labelId}/download`, {
        responseType: 'blob',
      });
      return response.data;
    }, 'downloadLabel');
  }

  async viewLabel(labelId: string): Promise<Blob> {
    return await safeAsync(async () => {
      const response = await api.get(`/labels/${labelId}/view`, {
        responseType: 'blob',
      });
      return response.data;
    }, 'viewLabel');
  }

  getFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const labelManagementService = new LabelManagementService();
