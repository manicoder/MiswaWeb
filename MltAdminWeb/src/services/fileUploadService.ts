import { api } from './api';

export interface FileUploadResponse {
  url: string;
  filename: string;
  size: number;
  type: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[];
  timestamp: string;
}

export const fileUploadService = {
  // Upload a file (receipt, document, etc.)
  uploadFile: async (file: File, type: string = 'general'): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await api.post<ApiResponse<FileUploadResponse>>(
      '/fileupload/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    return response.data.data;
  },

  // Upload receipt specifically
  uploadReceipt: async (file: File): Promise<FileUploadResponse> => {
    return fileUploadService.uploadFile(file, 'receipt');
  },

  // Delete uploaded file
  deleteFile: async (url: string): Promise<void> => {
    await api.delete(`/fileupload/upload?url=${encodeURIComponent(url)}`);
  },

  // Get file info
  getFileInfo: async (url: string): Promise<{ filename: string; size: number; type: string }> => {
    const response = await api.get<ApiResponse<{ filename: string; size: number; type: string }>>(
      `/fileupload/upload/info?url=${encodeURIComponent(url)}`,
    );
    return response.data.data;
  },
};
