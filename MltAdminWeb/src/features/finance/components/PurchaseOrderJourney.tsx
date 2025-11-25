import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Text,
  Button,
  Group,
  Stack,
  Title,
  Badge,
  Timeline,
  Modal,
  Textarea,
  Select,
  Alert,
  LoadingOverlay,
} from '@mantine/core';
import {
  IconClock,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconPackage,
  IconTruck,
  IconReceipt,
  IconCreditCard,
  IconEyePause,
  IconFlag,
  IconHistory,
  IconArrowRight,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { purchaseOrderService } from '../../../services/financeService';

interface PurchaseOrderJourneyProps {
  purchaseOrderId: string;
  onStatusUpdate?: () => void;
}

interface JourneyEntry {
  id: string;
  fromStatus: string;
  toStatus: string;
  notes?: string;
  actionBy?: string;
  createdAt: string;
}

interface StatusTransition {
  currentStatus: string;
  availableTransitions: string[];
  canTransition: boolean;
  transitionMessage?: string;
}

interface WorkflowData {
  id: string;
  poNumber: string;
  status: string;
  journey: JourneyEntry[];
  availableTransitions: StatusTransition;
  createdAt: string;
  updatedAt: string;
}

const PurchaseOrderJourney: React.FC<PurchaseOrderJourneyProps> = ({
  purchaseOrderId,
  onStatusUpdate,
}) => {
  const [workflowData, setWorkflowData] = useState<WorkflowData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedNewStatus, setSelectedNewStatus] = useState<string>('');
  const [statusNotes, setStatusNotes] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  const statusConfig = {
    draft: { color: 'gray', icon: IconClock, label: 'Draft' },
    pending: { color: 'yellow', icon: IconClock, label: 'Pending Approval' },
    approved: { color: 'blue', icon: IconCheck, label: 'Approved' },
    sent: { color: 'cyan', icon: IconPackage, label: 'Sent to Supplier' },
    confirmed: { color: 'indigo', icon: IconCheck, label: 'Confirmed' },
    intransit: { color: 'orange', icon: IconTruck, label: 'In Transit' },
    partiallyreceived: { color: 'lime', icon: IconPackage, label: 'Partially Received' },
    received: { color: 'green', icon: IconReceipt, label: 'Received' },
    partiallypaid: { color: 'teal', icon: IconCreditCard, label: 'Partially Paid' },
    paid: { color: 'green', icon: IconCreditCard, label: 'Paid' },
    cancelled: { color: 'red', icon: IconX, label: 'Cancelled' },
    onhold: { color: 'yellow', icon: IconEyePause, label: 'On Hold' },
    disputed: { color: 'red', icon: IconFlag, label: 'Disputed' },
  };

  const loadWorkflowData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await purchaseOrderService.getPurchaseOrderWorkflow(purchaseOrderId);
      setWorkflowData(data);
    } catch (err) {
      setError('Failed to load workflow data');
      console.error('Error loading workflow data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [purchaseOrderId]);

  useEffect(() => {
    loadWorkflowData();
  }, [loadWorkflowData]);

  const getStatusConfig = (status: string | undefined | null) => {
    if (!status) {
      return {
        color: 'gray',
        icon: IconClock,
        label: 'Unknown',
      };
    }

    return (
      statusConfig[status.toLowerCase() as keyof typeof statusConfig] || {
        color: 'gray',
        icon: IconClock,
        label: status,
      }
    );
  };

  const handleStatusUpdate = async () => {
    if (!selectedNewStatus) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select a new status',
        color: 'red',
      });
      return;
    }

    setIsUpdating(true);
    try {
      await purchaseOrderService.updatePurchaseOrderStatus(purchaseOrderId, {
        newStatus: selectedNewStatus,
        notes: statusNotes,
        actionBy: 'System', // Will be updated to get from auth context in future
      });

      notifications.show({
        title: 'Success',
        message: 'Purchase order status updated successfully',
        color: 'green',
      });
      setShowStatusModal(false);
      setSelectedNewStatus('');
      setStatusNotes('');
      loadWorkflowData();
      onStatusUpdate?.();
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update purchase order status',
        color: 'red',
      });
      console.error('Error updating status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    const config = getStatusConfig(status);
    const IconComponent = config.icon;
    return <IconComponent size={16} />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <Card withBorder p="md">
        <LoadingOverlay visible={true} />
        <Text>Loading purchase order journey...</Text>
      </Card>
    );
  }

  if (error) {
    return (
      <Card withBorder p="md">
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          {error}
        </Alert>
      </Card>
    );
  }

  if (!workflowData) {
    return (
      <Card withBorder p="md">
        <Text>No workflow data available</Text>
      </Card>
    );
  }

  const currentStatusConfig = getStatusConfig(workflowData.status);

  return (
    <Stack gap="md">
      {/* Current Status Card */}
      <Card withBorder p="md">
        <Group justify="space-between" align="center">
          <Group>
            {getStatusIcon(workflowData.status)}
            <div>
              <Text size="sm" c="dimmed">
                Current Status
              </Text>
              <Title order={4}>{currentStatusConfig.label}</Title>
            </div>
          </Group>
          <Badge color={currentStatusConfig.color} size="lg">
            {workflowData.status.toUpperCase()}
          </Badge>
        </Group>

        {workflowData.availableTransitions.canTransition && (
          <Button
            leftSection={<IconArrowRight size={16} />}
            onClick={() => setShowStatusModal(true)}
            mt="md"
            variant="outline"
          >
            Update Status
          </Button>
        )}
      </Card>

      {/* Available Transitions */}
      {workflowData.availableTransitions.availableTransitions.length > 0 && (
        <Card withBorder p="md">
          <Title order={5} mb="md">
            Available Status Transitions
          </Title>
          <Group gap="xs">
            {workflowData.availableTransitions.availableTransitions.map((status) => {
              const config = getStatusConfig(status);
              return (
                <Badge
                  key={status}
                  color={config.color}
                  variant="light"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedNewStatus(status);
                    setShowStatusModal(true);
                  }}
                >
                  {config.label}
                </Badge>
              );
            })}
          </Group>
        </Card>
      )}

      {/* Journey Timeline */}
      <Card withBorder p="md">
        <Title order={5} mb="md">
          <IconHistory size={20} style={{ marginRight: 8 }} />
          Journey Timeline
        </Title>

        <Timeline active={workflowData.journey.length - 1} bulletSize={24} lineWidth={2}>
          {workflowData.journey.map((entry) => {
            const fromConfig = getStatusConfig(entry.fromStatus);
            const toConfig = getStatusConfig(entry.toStatus);

            return (
              <Timeline.Item
                key={entry.id}
                bullet={getStatusIcon(entry.toStatus)}
                title={
                  <Group gap="xs">
                    <Text fw={500}>{fromConfig.label}</Text>
                    <IconArrowRight size={14} />
                    <Text fw={500}>{toConfig.label}</Text>
                  </Group>
                }
              >
                <Text size="sm" c="dimmed" mb={4}>
                  {formatDate(entry.createdAt)}
                </Text>
                {entry.actionBy && (
                  <Text size="sm" c="dimmed" mb={4}>
                    Action by: {entry.actionBy}
                  </Text>
                )}
                {entry.notes && (
                  <Text size="sm" mt={4}>
                    {entry.notes}
                  </Text>
                )}
              </Timeline.Item>
            );
          })}
        </Timeline>
      </Card>

      {/* Status Update Modal */}
      <Modal
        opened={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Update Purchase Order Status"
        size="md"
      >
        <Stack gap="md">
          <Alert icon={<IconAlertCircle size={16} />} color="blue">
            Current status: <strong>{currentStatusConfig.label}</strong>
          </Alert>

          <Select
            label="New Status"
            placeholder="Select new status"
            data={workflowData.availableTransitions.availableTransitions.map((status) => ({
              value: status,
              label: getStatusConfig(status).label,
            }))}
            value={selectedNewStatus}
            onChange={(value) => setSelectedNewStatus(value || '')}
            required
          />

          <Textarea
            label="Notes (Optional)"
            placeholder="Add notes about this status change..."
            value={statusNotes}
            onChange={(event) => setStatusNotes(event.currentTarget.value)}
            rows={3}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => setShowStatusModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate} loading={isUpdating} disabled={!selectedNewStatus}>
              Update Status
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default PurchaseOrderJourney;
