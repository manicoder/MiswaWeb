import React from 'react';
import { Button, Group, Text, Loader, Center } from '@mantine/core';
import { IconChevronDown, IconRefresh } from '@tabler/icons-react';

export interface LoadMoreButtonProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  disabled?: boolean;
  totalLoaded?: number;
  variant?: 'filled' | 'outline' | 'light' | 'subtle';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const LoadMoreButton: React.FC<LoadMoreButtonProps> = ({
  onLoadMore,
  hasMore,
  isLoading,
  disabled = false,
  totalLoaded,
  variant = 'outline',
  size = 'md',
  fullWidth = true,
  className,
  children,
}) => {
  const isDisabled = disabled || isLoading || !hasMore;

  const getButtonText = () => {
    if (isLoading) return 'Loading...';
    if (!hasMore) return 'No more items';
    if (children) return children;
    return 'Load More';
  };

  const getIcon = () => {
    if (isLoading) return <Loader size={16} />;
    if (!hasMore) return <IconRefresh size={16} />;
    return <IconChevronDown size={16} />;
  };

  if (!hasMore && totalLoaded === 0) {
    return null; // Don't show button if no data at all
  }

  return (
    <Center p="md">
      <Group gap="xs" wrap="nowrap">
        <Button
          variant={variant}
          size={size}
          fullWidth={fullWidth}
          disabled={isDisabled}
          loading={isLoading}
          onClick={onLoadMore}
          leftSection={!isLoading ? getIcon() : undefined}
          className={className}
          style={{
            transition: 'all 0.2s ease',
            opacity: isDisabled ? 0.6 : 1,
          }}
        >
          {getButtonText()}
        </Button>

        {totalLoaded && totalLoaded > 0 && (
          <Text size="sm" c="dimmed">
            {totalLoaded} items loaded
          </Text>
        )}
      </Group>
    </Center>
  );
};

export default LoadMoreButton;
