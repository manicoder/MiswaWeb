import React from 'react';
import { Badge, Progress, Group, Text, ActionIcon, Tooltip } from '@mantine/core';
import { IconX, IconCurrencyRupee } from '@tabler/icons-react';
import { useCostFetching } from '../../contexts/CostFetchingContext';

const GlobalCostFetchingProgress: React.FC = () => {
  const { activeProgress, cancelCostFetching, isRunning } = useCostFetching();

  if (!isRunning || !activeProgress) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Running':
        return 'blue';
      case 'Completed':
        return 'green';
      case 'Failed':
        return 'red';
      case 'Cancelled':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  return (
    <Group gap="xs" style={{ minWidth: 300 }}>
      <IconCurrencyRupee size={16} />
      <Text size="xs" fw={500}>
        Cost Fetching
      </Text>
      <Progress
        value={activeProgress.percentage}
        size="sm"
        style={{ flex: 1, minWidth: 100 }}
        color={getStatusColor(activeProgress.status)}
      />
      <Text size="xs" c="dimmed">
        {activeProgress.current}/{activeProgress.total}
      </Text>
      <Tooltip label="Cancel cost fetching">
        <ActionIcon size="xs" variant="subtle" color="red" onClick={cancelCostFetching}>
          <IconX size={12} />
        </ActionIcon>
      </Tooltip>
      <Badge size="xs" color={getStatusColor(activeProgress.status)}>
        {activeProgress.updated} updated
      </Badge>
    </Group>
  );
};

export default GlobalCostFetchingProgress;
