import React from 'react';
import { Container, Title, Card, Text, Badge, Button, Group } from '@mantine/core';
import { IconSettings, IconShoppingBag } from '@tabler/icons-react';

const FlipkartProductList: React.FC = () => {
  return (
    <Container size="lg">
      <Group justify="space-between" mb="xl">
        <Title order={2}>
          <IconShoppingBag size={28} style={{ marginRight: 8 }} />
          Flipkart Products
        </Title>
        <Badge color="yellow" size="lg">
          Coming Soon
        </Badge>
      </Group>

      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <Group justify="center" mb="md">
          <IconSettings size={48} color="orange" />
        </Group>

        <Text ta="center" size="lg" fw={500} mb="md">
          Flipkart Seller Integration
        </Text>

        <Text ta="center" c="dimmed" mb="xl">
          We're working on integrating Flipkart's Seller APIs to help you manage your products on
          India's leading e-commerce platform. This will include:
        </Text>

        <ul style={{ color: 'var(--mantine-color-dimmed)' }}>
          <li>Product catalog management</li>
          <li>Inventory synchronization</li>
          <li>Order processing and fulfillment</li>
          <li>Performance analytics and insights</li>
          <li>Pricing and promotion management</li>
          <li>Customer review management</li>
        </ul>

        <Group justify="center" mt="xl">
          <Button color="yellow" disabled>
            Configure Flipkart Integration
          </Button>
        </Group>
      </Card>
    </Container>
  );
};

export default FlipkartProductList;
