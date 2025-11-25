import React from 'react';
import { Container, Title, Card, Text, Badge, Button, Group } from '@mantine/core';
import { IconPackage, IconSettings } from '@tabler/icons-react';

const AmazonProductList: React.FC = () => {
  return (
    <Container size="lg">
      <Group justify="space-between" mb="xl">
        <Title order={2}>
          <IconPackage size={28} style={{ marginRight: 8 }} />
          Amazon Products
        </Title>
        <Badge color="orange" size="lg">
          Coming Soon
        </Badge>
      </Group>

      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <Group justify="center" mb="md">
          <IconSettings size={48} color="orange" />
        </Group>

        <Text ta="center" size="lg" fw={500} mb="md">
          Amazon SP-API Integration
        </Text>

        <Text ta="center" c="dimmed" mb="xl">
          We're working on integrating Amazon's Selling Partner API to bring you comprehensive
          product management for your Amazon marketplace. This will include:
        </Text>

        <ul style={{ color: 'var(--mantine-color-dimmed)' }}>
          <li>Product catalog management</li>
          <li>Inventory synchronization</li>
          <li>Order processing</li>
          <li>Performance analytics</li>
          <li>Advertising campaign management</li>
        </ul>

        <Group justify="center" mt="xl">
          <Button color="orange" disabled>
            Configure Amazon Integration
          </Button>
        </Group>
      </Card>
    </Container>
  );
};

export default AmazonProductList;
