import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Container,
  Title,
  Paper,
  Group,
  Badge,
  Stack,
  Text,
  Loader,
  Center,
  Alert,
  ActionIcon,
  ScrollArea,
  Table,
  Tabs,
  Progress,
  Skeleton,
  Tooltip,
  Button,
  Modal,
  Textarea,
  Select,
} from '@mantine/core';
import {
  IconExternalLink,
  IconPackage,
  IconUser,
  IconMapPin,
  IconCalendar,
  IconRefresh,
  IconAlertCircle,
  IconChevronDown,
  IconChevronRight,
  IconCheck,
  IconX,
  IconExclamationMark,
  IconNotes,
  IconScan,
  IconChartBar,
  IconClock,
  IconClipboardCheck,
} from '@tabler/icons-react';
import CourierIcon from '../../../../components/common/CourierIcon';
import { useMediaQuery } from '@mantine/hooks';
import { format } from 'date-fns';
import { notifications } from '@mantine/notifications';
import { jobManagementService } from '../../../../services/jobManagementService';
import {
  orderPickupService,
  type UpdatePickupStatusDto,
} from '../../../../services/orderPickupService';
import {
  getResponsivePadding,
  getResponsiveSectionMargin,
  getResponsiveStackGap,
  getResponsiveGroupGap,
  getResponsiveTitleSize,
  getResponsiveTitleOrder,
  getResponsiveTitleIconSize,
  getResponsiveIconSize,
  getResponsiveActionIconSize,
  getResponsiveButtonSize,
  getResponsiveCaptionSize,
} from '../../../../constants/mobileDesignSystem';

interface TrackingInfo {
  number: string;
  url: string;
  company: string;
}

interface Customer {
  firstName: string;
  lastName: string;
  email: string;
  fullName: string;
}

interface ShippingAddress {
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

interface Fulfillment {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  trackingInfo?: TrackingInfo;
  service?: {
    serviceName: string;
    type: string;
  };
}

interface LineItem {
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

interface PickupStatus {
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

interface Order {
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
  pickupStatus?: PickupStatus;
}

interface CourierGroup {
  courierName: string;
  orderCount: number;
  orders: Order[];
}

interface JobManagementData {
  courierGroups: CourierGroup[];
  totalOrders: number;
  nextCursor?: string;
  hasNextPage: boolean;
}

const JobManagement: React.FC = () => {
  const [data, setData] = useState<JobManagementData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('today');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isTabSwitching, setIsTabSwitching] = useState<boolean>(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set());
  const [forceRender, setForceRender] = useState<number>(0);
  const [optimisticUpdates, setOptimisticUpdates] = useState<
    Record<string, 'pickup' | 'not_pickup' | 'missing'>
  >({});
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [pickupStatus, setPickupStatus] = useState<'pickup' | 'not_pickup' | 'missing'>(
    'not_pickup',
  );
  const [pickupNotes, setPickupNotes] = useState<string>('');
  const [pickupModalOpen, setPickupModalOpen] = useState<boolean>(false);
  const [updatingPickup, setUpdatingPickup] = useState<boolean>(false);
  const [scannerStatus, setScannerStatus] = useState<'idle' | 'detecting' | 'processing'>('idle');
  const [scannerBuffer, setScannerBuffer] = useState<string>('');

  // Refs
  const immediateUpdatesRef = useRef<Record<string, 'pickup' | 'not_pickup' | 'missing'>>({});
  const keyTimestampsRef = useRef<number[]>([]);
  const scannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Media query for mobile
  const isMobile = useMediaQuery('(max-width: 768px)');

  const fetchData = useCallback(async (dateFilter?: string) => {
    try {
      setLoading(true);
      const response = await jobManagementService.getFulfilledOrders(
        250,
        undefined,
        dateFilter && dateFilter !== 'all' ? dateFilter : undefined,
      );

      setData(response.data);
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch job management data';
      console.error('❌ Error fetching job management data:', err);
      console.error('❌ Error details:', {
        message: errorMessage,
        response:
          err instanceof Error && 'response' in err
            ? (err as { response: { data: unknown } }).response?.data
            : undefined,
        status:
          err instanceof Error && 'response' in err
            ? (err as { response: { status: number } }).response?.status
            : undefined,
        config:
          err instanceof Error && 'config' in err
            ? (err as { config: { url: string } }).config?.url
            : undefined,
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isTabSwitching) {
      fetchData(selectedDateFilter);
    }
  }, [selectedDateFilter, fetchData, isTabSwitching]);

  const updatePickupStatusDirectly = useCallback(
    async (order: Order, newStatus: 'pickup' | 'not_pickup' | 'missing', notes?: string) => {
      const trackingNumber = order.fulfillments.find((f) => f.trackingInfo?.number)?.trackingInfo
        ?.number;

      if (!trackingNumber) {
        notifications.show({
          title: 'Error',
          message: 'No tracking number found for this order',
          color: 'red',
        });
        return;
      }

      const fulfillmentDate = order.fulfillments.find((f) => f.createdAt)?.createdAt;

      if (!fulfillmentDate) {
        notifications.show({
          title: 'Error',
          message: 'No fulfillment date found for this order',
          color: 'red',
        });
        return;
      }

      const courierCompany =
        order.fulfillments.find((f) => f.trackingInfo?.company)?.trackingInfo?.company || 'Unknown';

      // For missing status, open modal to get notes
      if (newStatus === 'missing' && !notes) {
        setSelectedOrder(order);
        setPickupStatus('missing');
        setPickupNotes('');
        setPickupModalOpen(true);
        return;
      }

      // Immediate update - instant visual feedback
      immediateUpdatesRef.current[order.id] = newStatus;
      setForceRender((prev) => prev + 1);
      setUpdatingOrders((prev) => new Set([...prev, order.id]));

      // Also set optimistic update for analytics
      setOptimisticUpdates((prev) => ({ ...prev, [order.id]: newStatus }));

      try {
        const updateDto: UpdatePickupStatusDto = {
          shopifyOrderId: order.id,
          orderName: order.name,
          pickupStatus: newStatus,
          notes: notes || undefined,
          fulfillmentDate,
          courierCompany,
          trackingNumber,
        };

        await orderPickupService.updatePickupStatus(updateDto);

        const statusText =
          newStatus === 'pickup'
            ? 'Picked Up'
            : newStatus === 'missing'
              ? 'Missing'
              : 'Not Picked Up';

        notifications.show({
          title: 'Success',
          message: `Order ${order.name} marked as ${statusText}`,
          color: newStatus === 'pickup' ? 'green' : newStatus === 'missing' ? 'red' : 'orange',
        });

        // Clear immediate and optimistic updates, refresh data
        delete immediateUpdatesRef.current[order.id];
        setOptimisticUpdates((prev) => {
          const newState = { ...prev };
          delete newState[order.id];
          return newState;
        });
        setUpdatingOrders((prev) => {
          const newSet = new Set(prev);
          newSet.delete(order.id);
          return newSet;
        });
        await fetchData(selectedDateFilter);
      } catch (error) {
        // Revert immediate and optimistic updates on error
        delete immediateUpdatesRef.current[order.id];
        setOptimisticUpdates((prev) => {
          const newState = { ...prev };
          delete newState[order.id];
          return newState;
        });
        setUpdatingOrders((prev) => {
          const newSet = new Set(prev);
          newSet.delete(order.id);
          return newSet;
        });
        setForceRender((prev) => prev + 1);

        notifications.show({
          title: 'Error',
          message: error instanceof Error ? error.message : 'Failed to update pickup status',
          color: 'red',
        });
      }
    },
    [fetchData, selectedDateFilter],
  );

  const handleBarcodeDetected = useCallback(
    async (scannedValue: string) => {
      if (!scannedValue.trim() || !data) return;

      setScannerStatus('processing');
      const trimmedValue = scannedValue.trim();

      // Search for order by order name (ID) or tracking number
      let foundOrder: Order | null = null;
      let matchType = '';

      for (const group of data.courierGroups) {
        for (const order of group.orders) {
          // Check if matches order name/ID (flexible matching)
          const orderName = order.name.toLowerCase();
          const scannedLower = trimmedValue.toLowerCase();

          // Direct match
          if (orderName === scannedLower) {
            foundOrder = order;
            matchType = 'Order ID';
            break;
          }

          // Remove # prefix and try again
          const orderNameWithoutHash = orderName.replace(/^#/, '');
          const scannedValueWithoutHash = scannedLower.replace(/^#/, '');

          if (orderNameWithoutHash === scannedValueWithoutHash) {
            foundOrder = order;
            matchType = 'Order ID';
            break;
          }

          // Try with # prefix added
          if (orderName === `#${scannedLower}` || `#${orderName}` === scannedLower) {
            foundOrder = order;
            matchType = 'Order ID';
            break;
          }

          // Check if matches any tracking number
          for (const fulfillment of order.fulfillments) {
            if (fulfillment.trackingInfo?.number?.toLowerCase() === trimmedValue.toLowerCase()) {
              foundOrder = order;
              matchType = 'Tracking Number';
              break;
            }
          }

          if (foundOrder) break;
        }
        if (foundOrder) break;
      }

      if (foundOrder) {
        // Check if already picked up
        if (foundOrder.pickupStatus?.pickupStatus === 'pickup') {
          notifications.show({
            title: '✓ Already Picked Up',
            message: `Order ${foundOrder.name} is already marked as picked up`,
            color: 'blue',
            icon: <IconCheck size={16} />,
          });
        } else {
          // Mark as picked up
          try {
            await updatePickupStatusDirectly(foundOrder, 'pickup');
            notifications.show({
              title: '✓ Scanned & Marked',
              message: `Order ${foundOrder.name} found by ${matchType} and marked as picked up`,
              color: 'green',
              icon: <IconCheck size={16} />,
            });
          } catch {
            // Error already handled in updatePickupStatusDirectly
          }
        }
      } else {
        notifications.show({
          title: '⚠ Order Not Found',
          message: `No order found with ID or tracking number: "${trimmedValue}". Check if the order is in the current date filter.`,
          color: 'orange',
          icon: <IconAlertCircle size={16} />,
        });
      }

      setScannerBuffer('');
      setScannerStatus('idle');
    },
    [data, updatePickupStatusDirectly],
  );

  // Background barcode scanner - NO interference with input fields
  useEffect(() => {
    const handleBackgroundScan = (event: KeyboardEvent) => {
      // Skip if user is typing in ANY input field, textarea, contentEditable, or form
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'FORM' ||
        target.tagName === 'BUTTON' ||
        target.contentEditable === 'true' ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('form') ||
        target.closest('button') ||
        target.closest('[contenteditable]') ||
        target.closest('[role="dialog"]') ||
        target.closest('[data-mantine-modal]')
      ) {
        return; // Don't interfere with normal typing, form submissions, or modals
      }

      // Only process printable characters and Enter
      if (event.key === 'Enter') {
        // Skip Enter key if we're in a form context
        if (target.closest('form') || target.tagName === 'FORM') {
          return;
        }

        // Enter key - process the buffer if it looks like a barcode
        if (scannerBuffer.length >= 6) {
          handleBarcodeDetected(scannerBuffer);
        }
        setScannerBuffer('');
        setScannerStatus('idle');
        return;
      }

      // Only process single printable characters (barcode data)
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const currentTime = Date.now();

        // Track key timing
        keyTimestampsRef.current.push(currentTime);

        // Keep only recent timestamps (last 2 seconds)
        keyTimestampsRef.current = keyTimestampsRef.current.filter(
          (time) => currentTime - time < 2000,
        );

        // Calculate typing speed
        const recentKeys = keyTimestampsRef.current.filter((time) => currentTime - time < 500);
        const isRapidTyping = recentKeys.length >= 5; // 5+ keys in 500ms = likely scanner

        // Update buffer
        const newBuffer = scannerBuffer + event.key;
        setScannerBuffer(newBuffer);

        // Set scanning status based on typing speed
        if (isRapidTyping) {
          setScannerStatus('detecting');
        }

        // Clear timeout
        if (scannerTimeoutRef.current) {
          clearTimeout(scannerTimeoutRef.current);
        }

        // Auto-process after delay (if typing stops)
        scannerTimeoutRef.current = setTimeout(() => {
          if (newBuffer.length >= 6 && isRapidTyping) {
            handleBarcodeDetected(newBuffer);
          }
          setScannerBuffer('');
          setScannerStatus('idle');
        }, 300); // Wait 300ms after typing stops
      }
    };

    document.addEventListener('keydown', handleBackgroundScan);

    return () => {
      document.removeEventListener('keydown', handleBackgroundScan);
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
      }
    };
  }, [scannerBuffer, handleBarcodeDetected]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData(selectedDateFilter);
  };

  const handleTabChange = async (value: string | null) => {
    if (!value || value === selectedDateFilter) return;

    setIsTabSwitching(true);
    setSelectedDateFilter(value);
    setLoading(true);
    await fetchData(value);
  };

  const toggleGroup = (courierName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(courierName)) {
      newExpanded.delete(courierName);
    } else {
      newExpanded.add(courierName);
    }
    setExpandedGroups(newExpanded);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'INR',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'fulfilled':
        return 'green';
      case 'partial':
        return 'yellow';
      case 'pending':
        return 'blue';
      default:
        return 'gray';
    }
  };

  // Pickup status functions
  const openPickupModal = (order: Order) => {
    setSelectedOrder(order);
    setPickupStatus(order.pickupStatus?.pickupStatus || 'not_pickup');
    setPickupNotes(order.pickupStatus?.notes || '');
    setPickupModalOpen(true);
  };

  const closePickupModal = () => {
    setPickupModalOpen(false);
    setSelectedOrder(null);
    setPickupStatus('not_pickup');
    setPickupNotes('');
  };

  const updatePickupStatus = async () => {
    if (!selectedOrder) return;

    setUpdatingPickup(true);

    try {
      await updatePickupStatusDirectly(selectedOrder, pickupStatus, pickupNotes);
      closePickupModal();
    } catch {
      // Error already handled in updatePickupStatusDirectly
    } finally {
      setUpdatingPickup(false);
    }
  };

  // Get effective pickup status (immediate, optimistic, or real)
  const getEffectivePickupStatus = (order: Order): 'pickup' | 'not_pickup' | 'missing' => {
    return (
      immediateUpdatesRef.current[order.id] ||
      optimisticUpdates[order.id] ||
      order.pickupStatus?.pickupStatus ||
      'not_pickup'
    );
  };

  const getPickupStatusBadge = (order: Order) => {
    const status = getEffectivePickupStatus(order);

    switch (status) {
      case 'pickup':
        return (
          <Badge color="green" variant="light" size="xs">
            Picked Up
          </Badge>
        );
      case 'missing':
        return (
          <Badge color="red" variant="light" size="xs">
            Missing
          </Badge>
        );
      default:
        return (
          <Badge color="orange" variant="light" size="xs">
            Not Picked Up
          </Badge>
        );
    }
  };

  // Get row color directly (no useMemo to ensure immediate updates)
  const getRowColor = (order: Order) => {
    const status =
      immediateUpdatesRef.current[order.id] ||
      optimisticUpdates[order.id] ||
      order.pickupStatus?.pickupStatus ||
      'not_pickup';

    switch (status) {
      case 'pickup':
        return '#22c55e'; // Solid green (matches button color)
      case 'missing':
        return '#ef4444'; // Solid red (matches button color)
      case 'not_pickup':
        return '#f97316'; // Solid orange (matches button color)
      default:
        return undefined;
    }
  };

  // Memoize stats to prevent unnecessary recalculations
  const stats = useMemo(() => {
    if (!data) return null;

    let pickup = 0;
    let notPickup = 0;
    let missing = 0;
    const courierStats: Array<{
      name: string;
      pickup: number;
      notPickup: number;
      missing: number;
      total: number;
    }> = [];

    data.courierGroups.forEach((group) => {
      let courierPickup = 0;
      let courierNotPickup = 0;
      let courierMissing = 0;

      group.orders.forEach((order) => {
        const status =
          immediateUpdatesRef.current[order.id] ||
          optimisticUpdates[order.id] ||
          order.pickupStatus?.pickupStatus ||
          'not_pickup';
        if (status === 'pickup') {
          pickup++;
          courierPickup++;
        } else if (status === 'missing') {
          missing++;
          courierMissing++;
        } else {
          notPickup++;
          courierNotPickup++;
        }
      });

      courierStats.push({
        name: group.courierName,
        pickup: courierPickup,
        notPickup: courierNotPickup,
        missing: courierMissing,
        total: group.orderCount,
      });
    });

    return {
      totalOrders: data.totalOrders,
      pickup,
      notPickup,
      missing,
      courierStats,
    };
  }, [data, optimisticUpdates]); // Removed forceRender from dependencies

  // Get tab counts
  const tabCounts = useMemo(() => {
    if (!data) return { today: 0, yesterday: 0, '7days': 0, '30days': 0, all: 0 };
    // For now, we only have the total count from current filter
    // In a real app, you might want to fetch counts for each filter separately
    return {
      today: selectedDateFilter === 'today' ? data.totalOrders : 0,
      yesterday: selectedDateFilter === 'yesterday' ? data.totalOrders : 0,
      '7days': selectedDateFilter === '7days' ? data.totalOrders : 0,
      '30days': selectedDateFilter === '30days' ? data.totalOrders : 0,
      all: selectedDateFilter === 'all' ? data.totalOrders : 0,
    };
  }, [data, selectedDateFilter]);

  // Skeleton loading component
  const JobManagementTableSkeleton = () => (
    <ScrollArea>
      <Table stickyHeader>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ minWidth: '200px' }}>Courier Company</Table.Th>
            <Table.Th style={{ minWidth: '100px' }}>Orders</Table.Th>
            <Table.Th style={{ minWidth: '150px' }}>Total Value</Table.Th>
            <Table.Th style={{ minWidth: '120px' }}>Latest Order</Table.Th>
            <Table.Th style={{ minWidth: '120px' }}>Pickup Status</Table.Th>
            <Table.Th style={{ minWidth: '80px' }}></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {Array.from({ length: 5 }).map((_, index) => (
            <Table.Tr key={index}>
              <Table.Td>
                <Group gap="sm">
                  <Skeleton height={20} width={20} />
                  <Skeleton height={16} width="60%" />
                </Group>
              </Table.Td>
              <Table.Td>
                <Skeleton height={20} width="40%" />
              </Table.Td>
              <Table.Td>
                <Skeleton height={16} width="70%" />
              </Table.Td>
              <Table.Td>
                <Skeleton height={16} width="80%" />
              </Table.Td>
              <Table.Td>
                <Skeleton height={16} width="60%" />
              </Table.Td>
              <Table.Td>
                <Skeleton height={16} width={16} />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );

  if (error) {
    return (
      <Container size="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" variant="light">
          {error}
          <Button variant="light" size="sm" onClick={handleRefresh} mt="md" loading={refreshing}>
            Try Again
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" py={getResponsivePadding(isMobile)}>
      {/* Header */}
      <Stack mb={getResponsiveSectionMargin(isMobile)} gap={getResponsiveStackGap(isMobile)}>
        <Group justify="space-between" align={isMobile ? 'flex-start' : 'center'} wrap="wrap">
          <Group gap={getResponsiveGroupGap(isMobile)}>
            <IconClipboardCheck
              size={getResponsiveTitleIconSize(isMobile)}
              color="var(--mantine-color-blue-6)"
            />
            <Title
              order={getResponsiveTitleOrder(isMobile)}
              size={getResponsiveTitleSize(isMobile)}
            >
              Job Management
            </Title>
          </Group>
          <Group gap={getResponsiveGroupGap(isMobile)}>
            {data && (
              <Badge size="lg" variant="light" color="blue">
                Total Orders: {data.totalOrders}
              </Badge>
            )}
            <Tooltip label="Refresh data">
              <ActionIcon
                size={getResponsiveActionIconSize(isMobile)}
                variant="subtle"
                onClick={handleRefresh}
                loading={refreshing}
              >
                <IconRefresh size={getResponsiveIconSize(isMobile)} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Stack>

      {/* Background Scanner Status - Non-interactive */}
      {(scannerStatus !== 'idle' || scannerBuffer.length > 0) && (
        <Paper
          withBorder
          radius="md"
          p={isMobile ? 'sm' : 'md'}
          mb="md"
          style={{
            backgroundColor:
              scannerStatus === 'processing'
                ? 'var(--mantine-color-blue-0)'
                : scannerStatus === 'detecting'
                  ? 'var(--mantine-color-green-0)'
                  : 'var(--mantine-color-gray-0)',
            borderColor:
              scannerStatus === 'processing'
                ? 'var(--mantine-color-blue-4)'
                : scannerStatus === 'detecting'
                  ? 'var(--mantine-color-green-4)'
                  : 'var(--mantine-color-gray-4)',
            transition: 'all 0.2s ease',
          }}
        >
          <Group gap="sm">
            <IconScan
              size={20}
              color={
                scannerStatus === 'processing'
                  ? 'var(--mantine-color-blue-6)'
                  : scannerStatus === 'detecting'
                    ? 'var(--mantine-color-green-6)'
                    : 'var(--mantine-color-gray-6)'
              }
            />
            <div style={{ flex: 1 }}>
              <Group gap="xs">
                <Text
                  fw={500}
                  size="sm"
                  c={
                    scannerStatus === 'processing'
                      ? 'blue'
                      : scannerStatus === 'detecting'
                        ? 'green'
                        : 'gray'
                  }
                >
                  Background Barcode Scanner
                </Text>
                <Badge
                  size="xs"
                  variant="light"
                  color={
                    scannerStatus === 'processing'
                      ? 'blue'
                      : scannerStatus === 'detecting'
                        ? 'green'
                        : 'gray'
                  }
                >
                  {scannerStatus === 'processing' && 'Processing...'}
                  {scannerStatus === 'detecting' && `Detecting... (${scannerBuffer.length} chars)`}
                  {scannerStatus === 'idle' && 'Ready'}
                </Badge>
              </Group>

              {scannerBuffer.length > 0 && (
                <Text
                  size="xs"
                  ff="monospace"
                  c={scannerStatus === 'detecting' ? 'green' : 'gray'}
                  p="xs"
                  bg={
                    scannerStatus === 'detecting'
                      ? 'var(--mantine-color-green-0)'
                      : 'var(--mantine-color-gray-0)'
                  }
                  style={{
                    borderRadius: '4px',
                    border: `1px solid ${scannerStatus === 'detecting' ? 'var(--mantine-color-green-3)' : 'var(--mantine-color-gray-3)'}`,
                    marginTop: '4px',
                  }}
                >
                  Buffer: {scannerBuffer}
                </Text>
              )}
            </div>
          </Group>
        </Paper>
      )}

      {/* Analytics Section */}
      {data && data.courierGroups.length > 0 && (
        <Paper withBorder radius="md" p={isMobile ? 'sm' : 'md'} mb="md">
          <Stack gap="md">
            <Group gap="sm">
              <IconChartBar size={16} color="var(--mantine-color-blue-6)" />
              <Text fw={500} size="sm" c="blue">
                Pickup Analytics
              </Text>
              <Badge size="sm" variant="light" color="blue">
                {selectedDateFilter === 'today' && 'Today'}
                {selectedDateFilter === 'yesterday' && 'Yesterday'}
                {selectedDateFilter === '7days' && 'Last 7 Days'}
                {selectedDateFilter === '30days' && 'Last 30 Days'}
                {selectedDateFilter === 'all' && 'All Time'}
              </Badge>
            </Group>

            {/* Overall Stats */}
            {isMobile ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--mantine-spacing-xs)',
                }}
              >
                <Badge
                  size="md"
                  variant="light"
                  color="blue"
                  style={{ justifySelf: 'stretch', textAlign: 'center' }}
                >
                  Total: {stats?.totalOrders}
                </Badge>
                <Badge
                  size="md"
                  variant="light"
                  color="green"
                  style={{ justifySelf: 'stretch', textAlign: 'center' }}
                >
                  <Group gap="xs" justify="center">
                    <IconCheck size={12} />
                    <Text size="xs">{stats?.pickup}</Text>
                  </Group>
                </Badge>
                <Badge
                  size="md"
                  variant="light"
                  color="orange"
                  style={{ justifySelf: 'stretch', textAlign: 'center' }}
                >
                  <Group gap="xs" justify="center">
                    <IconClock size={12} />
                    <Text size="xs">{stats?.notPickup}</Text>
                  </Group>
                </Badge>
                <Badge
                  size="md"
                  variant="light"
                  color="red"
                  style={{ justifySelf: 'stretch', textAlign: 'center' }}
                >
                  <Group gap="xs" justify="center">
                    <IconX size={12} />
                    <Text size="xs">{stats?.missing}</Text>
                  </Group>
                </Badge>
              </div>
            ) : (
              <Group gap="md" wrap="wrap">
                <Badge size="lg" variant="light" color="blue">
                  Total: {stats?.totalOrders}
                </Badge>
                <Badge size="lg" variant="light" color="green">
                  <Group gap="xs" wrap="nowrap">
                    <IconCheck size={14} />
                    <Text size="sm">Picked Up: {stats?.pickup}</Text>
                  </Group>
                </Badge>
                <Badge size="lg" variant="light" color="orange">
                  <Group gap="xs" wrap="nowrap">
                    <IconClock size={14} />
                    <Text size="sm">Not Picked Up: {stats?.notPickup}</Text>
                  </Group>
                </Badge>
                <Badge size="lg" variant="light" color="red">
                  <Group gap="xs" wrap="nowrap">
                    <IconX size={14} />
                    <Text size="sm">Missing: {stats?.missing}</Text>
                  </Group>
                </Badge>
              </Group>
            )}

            {/* Courier Breakdown */}
            <div>
              <Text size="sm" fw={500} mb="xs" c="dimmed">
                Courier Status:
              </Text>
              {isMobile ? (
                <Stack gap="xs">
                  {stats?.courierStats.map((courier) => {
                    let statusText = '';
                    let statusColor = 'gray';

                    if (courier.missing > 0) {
                      statusText = `${courier.missing} missing`;
                      statusColor = 'red';
                    } else if (courier.notPickup > 0) {
                      statusText = `${courier.notPickup} pending`;
                      statusColor = 'orange';
                    } else if (courier.pickup > 0) {
                      statusText = 'all done';
                      statusColor = 'green';
                    } else {
                      statusText = 'no orders';
                      statusColor = 'gray';
                    }

                    return (
                      <Badge
                        key={courier.name}
                        size="sm"
                        variant="light"
                        color={statusColor}
                        style={{
                          textTransform: 'none',
                          width: '100%',
                          justifyContent: 'center',
                        }}
                      >
                        {courier.name}: {statusText}
                      </Badge>
                    );
                  })}
                </Stack>
              ) : (
                <Group gap="xs" wrap="wrap">
                  {stats?.courierStats.map((courier) => {
                    let statusText = '';
                    let statusColor = 'gray';

                    if (courier.missing > 0) {
                      statusText = `${courier.missing} missing`;
                      statusColor = 'red';
                    } else if (courier.notPickup > 0) {
                      statusText = `${courier.notPickup} pending`;
                      statusColor = 'orange';
                    } else if (courier.pickup > 0) {
                      statusText = 'all done';
                      statusColor = 'green';
                    } else {
                      statusText = 'no orders';
                      statusColor = 'gray';
                    }

                    return (
                      <Badge
                        key={courier.name}
                        size="md"
                        variant="light"
                        color={statusColor}
                        style={{ textTransform: 'none' }}
                      >
                        {courier.name}: {statusText}
                      </Badge>
                    );
                  })}
                </Group>
              )}
            </div>
          </Stack>
        </Paper>
      )}

      {/* Date Filter Tabs with Progress Indicator */}
      <div style={{ position: 'relative', marginBottom: 'var(--mantine-spacing-md)' }}>
        <Tabs value={selectedDateFilter} onChange={handleTabChange}>
          <Tabs.List
            style={{
              flexWrap: isMobile ? 'nowrap' : 'wrap',
              overflowX: isMobile ? 'auto' : 'visible',
            }}
          >
            <Tabs.Tab
              value="today"
              disabled={isTabSwitching || (loading && !data)}
              style={{ minHeight: '40px', display: 'flex', alignItems: 'center' }}
            >
              <Group gap="xs" wrap="nowrap" style={{ minHeight: '20px' }}>
                <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {isMobile ? 'Today' : "Today's"}
                </Text>
                <div style={{ minWidth: '20px', display: 'flex', justifyContent: 'center' }}>
                  {(isTabSwitching && selectedDateFilter === 'today') ||
                  (loading && !data && selectedDateFilter === 'today') ? (
                    <Loader size="xs" />
                  ) : (
                    tabCounts.today > 0 && (
                      <Badge size="xs" color="green" variant="light">
                        {tabCounts.today}
                      </Badge>
                    )
                  )}
                </div>
              </Group>
            </Tabs.Tab>
            <Tabs.Tab
              value="yesterday"
              disabled={isTabSwitching || (loading && !data)}
              style={{ minHeight: '40px', display: 'flex', alignItems: 'center' }}
            >
              <Group gap="xs" wrap="nowrap" style={{ minHeight: '20px' }}>
                <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {isMobile ? 'Yesterday' : "Yesterday's"}
                </Text>
                <div style={{ minWidth: '20px', display: 'flex', justifyContent: 'center' }}>
                  {(isTabSwitching && selectedDateFilter === 'yesterday') ||
                  (loading && !data && selectedDateFilter === 'yesterday') ? (
                    <Loader size="xs" />
                  ) : (
                    tabCounts.yesterday > 0 && (
                      <Badge size="xs" color="orange" variant="light">
                        {tabCounts.yesterday}
                      </Badge>
                    )
                  )}
                </div>
              </Group>
            </Tabs.Tab>
            <Tabs.Tab
              value="7days"
              disabled={isTabSwitching || (loading && !data)}
              style={{ minHeight: '40px', display: 'flex', alignItems: 'center' }}
            >
              <Group gap="xs" wrap="nowrap" style={{ minHeight: '20px' }}>
                <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {isMobile ? '7 Days' : 'Last 7 Days'}
                </Text>
                <div style={{ minWidth: '20px', display: 'flex', justifyContent: 'center' }}>
                  {(isTabSwitching && selectedDateFilter === '7days') ||
                  (loading && !data && selectedDateFilter === '7days') ? (
                    <Loader size="xs" />
                  ) : (
                    tabCounts['7days'] > 0 && (
                      <Badge size="xs" color="violet" variant="light">
                        {tabCounts['7days']}
                      </Badge>
                    )
                  )}
                </div>
              </Group>
            </Tabs.Tab>
            <Tabs.Tab
              value="30days"
              disabled={isTabSwitching || (loading && !data)}
              style={{ minHeight: '40px', display: 'flex', alignItems: 'center' }}
            >
              <Group gap="xs" wrap="nowrap" style={{ minHeight: '20px' }}>
                <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {isMobile ? '30 Days' : 'Last 30 Days'}
                </Text>
                <div style={{ minWidth: '20px', display: 'flex', justifyContent: 'center' }}>
                  {(isTabSwitching && selectedDateFilter === '30days') ||
                  (loading && !data && selectedDateFilter === '30days') ? (
                    <Loader size="xs" />
                  ) : (
                    tabCounts['30days'] > 0 && (
                      <Badge size="xs" color="indigo" variant="light">
                        {tabCounts['30days']}
                      </Badge>
                    )
                  )}
                </div>
              </Group>
            </Tabs.Tab>
            <Tabs.Tab
              value="all"
              disabled={isTabSwitching || (loading && !data)}
              style={{ minHeight: '40px', display: 'flex', alignItems: 'center' }}
            >
              <Group gap="xs" wrap="nowrap" style={{ minHeight: '20px' }}>
                <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {isMobile ? 'All' : 'All Orders'}
                </Text>
                <div style={{ minWidth: '20px', display: 'flex', justifyContent: 'center' }}>
                  {(isTabSwitching && selectedDateFilter === 'all') ||
                  (loading && !data && selectedDateFilter === 'all') ? (
                    <Loader size="xs" />
                  ) : (
                    tabCounts.all > 0 && (
                      <Badge size="xs" color="blue" variant="light">
                        {tabCounts.all}
                      </Badge>
                    )
                  )}
                </div>
              </Group>
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>

        {/* Progress Bar */}
        <Progress
          value={100}
          size="xs"
          radius={0}
          color="blue"
          striped
          animated
          style={{
            position: 'absolute',
            bottom: '-1px',
            left: 0,
            right: 0,
            zIndex: 1,
            transition: 'opacity 0.3s ease',
            opacity: isTabSwitching || (loading && !data) ? 1 : 0,
          }}
        />
      </div>

      <Paper withBorder radius="md" py={getResponsivePadding(isMobile)} px={0}>
        {/* Results Summary */}
        {data && data.courierGroups.length > 0 && (
          <Group
            justify="space-between"
            px={getResponsivePadding(isMobile)}
            mb={getResponsiveStackGap(isMobile)}
          >
            <Text size={getResponsiveCaptionSize(isMobile)} c="dimmed">
              {data.courierGroups.length} courier companies • {data.totalOrders} orders
              {selectedDateFilter === 'today' && ' (today)'}
              {selectedDateFilter === 'yesterday' && ' (yesterday)'}
              {selectedDateFilter === '7days' && ' (last 7 days)'}
              {selectedDateFilter === '30days' && ' (last 30 days)'}
            </Text>
          </Group>
        )}

        {/* Loading State */}
        {(loading || isTabSwitching) && !data ? (
          <JobManagementTableSkeleton />
        ) : !data || data.courierGroups.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="md">
              <IconPackage size={48} color="var(--mantine-color-gray-5)" />
              <Text size="lg" fw={500} c="dimmed">
                No orders found
              </Text>
              <Text size="sm" c="dimmed">
                {selectedDateFilter === 'today' && 'No orders found for today'}
                {selectedDateFilter === 'yesterday' && 'No orders found for yesterday'}
                {selectedDateFilter === '7days' && 'No orders found in the last 7 days'}
                {selectedDateFilter === '30days' && 'No orders found in the last 30 days'}
                {selectedDateFilter === 'all' &&
                  'No fulfilled orders with tracking information found'}
              </Text>
              <Text size="xs" c="dimmed" ta="center">
                Background scanner is active - simply scan any barcode to search for orders
              </Text>
              <Button
                onClick={handleRefresh}
                loading={refreshing}
                variant="light"
                size={getResponsiveButtonSize(isMobile)}
              >
                Refresh Data
              </Button>
            </Stack>
          </Center>
        ) : isMobile ? (
          /* Mobile List Layout */
          <div>
            {data.courierGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.courierName);
              const totalValue = group.orders.reduce(
                (sum, order) => sum + (order.totalAmount || 0),
                0,
              );

              return (
                <div key={group.courierName}>
                  {/* Mobile Courier Group Header */}
                  <Paper
                    radius={0}
                    p="md"
                    style={{
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--mantine-color-default-border)',
                      backgroundColor: isExpanded ? 'var(--mantine-color-gray-light)' : undefined,
                    }}
                    onClick={() => toggleGroup(group.courierName)}
                  >
                    <Group justify="space-between" align="center">
                      <div>
                        <Group gap="sm" mb="xs">
                          <CourierIcon courierName={group.courierName} size={16} />
                          <Text fw={500} size="sm">
                            {group.courierName}
                          </Text>
                          <Badge size="xs" variant="outline">
                            {group.orderCount}
                          </Badge>
                        </Group>
                        <Text size="xs" c="dimmed">
                          {formatCurrency(totalValue, group.orders[0]?.currency || 'INR')} •{' '}
                          {
                            group.orders.filter((o) => getEffectivePickupStatus(o) === 'pickup')
                              .length
                          }{' '}
                          picked up
                        </Text>
                      </div>
                      <ActionIcon variant="subtle" size="sm">
                        {isExpanded ? (
                          <IconChevronDown size={16} />
                        ) : (
                          <IconChevronRight size={16} />
                        )}
                      </ActionIcon>
                    </Group>
                  </Paper>

                  {/* Mobile Expanded Orders */}
                  {isExpanded &&
                    group.orders.map((order) => (
                      <Paper
                        key={`${order.id}-${forceRender}`}
                        radius={0}
                        p="md"
                        pl="xl"
                        style={{
                          borderBottom: '1px solid var(--mantine-color-default-border)',
                          borderLeft: getRowColor(order)
                            ? `6px solid ${getRowColor(order)}`
                            : '6px solid transparent',
                          transition: 'border-left 0.2s ease',
                        }}
                      >
                        <Stack gap="sm">
                          <Group justify="space-between" align="flex-start">
                            <div style={{ flex: 1 }}>
                              <Group gap="xs" mb="xs">
                                <Text fw={500} size="sm">
                                  {order.name}
                                </Text>
                                <Badge
                                  color={getStatusColor(order.fulfillmentStatus)}
                                  variant="light"
                                  size="xs"
                                >
                                  {order.fulfillmentStatus}
                                </Badge>
                              </Group>

                              <Text size="xs" c="dimmed" mb="xs">
                                {formatCurrency(order.totalAmount, order.currency)} •{' '}
                                {order.lineItems.length} item
                                {order.lineItems.length !== 1 ? 's' : ''}
                              </Text>

                              {order.customer && (
                                <Group gap="xs" mb="xs">
                                  <IconUser size={12} color="var(--mantine-color-gray-6)" />
                                  <Text size="xs" c="dimmed">
                                    {order.customer.fullName}
                                  </Text>
                                </Group>
                              )}

                              {order.shippingAddress && (
                                <Group gap="xs" mb="xs">
                                  <IconMapPin size={12} color="var(--mantine-color-gray-6)" />
                                  <Text size="xs" c="dimmed">
                                    {order.shippingAddress.city}, {order.shippingAddress.country}
                                  </Text>
                                </Group>
                              )}
                            </div>
                          </Group>

                          {/* Mobile Pickup Status */}
                          <Group justify="space-between" align="center">
                            {getPickupStatusBadge(order)}
                            <Group gap="xs">
                              <ActionIcon
                                variant={
                                  getEffectivePickupStatus(order) === 'pickup'
                                    ? 'filled'
                                    : 'outline'
                                }
                                color="green"
                                size="lg"
                                onClick={() => updatePickupStatusDirectly(order, 'pickup')}
                                loading={updatingOrders.has(order.id)}
                                style={{ opacity: updatingOrders.has(order.id) ? 0.7 : 1 }}
                              >
                                <IconCheck size={18} />
                              </ActionIcon>
                              <ActionIcon
                                variant={
                                  getEffectivePickupStatus(order) === 'not_pickup'
                                    ? 'filled'
                                    : 'outline'
                                }
                                color="orange"
                                size="lg"
                                onClick={() => updatePickupStatusDirectly(order, 'not_pickup')}
                                loading={updatingOrders.has(order.id)}
                                style={{ opacity: updatingOrders.has(order.id) ? 0.7 : 1 }}
                              >
                                <IconX size={18} />
                              </ActionIcon>
                              <ActionIcon
                                variant={
                                  getEffectivePickupStatus(order) === 'missing'
                                    ? 'filled'
                                    : 'outline'
                                }
                                color="red"
                                size="lg"
                                onClick={() => updatePickupStatusDirectly(order, 'missing')}
                                loading={updatingOrders.has(order.id)}
                                style={{ opacity: updatingOrders.has(order.id) ? 0.7 : 1 }}
                              >
                                <IconExclamationMark size={18} />
                              </ActionIcon>
                            </Group>
                          </Group>

                          {/* Mobile Tracking Numbers */}
                          {order.fulfillments
                            .filter((f) => f.trackingInfo)
                            .map((fulfillment) => (
                              <Group key={fulfillment.id} justify="space-between" align="center">
                                <Group gap="xs">
                                  <IconPackage size={12} color="var(--mantine-color-gray-6)" />
                                  <Text size="xs" ff="monospace" c="dimmed">
                                    {fulfillment.trackingInfo?.number}
                                  </Text>
                                </Group>
                                {fulfillment.trackingInfo?.url && (
                                  <ActionIcon
                                    variant="subtle"
                                    size="sm"
                                    component="a"
                                    href={fulfillment.trackingInfo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <IconExternalLink size={14} />
                                  </ActionIcon>
                                )}
                              </Group>
                            ))}
                        </Stack>
                      </Paper>
                    ))}
                </div>
              );
            })}
          </div>
        ) : (
          /* Desktop Table Layout */
          <ScrollArea>
            <Table stickyHeader>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ minWidth: '200px' }}>Courier Company</Table.Th>
                  <Table.Th style={{ minWidth: '100px' }}>Orders</Table.Th>
                  <Table.Th style={{ minWidth: '150px' }}>Total Value</Table.Th>
                  <Table.Th style={{ minWidth: '120px' }}>Latest Order</Table.Th>
                  <Table.Th style={{ minWidth: '120px' }}>Pickup Status</Table.Th>
                  <Table.Th style={{ minWidth: '80px' }}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.courierGroups.map((group) => {
                  const isExpanded = expandedGroups.has(group.courierName);
                  const totalValue = group.orders.reduce(
                    (sum, order) => sum + (order.totalAmount || 0),
                    0,
                  );
                  const latestOrder = group.orders?.[0]; // Orders are already sorted by date

                  return (
                    <React.Fragment key={group.courierName}>
                      {/* Group Header Row */}
                      <Table.Tr
                        style={{
                          cursor: 'pointer',
                          transition: 'background-color 0.2s ease',
                        }}
                        onClick={() => toggleGroup(group.courierName)}
                        data-expanded={isExpanded}
                        className={isExpanded ? 'expanded-group-row' : ''}
                      >
                        <Table.Td>
                          <Group gap="sm">
                            <CourierIcon courierName={group.courierName} size={20} />
                            <Text fw={500}>{group.courierName}</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Badge color="blue" variant="light">
                            {group.orderCount}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={500}>
                            {formatCurrency(totalValue, group.orders[0]?.currency || 'INR')}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {latestOrder &&
                              format(new Date(latestOrder.createdAt), 'MMM dd, yyyy HH:mm')}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <Text size="sm" c="dimmed">
                              {
                                group.orders.filter((o) => getEffectivePickupStatus(o) === 'pickup')
                                  .length
                              }{' '}
                              picked up
                            </Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <ActionIcon variant="subtle" size="sm">
                            {isExpanded ? (
                              <IconChevronDown size={16} />
                            ) : (
                              <IconChevronRight size={16} />
                            )}
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>

                      {/* Expanded Orders */}
                      {isExpanded &&
                        group.orders.map((order) => (
                          <Table.Tr
                            key={`${order.id}-${forceRender}`}
                            className="expanded-order-row"
                            style={{
                              borderLeft: getRowColor(order)
                                ? `6px solid ${getRowColor(order)}`
                                : '6px solid transparent',
                              transition: 'border-left 0.2s ease',
                            }}
                          >
                            <Table.Td style={{ paddingLeft: '3rem' }}>
                              <Stack gap="xs">
                                <Group gap="sm">
                                  <Text fw={500} size="sm">
                                    {order.name}
                                  </Text>
                                  <Badge
                                    color={getStatusColor(order.fulfillmentStatus)}
                                    variant="light"
                                    size="xs"
                                  >
                                    {order.fulfillmentStatus}
                                  </Badge>
                                </Group>
                                {order.customer && (
                                  <Group gap="xs">
                                    <IconUser size={14} color="gray" />
                                    <Text size="xs" c="dimmed">
                                      {order.customer.fullName} ({order.customer.email})
                                    </Text>
                                  </Group>
                                )}
                                {order.shippingAddress && (
                                  <Group gap="xs">
                                    <IconMapPin size={14} color="gray" />
                                    <Text size="xs" c="dimmed">
                                      {order.shippingAddress.city}, {order.shippingAddress.country}
                                    </Text>
                                  </Group>
                                )}
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" c="dimmed">
                                {order.lineItems.length} item
                                {order.lineItems.length !== 1 ? 's' : ''}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text fw={500} size="sm">
                                {formatCurrency(order.totalAmount, order.currency)}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs">
                                <IconCalendar size={14} color="gray" />
                                <Text size="sm">
                                  {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                                </Text>
                              </Group>
                            </Table.Td>
                            <Table.Td>
                              <Stack gap="xs">
                                {getPickupStatusBadge(order)}
                                <Group gap="xs" wrap="nowrap">
                                  <Tooltip label="Mark as Picked Up">
                                    <ActionIcon
                                      variant={
                                        getEffectivePickupStatus(order) === 'pickup'
                                          ? 'filled'
                                          : 'outline'
                                      }
                                      color="green"
                                      size="lg"
                                      onClick={() => updatePickupStatusDirectly(order, 'pickup')}
                                      loading={updatingOrders.has(order.id)}
                                      style={{ opacity: updatingOrders.has(order.id) ? 0.7 : 1 }}
                                    >
                                      <IconCheck size={18} />
                                    </ActionIcon>
                                  </Tooltip>
                                  <Tooltip label="Mark as Not Picked Up">
                                    <ActionIcon
                                      variant={
                                        getEffectivePickupStatus(order) === 'not_pickup'
                                          ? 'filled'
                                          : 'outline'
                                      }
                                      color="orange"
                                      size="lg"
                                      onClick={() =>
                                        updatePickupStatusDirectly(order, 'not_pickup')
                                      }
                                      loading={updatingOrders.has(order.id)}
                                      style={{ opacity: updatingOrders.has(order.id) ? 0.7 : 1 }}
                                    >
                                      <IconX size={18} />
                                    </ActionIcon>
                                  </Tooltip>
                                  <Tooltip label="Mark as Missing">
                                    <ActionIcon
                                      variant={
                                        getEffectivePickupStatus(order) === 'missing'
                                          ? 'filled'
                                          : 'outline'
                                      }
                                      color="red"
                                      size="lg"
                                      onClick={() => updatePickupStatusDirectly(order, 'missing')}
                                      loading={updatingOrders.has(order.id)}
                                      style={{ opacity: updatingOrders.has(order.id) ? 0.7 : 1 }}
                                    >
                                      <IconExclamationMark size={18} />
                                    </ActionIcon>
                                  </Tooltip>
                                  {order.pickupStatus?.notes && (
                                    <Tooltip label="View/Edit Notes">
                                      <ActionIcon
                                        variant="outline"
                                        color="blue"
                                        size="lg"
                                        onClick={() => openPickupModal(order)}
                                      >
                                        <IconNotes size={18} />
                                      </ActionIcon>
                                    </Tooltip>
                                  )}
                                </Group>
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <Stack gap="xs">
                                {order.fulfillments
                                  .filter((f) => f.trackingInfo)
                                  .map((fulfillment) => (
                                    <Group key={fulfillment.id} gap="xs">
                                      <Text size="xs" ff="monospace">
                                        {fulfillment.trackingInfo?.number}
                                      </Text>
                                      {fulfillment.trackingInfo?.url && (
                                        <ActionIcon
                                          variant="subtle"
                                          size="xs"
                                          component="a"
                                          href={fulfillment.trackingInfo.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <IconExternalLink size={12} />
                                        </ActionIcon>
                                      )}
                                    </Group>
                                  ))}
                              </Stack>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                    </React.Fragment>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Paper>

      {/* Missing Items Notes Modal */}
      <Modal
        opened={pickupModalOpen}
        onClose={closePickupModal}
        title={`${pickupStatus === 'missing' ? 'Mark as Missing' : 'Notes'} - ${selectedOrder?.name}`}
        size="md"
      >
        <Stack gap="md">
          {pickupStatus === 'missing' ? (
            <Textarea
              label="Notes (Required for missing items)"
              placeholder="Please describe what items are missing or any additional details..."
              value={pickupNotes}
              onChange={(event) => setPickupNotes(event.currentTarget.value)}
              minRows={3}
              required
              autoFocus
            />
          ) : (
            <>
              <Select
                label="Pickup Status"
                value={pickupStatus}
                onChange={(value) => {
                  if (value && ['pickup', 'not_pickup', 'missing'].includes(value)) {
                    setPickupStatus(value as 'pickup' | 'not_pickup' | 'missing');
                  }
                }}
                data={[
                  { value: 'pickup', label: 'Picked Up' },
                  { value: 'not_pickup', label: 'Not Picked Up' },
                  { value: 'missing', label: 'Missing' },
                ]}
                required
              />
              <Textarea
                label="Notes"
                placeholder="Add any additional notes about this order..."
                value={pickupNotes}
                onChange={(event) => setPickupNotes(event.currentTarget.value)}
                minRows={3}
              />
            </>
          )}

          <Group justify="flex-end" gap="sm">
            <Button variant="outline" onClick={closePickupModal} disabled={updatingPickup}>
              Cancel
            </Button>
            <Button
              onClick={updatePickupStatus}
              loading={updatingPickup}
              disabled={pickupStatus === 'missing' && !pickupNotes.trim()}
              color={pickupStatus === 'missing' ? 'red' : 'blue'}
            >
              {pickupStatus === 'missing' ? 'Mark as Missing' : 'Update Status'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};

export default JobManagement;
