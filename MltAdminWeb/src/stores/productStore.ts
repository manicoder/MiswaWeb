import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface ProductFilters {
  search: string;
  status: string;
  tab: 'all' | 'limited-stock' | 'out-of-stock' | 'smart-search' | 'barcode-update';
  page: number;
  pageSize: number;
}

export interface ProductUIState {
  viewMode: 'grid' | 'table';
}

export interface ProductStoreState {
  // Filters and pagination
  filters: ProductFilters;

  // UI state
  ui: ProductUIState;

  // Actions
  setSearch: (search: string) => void;
  setStatus: (status: string) => void;
  setTab: (tab: ProductFilters['tab']) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setViewMode: (mode: 'grid' | 'table') => void;

  // Utility actions
  resetFilters: () => void;
  resetToFirstPage: () => void;
}

const initialFilters: ProductFilters = {
  search: '',
  status: '',
  tab: 'all',
  page: 1,
  pageSize: 50,
};

const initialUIState: ProductUIState = {
  viewMode: 'table',
};

export const useProductStore = create<ProductStoreState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        filters: initialFilters,
        ui: initialUIState,

        // Filter actions
        setSearch: (search: string) =>
          set(
            (state) => ({
              filters: {
                ...state.filters,
                search,
                page: 1, // Reset to first page on search
              },
            }),
            false,
            'setSearch',
          ),

        setStatus: (status: string) =>
          set(
            (state) => ({
              filters: {
                ...state.filters,
                status,
                page: 1, // Reset to first page on filter change
              },
            }),
            false,
            'setStatus',
          ),

        setTab: (tab: ProductFilters['tab']) =>
          set(
            (state) => ({
              filters: {
                ...state.filters,
                tab,
                page: 1, // Reset to first page on tab change
              },
            }),
            false,
            'setTab',
          ),

        setPage: (page: number) =>
          set(
            (state) => ({
              filters: {
                ...state.filters,
                page,
              },
            }),
            false,
            'setPage',
          ),

        setPageSize: (pageSize: number) =>
          set(
            (state) => ({
              filters: {
                ...state.filters,
                pageSize,
                page: 1, // Reset to first page on page size change
              },
            }),
            false,
            'setPageSize',
          ),

        // UI actions
        setViewMode: (viewMode: 'grid' | 'table') =>
          set(
            (state) => ({
              ui: {
                ...state.ui,
                viewMode,
              },
            }),
            false,
            'setViewMode',
          ),

        // Utility actions
        resetFilters: () =>
          set(
            {
              filters: initialFilters,
            },
            false,
            'resetFilters',
          ),

        resetToFirstPage: () =>
          set(
            (state) => ({
              filters: {
                ...state.filters,
                page: 1,
              },
            }),
            false,
            'resetToFirstPage',
          ),
      }),
      {
        name: 'product-store', // Unique name for localStorage
        partialize: (state) => ({
          // Only persist filters and view mode
          filters: state.filters,
          ui: {
            viewMode: state.ui.viewMode,
          },
        }),
      },
    ),
    {
      name: 'ProductStore', // Name for Redux DevTools
    },
  ),
);

// Selectors for better performance
export const useProductFilters = () => useProductStore((state) => state.filters);
export const useProductUI = () => useProductStore((state) => state.ui);

// Selectors for different parts of the store
const actionsSelector = (state: ProductStoreState) => ({
  setSearch: state.setSearch,
  setStatus: state.setStatus,
  setTab: state.setTab,
  setPage: state.setPage,
  setPageSize: state.setPageSize,
  setViewMode: state.setViewMode,
  resetFilters: state.resetFilters,
  resetToFirstPage: state.resetToFirstPage,
});

export const useProductActions = () => useProductStore(actionsSelector);
