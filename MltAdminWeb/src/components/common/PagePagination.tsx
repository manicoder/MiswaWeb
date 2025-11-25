import React from 'react';
import { Group, Button, Text, Pagination, SegmentedControl } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

export interface PagePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  isLoading?: boolean;
  showPageSizeSelector?: boolean;
  pageSizeOptions?: Array<{ value: number; label: string }>;
  compact?: boolean;
}

const PagePagination: React.FC<PagePaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  showPageSizeSelector = true,
  pageSizeOptions = [
    { value: 50, label: '50' },
    { value: 100, label: '100' },
    { value: 200, label: '200' },
    { value: 9999, label: 'All' },
  ],
  compact = false,
}) => {
  const startItem = pageSize >= 9999 ? 1 : (currentPage - 1) * pageSize + 1;
  const endItem = pageSize >= 9999 ? total : Math.min(currentPage * pageSize, total);

  // Don't show pagination controls when showing all items
  const showPaginationControls = totalPages > 1 && pageSize < 9999;

  if (totalPages <= 1 && !showPageSizeSelector) {
    return null;
  }

  return (
    <Group justify="space-between" align="center" wrap="wrap" gap="md">
      {/* Results info */}
      <Text size="sm" c="dimmed">
        Showing {startItem}-{endItem} of {total} items
        {pageSize >= 9999 && total > 0 && (
          <Text component="span" size="sm" c="blue" fw={500}>
            {' '}
            (All)
          </Text>
        )}
      </Text>

      <Group gap="md" align="center">
        {/* Page size selector */}
        {showPageSizeSelector && onPageSizeChange && (
          <Group gap="xs" align="center">
            <Text size="sm" c="dimmed">
              Show:
            </Text>
            <SegmentedControl
              value={pageSize >= 9999 ? '9999' : pageSize.toString()}
              onChange={(value) => onPageSizeChange(parseInt(value))}
              data={pageSizeOptions.map((opt) => ({
                value: opt.value.toString(),
                label: opt.label,
              }))}
              size="xs"
              disabled={isLoading}
              style={{
                backgroundColor: 'var(--mantine-color-gray-0)',
                border: '1px solid var(--mantine-color-gray-3)',
              }}
            />
          </Group>
        )}

        {/* Pagination controls - only show when not showing all */}
        {showPaginationControls && (
          <Group gap="xs">
            {compact ? (
              <>
                {/* Compact pagination for mobile */}
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage <= 1 || isLoading}
                  leftSection={<IconChevronLeft size={16} />}
                >
                  Previous
                </Button>

                <Text size="sm" c="dimmed" px="md">
                  Page {currentPage} of {totalPages}
                </Text>

                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages || isLoading}
                  rightSection={<IconChevronRight size={16} />}
                >
                  Next
                </Button>
              </>
            ) : (
              <>
                {/* Full pagination with page numbers */}
                <Pagination
                  value={currentPage}
                  onChange={onPageChange}
                  total={totalPages}
                  disabled={isLoading}
                  size="sm"
                  withEdges
                  boundaries={1}
                  siblings={2}
                />
              </>
            )}
          </Group>
        )}
      </Group>
    </Group>
  );
};

export default PagePagination;
