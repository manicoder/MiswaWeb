import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell, LoadingOverlay, Alert, Button, Stack, Container, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState, useEffect } from 'react';
import React from 'react';

// Layout components
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

// Common Dashboard
import Dashboard from './features/dashboard/components/Dashboard';

// Shopify feature components
import ShopifyDashboard from './features/shopify/dashboard/components/Dashboard';
import ShopifyProductList from './features/shopify/products/components/EnhancedProductList';
import ShopifyProductDetails from './features/shopify/products/components/ProductDetails';
import ShopifyCustomerList from './features/shopify/customers/components/CustomerList';
import ShopifyOrderList from './features/shopify/orders/components/EnhancedOrderList';
//import ShopifyInventoryList from './features/shopify/inventory/components/InventoryList.tsx.backup_new';
import DatabaseBackedInventoryList from './features/shopify/inventory/components/DatabaseBackedInventoryList';
import SmartSearchInventoryList from './features/shopify/smart-search-inventory/components/SmartSearchInventoryList';

// Amazon feature components
import AmazonProductList from './features/amazon/products/components/ProductList';

// Flipkart feature components
import FlipkartProductList from './features/flipkart/products/components/ProductList';

// Finance feature components
import FinanceDashboard from './features/finance/components/FinanceDashboard';
import ExpenseManagement from './features/finance/components/ExpenseManagement';
import AddExpense from './features/finance/components/AddExpense';
import EditExpense from './features/finance/components/EditExpense';
import PurchaseOrderManagement from './features/finance/components/PurchaseOrderManagement';
import PurchaseOrderList from './features/finance/components/PurchaseOrderList';
import PurchaseOrderJourney from './features/finance/components/PurchaseOrderJourney';
import { useParams } from 'react-router-dom';

// Wrapper component to pass purchaseOrderId from URL params
const PurchaseOrderJourneyWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <PurchaseOrderJourney purchaseOrderId={id || ''} />;
};
import PurchaseEntries from './features/finance/components/PurchaseEntries';
import SupplierPayments from './features/finance/components/SupplierPayments';
import AddSuppliers from './features/finance/components/AddSuppliers';
import SalesList from './features/finance/components/SalesList';
import AccountingSystem from './features/finance/accounting/components/AccountingSystem';
import AccountingReports from './features/finance/accounting/components/AccountingReports';

// Shipping/Logistics feature components
import JobManagement from './features/shipping/job-management/components/JobManagement';
import LabelManagement from './features/shipping/label-management/components/LabelManagement';

// Fulfillment feature components
import FulfillmentDashboard from './features/fulfillment/components/FulfillmentDashboard';
import ShipmentDetail from './features/fulfillment/components/ShipmentDetail';
import WarehouseManager from './features/fulfillment/components/WarehouseManager';

// PDF Tools components
import MergePdf from './features/tools/pdf/components/MergePdf';
import SplitPdf from './features/tools/pdf/components/SplitPdf';
import CsvToPdf from './features/tools/pdf/components/CsvToPdf';
import ExcelToPdf from './features/tools/pdf/components/ExcelToPdf';
import AmazonLabels from './features/tools/pdf/components/AmazonLabels';
import PdfManager from './features/tools/pdf/components/PdfManager';

// Auth
import Login from './features/auth/components/Login';
import Profile from './features/auth/components/Profile';

// Team
import TeamManagement from './features/team/components/TeamManagement';
import AcceptInvitation from './features/team/components/AcceptInvitation';

// Settings
import Settings from './features/settings/components/Settings';

// Context
import { useTheme } from './contexts/useTheme';
import { CostFetchingProvider } from './contexts/CostFetchingContext';

// Types
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container size="sm" py="xl">
          <Alert color="red" title="Something went wrong">
            <Stack gap="sm">
              <Text size="sm">
                An unexpected error occurred. Please refresh the page or try again.
              </Text>
              <Text size="xs" c="dimmed">
                Error: {this.state.error?.message || 'Unknown error'}
              </Text>
              <Button onClick={() => window.location.reload()}>Refresh Page</Button>
            </Stack>
          </Alert>
        </Container>
      );
    }

    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  console.log('AppContent - Component rendering...');
  const [opened, { toggle, close }] = useDisclosure();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { colorScheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Initialize authentication state
  useEffect(() => {
    console.log('AppContent - Initializing authentication...');
    const initializeAuth = () => {
      try {
        const token = localStorage.getItem('mlt-admin-token');
        console.log('AppContent - Token found:', !!token);
        setIsAuthenticated(!!token);
      } catch (error) {
        console.error('Error initializing authentication:', error);
        setIsAuthenticated(false);
      } finally {
        console.log('AppContent - Authentication initialized');
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  // Listen for storage changes (login/logout in other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mlt-admin-token') {
        setIsAuthenticated(!!e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Show loading state while initializing
  if (!isInitialized || isAuthenticated === null) {
    return <LoadingOverlay visible />;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <ErrorBoundary>
      <AppShell
        navbar={{
          width: isCollapsed
            ? {
                base: 70, // Collapsed mobile width
                sm: 70, // Collapsed small screen width
                md: 80, // Collapsed medium screen width (tablet)
                lg: 80, // Collapsed large screen width (desktop)
              }
            : {
                base: 280, // Mobile width
                sm: 260, // Small screen width
                md: 300, // Medium screen width (tablet)
                lg: 320, // Large screen width (desktop)
              },
          breakpoint: 'md', // Hide navbar on screens smaller than md
          collapsed: { mobile: !opened, desktop: false },
        }}
        padding={0} // Remove default padding since we'll handle it manually
        style={
          {
            colorScheme: colorScheme,
            '--mantine-color-default':
              colorScheme === 'dark' ? '#1b1d22' : 'var(--mantine-color-white)',
          } as React.CSSProperties
        }
        data-mantine-color-scheme={colorScheme}
      >
        <AppShell.Navbar p={0}>
          <Sidebar onNavClick={close} onToggle={toggleSidebar} isCollapsed={isCollapsed} />
        </AppShell.Navbar>

        <AppShell.Main
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {/* Header positioned inside main content area */}
          <div
            style={{
              height: '70px',
              borderBottom: '1px solid var(--mantine-color-default-border)',
              backgroundColor: 'var(--mantine-color-default)',
              position: 'sticky',
              top: 0,
              zIndex: 100,
            }}
          >
            <Header opened={opened} toggle={toggle} />
          </div>

          {/* Main content area */}
          <div
            style={{
              flex: 1,
              padding: 'var(--mantine-spacing-md)',
            }}
          >
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* Common Dashboard */}
                <Route path="/dashboard" element={<Dashboard />} />

                {/* Shopify routes */}
                <Route path="/shopify/dashboard" element={<ShopifyDashboard />} />
                <Route path="/shopify/orders" element={<ShopifyOrderList />} />
                <Route path="/shopify/products" element={<ShopifyProductList />} />
                <Route path="/shopify/products/:id" element={<ShopifyProductDetails />} />
                <Route path="/shopify/customers" element={<ShopifyCustomerList />} />
                {/*<Route path="/shopify/inventory" element={<ShopifyInventoryList />} />*/}
                <Route
                  path="/shopify/database-inventory"
                  element={<DatabaseBackedInventoryList />}
                />
                <Route
                  path="/shopify/smart-search-inventory"
                  element={<SmartSearchInventoryList />}
                />

                {/* Amazon routes */}
                <Route path="/amazon/products" element={<AmazonProductList />} />

                {/* Flipkart routes */}
                <Route path="/flipkart/products" element={<FlipkartProductList />} />

                {/* Finance routes */}
                <Route path="/finance/dashboard" element={<FinanceDashboard />} />
                <Route path="/finance/expense-management" element={<ExpenseManagement />} />
                <Route path="/finance/add-expense" element={<AddExpense />} />
                <Route path="/finance/edit-expense/:id" element={<EditExpense />} />
                <Route path="/finance/purchase-orders" element={<PurchaseOrderList />} />
                <Route
                  path="/finance/purchase-orders/create"
                  element={<PurchaseOrderManagement />}
                />
                <Route
                  path="/finance/purchase-orders/:id/journey"
                  element={<PurchaseOrderJourneyWrapper />}
                />
                <Route path="/finance/purchase-entries" element={<PurchaseEntries />} />
                <Route path="/finance/supplier-payments" element={<SupplierPayments />} />
                <Route path="/finance/add-suppliers" element={<AddSuppliers />} />
                <Route path="/finance/sales" element={<SalesList />} />
                <Route path="/finance/accounting" element={<AccountingSystem />} />
                <Route path="/finance/accounting/reports" element={<AccountingReports />} />

                {/* Shipping/Logistics routes */}
                <Route path="/logistics/shipping/jobs" element={<JobManagement />} />
                <Route path="/logistics/shipping/labels" element={<LabelManagement />} />

                {/* Warehouse & Fulfillment routes */}
                <Route
                  path="/logistics/fulfillment"
                  element={<Navigate to="/logistics/warehouse-fulfillment" replace />}
                />
                <Route
                  path="/logistics/fulfillment/shipment/:id"
                  element={<Navigate to="/logistics/warehouse-fulfillment/shipment/:id" replace />}
                />
                <Route path="/logistics/warehouse-manager" element={<WarehouseManager />} />
                <Route path="/logistics/warehouse-fulfillment" element={<FulfillmentDashboard />} />
                <Route
                  path="/logistics/warehouse-fulfillment/shipment/:id"
                  element={<ShipmentDetail />}
                />

                {/* PDF Tools routes */}
                <Route path="/tools/pdf-manager" element={<PdfManager />} />
                <Route path="/tools/merge-pdf" element={<MergePdf />} />
                <Route path="/tools/split-pdf" element={<SplitPdf />} />
                <Route path="/tools/csv-to-pdf" element={<CsvToPdf />} />
                <Route path="/tools/excel-to-pdf" element={<ExcelToPdf />} />
                <Route path="/tools/amazon-labels" element={<AmazonLabels />} />

                {/* Team Management */}
                <Route path="/team" element={<TeamManagement />} />
                <Route path="/auth/accept-invitation" element={<AcceptInvitation />} />

                {/* Profile & Settings */}
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />

                {/* Legacy redirects */}
                <Route path="/orders" element={<Navigate to="/shopify/orders" replace />} />
                <Route path="/products" element={<Navigate to="/shopify/products" replace />} />
                <Route path="/customers" element={<Navigate to="/shopify/customers" replace />} />
                <Route path="/inventory" element={<Navigate to="/shopify/inventory" replace />} />

                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </ErrorBoundary>
          </div>
        </AppShell.Main>
      </AppShell>
    </ErrorBoundary>
  );
};

function App() {
  return (
    <CostFetchingProvider>
      <AppContent />
    </CostFetchingProvider>
  );
}

export default App;
