import React, { useState } from 'react';
import { Stack, Textarea, Button, Group, Alert, LoadingOverlay, Title } from '@mantine/core';
import { IconInfoCircle, IconCheck } from '@tabler/icons-react';
import {
  warehouseShipmentService,
  type CreateShipmentRequest,
} from '../../../services/warehouseShipmentService';
import { notifications } from '@mantine/notifications';

interface CreateShipmentProps {
  onSuccess: (shipmentId: number) => void;
  onCancel: () => void;
}

const CreateShipment: React.FC<CreateShipmentProps> = ({ onSuccess, onCancel }) => {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const request: CreateShipmentRequest = {
        notes: notes.trim() || undefined,
      };

      const response = await warehouseShipmentService.createShipment(request);

      if (response.success) {
        notifications.show({
          title: 'Success',
          message: `Shipment ${response.data.shipmentNumber} created successfully`,
          color: 'green',
          icon: <IconCheck size={16} />,
        });
        onSuccess(response.data.id);
      } else {
        notifications.show({
          title: 'Error',
          message: response.error || 'Failed to create shipment',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Error creating shipment:', error);
      notifications.show({
        title: 'Error',
        message: 'An unexpected error occurred',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleCreateShipment}>
      <LoadingOverlay visible={loading} />

      <Stack gap="md">
        <Title order={4}>Create New Shipment</Title>

        <Alert icon={<IconInfoCircle size={16} />} color="blue">
          A new shipment will be created in draft status. You can add products using barcode
          scanning after creation.
        </Alert>

        <Textarea
          label="Notes (Optional)"
          placeholder="Enter any notes for this shipment..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={500}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create Shipment
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

export default CreateShipment;
