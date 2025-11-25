import React from 'react';
import { Group, Text, Anchor, Box } from '@mantine/core';
import { IconChevronRight, IconHome } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  homeHref?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, homeHref = '/dashboard' }) => {
  return (
    <Box mb="md">
      <Group gap="xs" align="center">
        {/* Home link */}
        <Anchor component={Link} to={homeHref} c="blue" style={{ textDecoration: 'none' }}>
          <Group gap={4} align="center">
            <IconHome size={16} />
            <Text size="sm">Home</Text>
          </Group>
        </Anchor>

        {/* Separator */}
        <IconChevronRight size={14} color="var(--mantine-color-gray-6)" />

        {/* Breadcrumb items */}
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {item.href ? (
              <Anchor component={Link} to={item.href} c="blue" style={{ textDecoration: 'none' }}>
                <Group gap={4} align="center">
                  {item.icon}
                  <Text size="sm">{item.label}</Text>
                </Group>
              </Anchor>
            ) : (
              <Group gap={4} align="center">
                {item.icon}
                <Text size="sm" c="dimmed" fw={500}>
                  {item.label}
                </Text>
              </Group>
            )}

            {/* Separator for non-last items */}
            {index < items.length - 1 && (
              <IconChevronRight size={14} color="var(--mantine-color-gray-6)" />
            )}
          </React.Fragment>
        ))}
      </Group>
    </Box>
  );
};

export default Breadcrumb;
