import React, { useState } from 'react';
import { Button, Menu, Group, Text, Loader, Tooltip } from '@mantine/core';
import {
  IconDownload,
  IconFileTypeCsv,
  IconFileTypeXls,
  IconFileTypePdf,
  IconChevronDown,
} from '@tabler/icons-react';
import { ExportUtils, type ExportOptions } from '../../utils/exportUtils';

interface ExportButtonProps {
  data: unknown[];
  exportConfig: Omit<ExportOptions, 'data'>;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'filled' | 'light' | 'outline' | 'subtle';
}

const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  exportConfig,
  disabled = false,
  size = 'sm',
  variant = 'outline',
}) => {
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    if (data.length === 0) return;

    setIsExporting(format);

    try {
      const options = {
        ...exportConfig,
        data,
        filename: `${exportConfig.filename}_${new Date().toISOString().split('T')[0]}`,
      };

      switch (format) {
        case 'csv':
          ExportUtils.exportToCSV(options);
          break;
        case 'excel':
          ExportUtils.exportToExcel(options);
          break;
        case 'pdf':
          await ExportUtils.exportToPDF(options);
          break;
      }
    } catch {
      // Export failed silently
    } finally {
      setIsExporting(null);
    }
  };

  const hasData = data.length > 0;

  return (
    <Menu shadow="md" width={180} position="bottom-end">
      <Menu.Target>
        <Tooltip
          label={!hasData ? 'No data to export' : 'Export data in different formats'}
          disabled={hasData}
        >
          <Button
            variant={variant}
            size={size}
            disabled={disabled || !hasData || isExporting !== null}
            leftSection={isExporting ? <Loader size={16} /> : <IconDownload size={16} />}
            rightSection={<IconChevronDown size={14} />}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Export Format</Menu.Label>

        <Menu.Item
          leftSection={<IconFileTypeCsv size={16} color="var(--mantine-color-green-6)" />}
          onClick={() => handleExport('csv')}
          disabled={isExporting !== null}
        >
          <Group justify="space-between" w="100%">
            <Text size="sm">CSV</Text>
            <Text size="xs" c="dimmed">
              .csv
            </Text>
          </Group>
        </Menu.Item>

        <Menu.Item
          leftSection={<IconFileTypeXls size={16} color="var(--mantine-color-blue-6)" />}
          onClick={() => handleExport('excel')}
          disabled={isExporting !== null}
        >
          <Group justify="space-between" w="100%">
            <Text size="sm">Excel</Text>
            <Text size="xs" c="dimmed">
              .xlsx
            </Text>
          </Group>
        </Menu.Item>

        <Menu.Item
          leftSection={<IconFileTypePdf size={16} color="var(--mantine-color-red-6)" />}
          onClick={() => handleExport('pdf')}
          disabled={isExporting !== null}
        >
          <Group justify="space-between" w="100%">
            <Text size="sm">PDF</Text>
            <Text size="xs" c="dimmed">
              .pdf
            </Text>
          </Group>
        </Menu.Item>

        <Menu.Divider />
        <Menu.Label>
          <Text size="xs" c="dimmed">
            {data.length} records available
          </Text>
        </Menu.Label>
      </Menu.Dropdown>
    </Menu>
  );
};

export default ExportButton;
