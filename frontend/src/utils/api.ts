import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Get backend URL from environment variable (build-time) or runtime config (window object)
// This allows configuration at build-time via REACT_APP_BACKEND_URL
// or at runtime via window.APP_CONFIG.BACKEND_URL (useful for production deployments)
function getBackendUrl(): string {
  // Check for runtime configuration first (useful for production deployments)
  if (typeof window !== 'undefined' && (window as any).APP_CONFIG?.BACKEND_URL) {
    return (window as any).APP_CONFIG.BACKEND_URL;
  }
  
  // Fall back to build-time environment variable
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  
  // Default to localhost for development
  return 'http://localhost:8000';
}

const BACKEND_URL = getBackendUrl();
export const API = `${BACKEND_URL}/api`;

// Log for debugging
if (!process.env.REACT_APP_BACKEND_URL && !(typeof window !== 'undefined' && (window as any).APP_CONFIG?.BACKEND_URL)) {
  console.warn('⚠️ REACT_APP_BACKEND_URL not set, using default: http://localhost:8000');
}
console.log('🔗 Backend API URL:', API);

export const api: AxiosInstance = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Type definitions
export interface Brand {
  id?: string;
  _id?: string; // Keep for backward compatibility
  name: string;
  tagline?: string;
  description: string;
  logo?: string;
  logo_url?: string; // Backend uses logo_url
  image_url?: string;
  website?: string;
  created_at?: string;
}

export interface Catalog {
  _id?: string;
  name: string;
  description?: string;
  fileUrl?: string;
  brandId?: string;
  createdAt?: string;
}

export interface Blog {
  _id?: string;
  title: string;
  slug?: string;
  content: string;
  excerpt?: string;
  author?: string;
  publishedAt?: string;
  isPublished?: boolean;
  featuredImage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Career {
  _id?: string;
  title: string;
  department?: string;
  location?: string;
  type?: string;
  description: string;
  requirements?: string | string[]; // Backend accepts both string and array
  isActive?: boolean;
  active?: boolean; // Some endpoints use 'active' instead of 'isActive'
  createdAt?: string;
}

export interface Inquiry {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  createdAt?: string;
}

export interface CompanyInfo {
  _id?: string;
  name: string;
  mission?: string;
  vision?: string;
  values?: string[];
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
}

// Brands
export const getBrands = (): Promise<AxiosResponse<Brand[]>> => api.get('/brands');
export const createBrand = (data: Brand): Promise<AxiosResponse<Brand>> => api.post('/brands', data);
export const updateBrand = (id: string, data: Partial<Brand>): Promise<AxiosResponse<Brand>> => api.put(`/brands/${id}`, data);
export const deleteBrand = (id: string): Promise<AxiosResponse<void>> => api.delete(`/brands/${id}`);

// Catalogs
export const getCatalogs = (): Promise<AxiosResponse<Catalog[]>> => api.get('/catalogs');
export const createCatalog = (data: Partial<Catalog>): Promise<AxiosResponse<Catalog>> => api.post('/catalogs', data);
export const updateCatalog = (id: string, data: Partial<Catalog>): Promise<AxiosResponse<Catalog>> => api.put(`/catalogs/${id}`, data);
export const deleteCatalog = (id: string): Promise<AxiosResponse<void>> => api.delete(`/catalogs/${id}`);

// Blogs
export const getBlogs = (publishedOnly: boolean = true): Promise<AxiosResponse<Blog[]>> => api.get(`/blogs?published_only=${publishedOnly}`);
export const getBlogBySlug = (slug: string): Promise<AxiosResponse<Blog>> => api.get(`/blogs/${slug}`);
export const createBlog = (data: Partial<Blog>): Promise<AxiosResponse<Blog>> => api.post('/blogs', data);
export const updateBlog = (id: string, data: Partial<Blog>): Promise<AxiosResponse<Blog>> => api.put(`/blogs/${id}`, data);
export const deleteBlog = (id: string): Promise<AxiosResponse<void>> => api.delete(`/blogs/${id}`);

// Careers
export const getCareers = (activeOnly: boolean = true): Promise<AxiosResponse<Career[]>> => api.get(`/careers?active_only=${activeOnly}`);
export const createCareer = (data: Partial<Career>): Promise<AxiosResponse<Career>> => api.post('/careers', data);
export const updateCareer = (id: string, data: Partial<Career>): Promise<AxiosResponse<Career>> => api.put(`/careers/${id}`, data);
export const deleteCareer = (id: string): Promise<AxiosResponse<void>> => api.delete(`/careers/${id}`);

// Inquiries
export const createInquiry = (data: Partial<Inquiry>): Promise<AxiosResponse<Inquiry>> => api.post('/inquiries', data);
export const getInquiries = (): Promise<AxiosResponse<Inquiry[]>> => api.get('/inquiries');
export const exportInquiries = (): string => `${API}/inquiries/export`;
export const deleteInquiry = (id: string): Promise<AxiosResponse<void>> => api.delete(`/inquiries/${id}`);

// Company Info
export const getCompanyInfo = (): Promise<AxiosResponse<CompanyInfo>> => api.get('/company-info');
export const updateCompanyInfo = (data: Partial<CompanyInfo>): Promise<AxiosResponse<CompanyInfo>> => api.put('/company-info', data);

// MyLittleTales Products
export const getMyLittleTalesProducts = (): Promise<AxiosResponse<any[]>> => api.get('/mylittletales/products');

// Link Pages
export interface LinkPage {
  id?: string;
  brand_slug: string;
  brand_name: string;
  tagline: string;
  description: string;
  logo_url: string;
  website_url?: string;
  website_text?: string;
  instagram_url?: string;
  instagram_text?: string;
  facebook_url?: string;
  facebook_text?: string;
  whatsapp_url?: string;
  whatsapp_text?: string;
  google_review_url?: string;
  google_review_text?: string;
  qr_codes?: Array<{
    title: string;
    url: string;
  }>;
  gradient_from?: string;
  gradient_to?: string;
  bg_gradient_from?: string;
  bg_gradient_via?: string;
  bg_gradient_to?: string;
  background_image_url?: string;
  created_at?: string;
  updated_at?: string;
}

export const getLinkPages = (): Promise<AxiosResponse<LinkPage[]>> => api.get('/link-pages');
export const getLinkPageBySlug = (brandSlug: string): Promise<AxiosResponse<LinkPage>> => api.get(`/link-pages/${brandSlug}`);
export const createLinkPage = (data: Partial<LinkPage>): Promise<AxiosResponse<LinkPage>> => api.post('/link-pages', data);
export const updateLinkPage = (brandSlug: string, data: Partial<LinkPage>): Promise<AxiosResponse<LinkPage>> => api.put(`/link-pages/${brandSlug}`, data);
export const deleteLinkPage = (brandSlug: string): Promise<AxiosResponse<void>> => api.delete(`/link-pages/${brandSlug}`);

// UPI Payment Info
export interface UPIPaymentInfo {
  id?: string;
  company_name: string;
  brand_name: string;
  gst_number: string;
  upi_id: string;
  qr_code_url: string;
  updated_at?: string;
}

export const getUPIPaymentInfo = (): Promise<AxiosResponse<UPIPaymentInfo>> => api.get('/upi-payment-info');
export const updateUPIPaymentInfo = (data: Partial<UPIPaymentInfo>): Promise<AxiosResponse<UPIPaymentInfo>> => api.put('/upi-payment-info', data);

