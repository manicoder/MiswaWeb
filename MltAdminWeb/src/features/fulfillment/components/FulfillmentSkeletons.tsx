import React from 'react';
import { Skeleton, Table, Stack, Grid, Card, Group, Container } from '@mantine/core';

// Skeleton for ShipmentList
export const ShipmentListSkeleton: React.FC = () => {
  return (
    <Stack gap="md">
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Shipment</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Items</Table.Th>
            <Table.Th>Total Value</Table.Th>
            <Table.Th>Created</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {Array(5)
            .fill(0)
            .map((_, index) => (
              <Table.Tr key={index}>
                <Table.Td>
                  <Skeleton height={20} width={120} mb={8} />
                  <Skeleton height={16} width={80} />
                </Table.Td>
                <Table.Td>
                  <Skeleton height={16} width={80} />
                </Table.Td>
                <Table.Td>
                  <Skeleton height={16} width={60} />
                </Table.Td>
                <Table.Td>
                  <Skeleton height={16} width={70} />
                </Table.Td>
                <Table.Td>
                  <Skeleton height={16} width={80} />
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Skeleton height={24} width={70} />
                    <Skeleton height={24} width={70} />
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
};

// Skeleton for DispatchShipment
export const DispatchShipmentSkeleton: React.FC = () => {
  return (
    <Stack gap="md">
      <Skeleton height={24} width="40%" mb={8} />
      <Skeleton height={16} width="60%" mb={16} />

      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Shipment</Table.Th>
            <Table.Th>Items</Table.Th>
            <Table.Th>Total Value</Table.Th>
            <Table.Th>Created</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {Array(3)
            .fill(0)
            .map((_, index) => (
              <Table.Tr key={index}>
                <Table.Td>
                  <Skeleton height={20} width={120} mb={8} />
                  <Skeleton height={16} width={80} />
                </Table.Td>
                <Table.Td>
                  <Skeleton height={16} width={60} />
                </Table.Td>
                <Table.Td>
                  <Skeleton height={16} width={70} />
                </Table.Td>
                <Table.Td>
                  <Skeleton height={16} width={80} />
                </Table.Td>
                <Table.Td>
                  <Skeleton height={24} width={90} />
                </Table.Td>
              </Table.Tr>
            ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
};

// Skeleton for ReceiveShipment
export const ReceiveShipmentSkeleton: React.FC = () => {
  return (
    <Stack gap="md">
      <Skeleton height={24} width="40%" mb={8} />
      <Skeleton height={16} width="60%" mb={16} />

      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Shipment</Table.Th>
            <Table.Th>Items</Table.Th>
            <Table.Th>Total Value</Table.Th>
            <Table.Th>Created</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {Array(3)
            .fill(0)
            .map((_, index) => (
              <Table.Tr key={index}>
                <Table.Td>
                  <Skeleton height={20} width={120} mb={8} />
                  <Skeleton height={16} width={80} />
                </Table.Td>
                <Table.Td>
                  <Skeleton height={16} width={60} />
                </Table.Td>
                <Table.Td>
                  <Skeleton height={16} width={70} />
                </Table.Td>
                <Table.Td>
                  <Skeleton height={16} width={80} />
                </Table.Td>
                <Table.Td>
                  <Skeleton height={24} width={90} />
                </Table.Td>
              </Table.Tr>
            ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
};

// Skeleton for WarehouseManagement
export const WarehouseManagementSkeleton: React.FC = () => {
  return (
    <Stack gap="md">
      <Group justify="space-between" mb="lg">
        <div>
          <Skeleton height={24} width={200} mb={8} />
          <Skeleton height={16} width={300} />
        </div>
        <Skeleton height={36} width={120} />
      </Group>

      <Card withBorder>
        <Skeleton height={24} width={150} mb={16} />
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Code & Name</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Created</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {Array(4)
              .fill(0)
              .map((_, index) => (
                <Table.Tr key={index}>
                  <Table.Td>
                    <Skeleton height={18} width={100} mb={6} />
                    <Skeleton height={14} width={160} />
                  </Table.Td>
                  <Table.Td>
                    <Skeleton height={16} width={80} />
                  </Table.Td>
                  <Table.Td>
                    <Skeleton height={16} width={90} />
                  </Table.Td>
                </Table.Tr>
              ))}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
};

// Skeleton for ShipmentAnalytics
export const ShipmentAnalyticsSkeleton: React.FC = () => {
  return (
    <Stack gap="md">
      <Skeleton height={24} width={200} mb={16} />

      <Grid>
        {Array(3)
          .fill(0)
          .map((_, index) => (
            <Grid.Col key={index} span={{ base: 12, md: 4 }}>
              <Card withBorder p="md">
                <Skeleton height={18} width="70%" mb={12} />
                <Skeleton height={100} radius="md" mb={12} />
                <Skeleton height={16} width="40%" />
              </Card>
            </Grid.Col>
          ))}
      </Grid>

      <Card withBorder mt="md">
        <Skeleton height={20} width={180} mb={16} />
        <Skeleton height={250} radius="md" />
      </Card>
    </Stack>
  );
};

export const ShipmentDetailSkeleton = () => {
  return (
    <Container size="xl" p="md">
      {/* Header skeleton */}
      <Grid mb="md">
        <Grid.Col span={12}>
          <Skeleton height={50} radius="md" mb="sm" />
          <Grid>
            <Grid.Col span={8}>
              <Skeleton height={30} radius="sm" />
            </Grid.Col>
            <Grid.Col span={4}>
              <Skeleton height={30} radius="sm" />
            </Grid.Col>
          </Grid>
        </Grid.Col>
      </Grid>

      {/* Summary cards skeleton */}
      <Grid mb="xl">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Skeleton height={100} radius="md" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Skeleton height={100} radius="md" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Skeleton height={100} radius="md" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Skeleton height={100} radius="md" />
        </Grid.Col>
      </Grid>

      {/* Main content skeleton */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Skeleton height={400} radius="md" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Skeleton height={400} radius="md" />
        </Grid.Col>
      </Grid>
    </Container>
  );
};
