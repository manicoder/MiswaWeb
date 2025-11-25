import React from 'react';
import {
  Group,
  Title,
  Text,
  Badge,
  Button,
  ActionIcon,
  Stack,
  Box,
  Menu,
  Loader,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconBarcode,
  IconRefresh,
  IconClipboardCheck,
  IconTruckDelivery,
  IconPackageImport,
  IconDownload,
  IconChevronDown,
  IconFileTypeCsv,
  IconFileTypePdf,
} from '@tabler/icons-react';
import type { NavigateFunction } from 'react-router-dom';
import type { Shipment, ShipmentStatus } from '../../types';

interface ShipmentHeaderProps {
  shipment: Shipment;
  refreshLoading: boolean;
  exportBarcodesLoading: boolean;
  exportListLoading: boolean;
  exportCsvLoading: boolean;
  saving: boolean;
  loadShipment: () => Promise<void>;
  exportBarcodes: () => Promise<void>;
  exportProductList: () => Promise<void>;
  exportCsv: () => Promise<void>;
  updateShipmentStatus: (status: ShipmentStatus) => Promise<void>;
  navigate: NavigateFunction;
  getStatusColor: (status: ShipmentStatus) => string;
}

const ShipmentHeader: React.FC<ShipmentHeaderProps> = ({
  shipment,
  refreshLoading,
  exportBarcodesLoading,
  exportListLoading,
  exportCsvLoading,
  saving,
  loadShipment,
  exportBarcodes,
  exportProductList,
  exportCsv,
  updateShipmentStatus,
  navigate,
  getStatusColor,
}) => {
  const shipmentStatus = shipment.status as ShipmentStatus;

  return (
    <>
      {/* Desktop Header */}
      <Box hiddenFrom="sm">
        <Stack gap="md" mb="lg">
          {/* Top row with back button, title, and action buttons */}
          <Group justify="space-between" align="flex-start">
            <Group>
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={() => navigate('/logistics/warehouse-fulfillment')}
              >
                <IconArrowLeft size={18} />
              </ActionIcon>
              <div>
                <Title order={2}>{shipment.shipmentNumber}</Title>
                <Group gap="sm">
                  <Text c="dimmed">Shipment Details</Text>
                  <Badge color={getStatusColor(shipment.status)}>
                    {shipment.status === 'created'
                      ? 'READY'
                      : shipment.status.toUpperCase().replace('_', ' ')}
                  </Badge>
                </Group>
              </div>
            </Group>

            <Group>
              <Button
                leftSection={<IconRefresh size={16} />}
                variant="light"
                onClick={loadShipment}
                loading={refreshLoading}
                size="sm"
              >
                Refresh
              </Button>

              <Menu shadow="md" width={180} position="bottom-end">
                <Menu.Target>
                  <Tooltip
                    label={
                      !shipment.items || shipment.items.length === 0
                        ? 'No data to export'
                        : 'Export data in different formats'
                    }
                    disabled={shipment.items && shipment.items.length > 0}
                  >
                    <Button
                      variant="light"
                      size="sm"
                      disabled={
                        !shipment.items ||
                        shipment.items.length === 0 ||
                        exportCsvLoading ||
                        exportListLoading ||
                        exportBarcodesLoading
                      }
                      leftSection={
                        exportCsvLoading || exportListLoading || exportBarcodesLoading ? (
                          <Loader size={16} />
                        ) : (
                          <IconDownload size={16} />
                        )
                      }
                      rightSection={<IconChevronDown size={14} />}
                    >
                      {exportCsvLoading || exportListLoading || exportBarcodesLoading
                        ? 'Exporting...'
                        : 'Export'}
                    </Button>
                  </Tooltip>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Label>Export Format</Menu.Label>

                  <Menu.Item
                    leftSection={<IconFileTypeCsv size={16} color="var(--mantine-color-green-6)" />}
                    onClick={exportCsv}
                    disabled={exportCsvLoading || exportListLoading || exportBarcodesLoading}
                  >
                    <Group justify="space-between" w="100%">
                      <Text size="sm">CSV</Text>
                      <Text size="xs" c="dimmed">
                        .csv
                      </Text>
                    </Group>
                  </Menu.Item>

                  <Menu.Item
                    leftSection={<IconFileTypePdf size={16} color="var(--mantine-color-red-6)" />}
                    onClick={exportProductList}
                    disabled={exportCsvLoading || exportListLoading || exportBarcodesLoading}
                  >
                    <Group justify="space-between" w="100%">
                      <Text size="sm">PDF</Text>
                      <Text size="xs" c="dimmed">
                        .pdf
                      </Text>
                    </Group>
                  </Menu.Item>

                  <Menu.Item
                    leftSection={<IconBarcode size={16} color="var(--mantine-color-blue-6)" />}
                    onClick={exportBarcodes}
                    disabled={exportCsvLoading || exportListLoading || exportBarcodesLoading}
                  >
                    <Group justify="space-between" w="100%">
                      <Text size="sm">Barcodes</Text>
                      <Text size="xs" c="dimmed">
                        .pdf
                      </Text>
                    </Group>
                  </Menu.Item>

                  <Menu.Divider />
                  <Menu.Label>
                    <Text size="xs" c="dimmed">
                      {shipment.items?.length || 0} records available
                    </Text>
                  </Menu.Label>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>

          {/* Status action buttons */}
          {shipment.items && shipment.items.length > 0 && (
            <Group justify="flex-end">
              {shipmentStatus === 'draft' && (
                <Button
                  leftSection={<IconClipboardCheck size={16} />}
                  color="violet"
                  onClick={() => updateShipmentStatus('created')}
                  loading={saving}
                >
                  Mark as Created
                </Button>
              )}

              {shipmentStatus === 'created' && (
                <Button
                  leftSection={<IconTruckDelivery size={16} />}
                  color="orange"
                  onClick={() => updateShipmentStatus('dispatched')}
                  loading={saving}
                >
                  Dispatch Shipment
                </Button>
              )}

              {shipmentStatus === 'dispatched' && (
                <Button
                  leftSection={<IconPackageImport size={16} />}
                  color="green"
                  onClick={() => updateShipmentStatus('received')}
                  loading={saving}
                >
                  Mark as Received
                </Button>
              )}
            </Group>
          )}
        </Stack>
      </Box>

      {/* Mobile Header */}
      <Box visibleFrom="sm">
        <Stack gap="sm" mb="md">
          {/* Top row with back button, title, and action buttons */}
          <Group justify="space-between" align="flex-start">
            <Group>
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={() => navigate('/logistics/warehouse-fulfillment')}
                mr="xs"
              >
                <IconArrowLeft size={18} />
              </ActionIcon>
              <div>
                <Title order={3} size="h4">
                  {shipment.shipmentNumber}
                </Title>
                <Group gap="xs">
                  <Text c="dimmed" size="sm">
                    Shipment
                  </Text>
                  <Badge color={getStatusColor(shipment.status)} size="sm">
                    {shipment.status === 'created'
                      ? 'READY'
                      : shipment.status.toUpperCase().replace('_', ' ')}
                  </Badge>
                </Group>
              </div>
            </Group>

            <Group gap="xs">
              <Button
                leftSection={<IconRefresh size={16} />}
                variant="light"
                onClick={loadShipment}
                loading={refreshLoading}
                size="xs"
              >
                Refresh
              </Button>

              <Menu shadow="md" width={180} position="bottom-end">
                <Menu.Target>
                  <Tooltip
                    label={
                      !shipment.items || shipment.items.length === 0
                        ? 'No data to export'
                        : 'Export data in different formats'
                    }
                    disabled={shipment.items && shipment.items.length > 0}
                  >
                    <Button
                      variant="light"
                      size="xs"
                      disabled={
                        !shipment.items ||
                        shipment.items.length === 0 ||
                        exportCsvLoading ||
                        exportListLoading ||
                        exportBarcodesLoading
                      }
                      leftSection={
                        exportCsvLoading || exportListLoading || exportBarcodesLoading ? (
                          <Loader size={16} />
                        ) : (
                          <IconDownload size={16} />
                        )
                      }
                      rightSection={<IconChevronDown size={14} />}
                    >
                      {exportCsvLoading || exportListLoading || exportBarcodesLoading
                        ? 'Exporting...'
                        : 'Export'}
                    </Button>
                  </Tooltip>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Label>Export Format</Menu.Label>

                  <Menu.Item
                    leftSection={<IconFileTypeCsv size={16} color="var(--mantine-color-green-6)" />}
                    onClick={exportCsv}
                    disabled={exportCsvLoading || exportListLoading || exportBarcodesLoading}
                  >
                    <Group justify="space-between" w="100%">
                      <Text size="sm">CSV</Text>
                      <Text size="xs" c="dimmed">
                        .csv
                      </Text>
                    </Group>
                  </Menu.Item>

                  <Menu.Item
                    leftSection={<IconFileTypePdf size={16} color="var(--mantine-color-red-6)" />}
                    onClick={exportProductList}
                    disabled={exportCsvLoading || exportListLoading || exportBarcodesLoading}
                  >
                    <Group justify="space-between" w="100%">
                      <Text size="sm">PDF</Text>
                      <Text size="xs" c="dimmed">
                        .pdf
                      </Text>
                    </Group>
                  </Menu.Item>

                  <Menu.Item
                    leftSection={<IconBarcode size={16} color="var(--mantine-color-blue-6)" />}
                    onClick={exportBarcodes}
                    disabled={exportCsvLoading || exportListLoading || exportBarcodesLoading}
                  >
                    <Group justify="space-between" w="100%">
                      <Text size="sm">Barcodes</Text>
                      <Text size="xs" c="dimmed">
                        .pdf
                      </Text>
                    </Group>
                  </Menu.Item>

                  <Menu.Divider />
                  <Menu.Label>
                    <Text size="xs" c="dimmed">
                      {shipment.items?.length || 0} records available
                    </Text>
                  </Menu.Label>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>

          {/* Status action buttons */}
          {shipment.items && shipment.items.length > 0 && (
            <>
              {shipmentStatus === 'draft' && (
                <Button
                  leftSection={<IconClipboardCheck size={16} />}
                  color="violet"
                  onClick={() => updateShipmentStatus('created')}
                  loading={saving}
                  fullWidth
                >
                  Mark as Ready
                </Button>
              )}

              {shipmentStatus === 'created' && (
                <Button
                  leftSection={<IconTruckDelivery size={16} />}
                  color="orange"
                  onClick={() => updateShipmentStatus('dispatched')}
                  loading={saving}
                  fullWidth
                >
                  Dispatch Shipment
                </Button>
              )}

              {shipmentStatus === 'dispatched' && (
                <Button
                  leftSection={<IconPackageImport size={16} />}
                  color="green"
                  onClick={() => updateShipmentStatus('received')}
                  loading={saving}
                  fullWidth
                >
                  Mark as Received
                </Button>
              )}
            </>
          )}
        </Stack>
      </Box>
    </>
  );
};

export default ShipmentHeader;
