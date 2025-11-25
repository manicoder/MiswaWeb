import React, { useState } from 'react';
import {
  Modal,
  Image,
  Stack,
  Group,
  Text,
  Title,
  Badge,
  Paper,
  Grid,
  ScrollArea,
  Center,
  Tabs,
  Table,
  Box,
  ActionIcon,
  Tooltip,
  Card,
} from '@mantine/core';
import { IconPackage, IconExternalLink, IconPhoto, IconInfoCircle } from '@tabler/icons-react';

interface ProductVariant {
  id?: string;
  variantId?: string;
  title?: string;
  sku?: string;
  barcode?: string;
  price?: number;
  currency?: string;
  available?: number;
  inventoryQuantity?: number;
}

interface ProductImage {
  id?: string;
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

interface ProductDetailModalProps {
  opened: boolean;
  onClose: () => void;
  product: {
    id?: string;
    title: string;
    description?: string;
    vendor?: string;
    productType?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    images?: ProductImage[];
    variants?: ProductVariant[];
    bodyHtml?: string;
    handle?: string;
    tags?: string[];
    [key: string]: unknown;
  } | null;
  showActions?: boolean;
  onViewInStore?: () => void;
  onEditProduct?: () => void;
  onShareProduct?: () => void;
  currency?: string;
  showInventory?: boolean;
  showPricing?: boolean;
  showVariants?: boolean;
  showImages?: boolean;
  showMetadata?: boolean;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  opened,
  onClose,
  product,
  showActions = true,
  onViewInStore,
  onEditProduct,
  onShareProduct,
  currency = 'INR',
  showInventory = true,
  showPricing = true,
  showVariants = true,
  showImages = true,
  showMetadata = true,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');

  if (!product) {
    return null;
  }

  const selectedImage = product.images?.[selectedImageIndex];
  const totalImages = product.images?.length || 0;

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    return `${currency} ${price.toFixed(2)}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;

    const colors: Record<string, string> = {
      active: 'green',
      draft: 'yellow',
      archived: 'gray',
      published: 'green',
      unpublished: 'gray',
    };

    const statusLower = status.toLowerCase();

    return (
      <Badge color={colors[statusLower] || 'blue'} variant="light" size="lg">
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getInventoryStatus = (quantity?: number) => {
    if (quantity === undefined || quantity === null) return { label: 'Unknown', color: 'gray' };
    if (quantity === 0) {
      return { label: 'Out of Stock', color: 'red' };
    } else if (quantity <= 5) {
      return { label: 'Low Stock', color: 'orange' };
    } else if (quantity <= 20) {
      return { label: 'Limited Stock', color: 'yellow' };
    } else {
      return { label: 'In Stock', color: 'green' };
    }
  };

  const renderOverview = () => (
    <Stack gap="md">
      {/* Description */}
      {(product.description || product.bodyHtml) && (
        <div>
          <Text fw={500} mb="sm">
            Description
          </Text>
          <Paper withBorder p="md" bg="gray.0">
            {product.bodyHtml ? (
              <div
                dangerouslySetInnerHTML={{ __html: product.bodyHtml }}
                style={{
                  fontSize: '14px',
                  lineHeight: 1.6,
                  color: 'var(--mantine-color-dark-6)',
                }}
              />
            ) : (
              <Text size="sm" style={{ lineHeight: 1.6 }}>
                {product.description}
              </Text>
            )}
          </Paper>
        </div>
      )}

      {/* Product Metadata */}
      {showMetadata && (
        <div>
          <Text fw={500} mb="md">
            Product Information
          </Text>
          <Grid>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Paper withBorder p="md">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Product ID
                    </Text>
                    <Text size="sm" fw={500}>
                      {product.id || 'N/A'}
                    </Text>
                  </Group>
                  {product.vendor && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Vendor
                      </Text>
                      <Text size="sm">{product.vendor}</Text>
                    </Group>
                  )}
                  {product.productType && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Product Type
                      </Text>
                      <Text size="sm">{product.productType}</Text>
                    </Group>
                  )}
                  {product.handle && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Handle
                      </Text>
                      <Text size="sm" style={{ fontFamily: 'monospace' }}>
                        {product.handle}
                      </Text>
                    </Group>
                  )}
                </Stack>
              </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Paper withBorder p="md">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Status
                    </Text>
                    {getStatusBadge(product.status)}
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Created
                    </Text>
                    <Text size="sm">{formatDate(product.createdAt)}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Updated
                    </Text>
                    <Text size="sm">{formatDate(product.updatedAt)}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Total Variants
                    </Text>
                    <Text size="sm">{product.variants?.length || 0}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Total Images
                    </Text>
                    <Text size="sm">{totalImages}</Text>
                  </Group>
                </Stack>
              </Paper>
            </Grid.Col>
          </Grid>
        </div>
      )}

      {/* Tags */}
      {product.tags && product.tags.length > 0 && (
        <div>
          <Text fw={500} mb="sm">
            Tags
          </Text>
          <Group gap="xs">
            {product.tags.map((tag, index) => (
              <Badge key={index} variant="light" color="blue">
                {tag}
              </Badge>
            ))}
          </Group>
        </div>
      )}
    </Stack>
  );

  const renderVariants = () => (
    <Stack gap="md">
      {product.variants && product.variants.length > 0 ? (
        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Variant</Table.Th>
              {showPricing && <Table.Th>Price</Table.Th>}
              {showInventory && <Table.Th>Inventory</Table.Th>}
              <Table.Th>SKU</Table.Th>
              <Table.Th>Barcode</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {product.variants.map((variant, index) => {
              const inventoryStatus = getInventoryStatus(
                variant.available || variant.inventoryQuantity,
              );
              return (
                <Table.Tr key={variant.id || variant.variantId || index}>
                  <Table.Td>
                    <Stack gap={2}>
                      <Text size="sm" fw={500}>
                        {variant.title || `Variant ${index + 1}`}
                      </Text>
                    </Stack>
                  </Table.Td>
                  {showPricing && (
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {formatPrice(variant.price)}
                      </Text>
                    </Table.Td>
                  )}
                  {showInventory && (
                    <Table.Td>
                      <Stack gap={2}>
                        <Badge color={inventoryStatus.color} variant="light" size="sm">
                          {inventoryStatus.label}
                        </Badge>
                        <Text size="sm">
                          {variant.available !== undefined
                            ? variant.available
                            : variant.inventoryQuantity || 0}
                        </Text>
                      </Stack>
                    </Table.Td>
                  )}
                  <Table.Td>
                    <Text size="sm" style={{ fontFamily: 'monospace' }}>
                      {variant.sku || 'N/A'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {variant.barcode ? (
                      <Box
                        p={2}
                        style={{
                          border: '1px solid #FFE5B4',
                          borderRadius: '4px',
                          display: 'inline-block',
                          backgroundColor: '#FFFAF0',
                        }}
                      >
                        <Text size="sm" fw={500} style={{ fontFamily: 'monospace' }}>
                          {variant.barcode}
                        </Text>
                      </Box>
                    ) : (
                      <Text size="sm" c="dimmed">
                        N/A
                      </Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      ) : (
        <Center py="xl">
          <Stack align="center" gap="md">
            <IconPackage size={48} color="var(--mantine-color-gray-5)" />
            <Text c="dimmed">No variants available</Text>
          </Stack>
        </Center>
      )}
    </Stack>
  );

  const renderImages = () => (
    <Stack gap="md">
      {product.images && product.images.length > 0 ? (
        <Grid>
          {product.images.map((image, index) => (
            <Grid.Col key={image.id || index} span={{ base: 12, xs: 6, sm: 4, md: 3 }}>
              <Card withBorder>
                <Card.Section>
                  <Image
                    src={image.src}
                    alt={image.alt || `Product image ${index + 1}`}
                    height={200}
                    fit="cover"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setSelectedImageIndex(index);
                    }}
                  />
                </Card.Section>
                <Stack gap="xs" mt="sm">
                  {image.alt && (
                    <Text size="sm" lineClamp={2}>
                      {image.alt}
                    </Text>
                  )}
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                      {image.width}×{image.height}
                    </Text>
                    <ActionIcon
                      variant="light"
                      size="sm"
                      onClick={() => window.open(image.src, '_blank')}
                    >
                      <IconExternalLink size={12} />
                    </ActionIcon>
                  </Group>
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      ) : (
        <Center py="xl">
          <Stack align="center" gap="md">
            <IconPhoto size={48} color="var(--mantine-color-gray-5)" />
            <Text c="dimmed">No images available</Text>
          </Stack>
        </Center>
      )}
    </Stack>
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      title={
        <Group>
          <IconPackage size={24} />
          <Title order={3}>Product Details</Title>
        </Group>
      }
      styles={{
        body: {
          height: 'calc(100vh - 120px)',
          maxHeight: 'calc(100vh - 120px)',
        },
      }}
    >
      <Stack gap="md" h="100%">
        {/* Header with Actions */}
        {showActions && (
          <Paper withBorder p="md">
            <Group justify="space-between">
              <div>
                <Title order={4}>{product.title}</Title>
                {product.status && <Group mt="xs">{getStatusBadge(product.status)}</Group>}
              </div>
              <Group gap="xs">
                {onViewInStore && (
                  <Tooltip label="View in Store">
                    <ActionIcon variant="light" size="lg" onClick={onViewInStore}>
                      <IconExternalLink size={18} />
                    </ActionIcon>
                  </Tooltip>
                )}
                {onEditProduct && (
                  <Tooltip label="Edit Product">
                    <ActionIcon variant="light" size="lg" onClick={onEditProduct}>
                      <IconInfoCircle size={18} />
                    </ActionIcon>
                  </Tooltip>
                )}
                {onShareProduct && (
                  <Tooltip label="Share Product">
                    <ActionIcon variant="light" size="lg" onClick={onShareProduct}>
                      <IconExternalLink size={18} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
            </Group>
          </Paper>
        )}

        <Grid>
          {/* Left Side - Images */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper withBorder p="md">
              <Stack gap="md">
                {/* Main Image */}
                <Center>
                  <Box
                    style={{
                      width: '100%',
                      maxWidth: 400,
                      aspectRatio: '1/1',
                      cursor: totalImages > 0 ? 'pointer' : 'default',
                    }}
                  >
                    {selectedImage ? (
                      <Image
                        src={selectedImage.src}
                        alt={selectedImage.alt || product.title}
                        radius="md"
                        fit="cover"
                        w="100%"
                        h="100%"
                      />
                    ) : (
                      <Center
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: 'var(--mantine-color-gray-1)',
                          borderRadius: '8px',
                        }}
                      >
                        <IconPackage size={64} color="var(--mantine-color-gray-5)" />
                      </Center>
                    )}
                  </Box>
                </Center>

                {/* Image Thumbnails */}
                {totalImages > 1 && (
                  <Group justify="center" gap="xs">
                    {product.images?.map((image, index) => (
                      <Box
                        key={image.id || index}
                        style={{
                          width: 60,
                          height: 60,
                          cursor: 'pointer',
                          border:
                            selectedImageIndex === index
                              ? '2px solid var(--mantine-color-blue-6)'
                              : '1px solid var(--mantine-color-gray-3)',
                          borderRadius: 8,
                          overflow: 'hidden',
                        }}
                        onClick={() => setSelectedImageIndex(index)}
                      >
                        <Image src={image.src} alt={image.alt} fit="cover" w="100%" h="100%" />
                      </Box>
                    ))}
                  </Group>
                )}
              </Stack>
            </Paper>
          </Grid.Col>

          {/* Right Side - Product Info */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="md">
              <Paper withBorder p="md">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Product ID
                    </Text>
                    <Text size="sm" fw={500}>
                      {product.id || 'N/A'}
                    </Text>
                  </Group>
                  {product.vendor && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Vendor
                      </Text>
                      <Text size="sm">{product.vendor}</Text>
                    </Group>
                  )}
                  {product.productType && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Product Type
                      </Text>
                      <Text size="sm">{product.productType}</Text>
                    </Group>
                  )}
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Variants
                    </Text>
                    <Text size="sm">{product.variants?.length || 0}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Images
                    </Text>
                    <Text size="sm">{totalImages}</Text>
                  </Group>
                </Stack>
              </Paper>

              {/* Quick Actions */}
              {showActions && (
                <Paper withBorder p="md">
                  <Text fw={500} mb="md">
                    Quick Actions
                  </Text>
                  <Group>
                    {onViewInStore && (
                      <ActionIcon variant="light" size="md" onClick={onViewInStore}>
                        <IconExternalLink size={16} />
                      </ActionIcon>
                    )}
                    {onEditProduct && (
                      <ActionIcon variant="light" size="md" onClick={onEditProduct}>
                        <IconInfoCircle size={16} />
                      </ActionIcon>
                    )}
                    {onShareProduct && (
                      <ActionIcon variant="light" size="md" onClick={onShareProduct}>
                        <IconExternalLink size={16} />
                      </ActionIcon>
                    )}
                  </Group>
                </Paper>
              )}
            </Stack>
          </Grid.Col>
        </Grid>

        {/* Detailed Tabs */}
        <Paper withBorder>
          <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'overview')}>
            <Tabs.List>
              <Tabs.Tab value="overview">Overview</Tabs.Tab>
              {showVariants && (
                <Tabs.Tab value="variants">Variants ({product.variants?.length || 0})</Tabs.Tab>
              )}
              {showImages && <Tabs.Tab value="images">Images ({totalImages})</Tabs.Tab>}
            </Tabs.List>

            <Tabs.Panel value="overview" pt="md">
              <ScrollArea h="calc(100vh - 400px)">
                <div style={{ padding: '16px' }}>{renderOverview()}</div>
              </ScrollArea>
            </Tabs.Panel>

            {showVariants && (
              <Tabs.Panel value="variants" pt="md">
                <ScrollArea h="calc(100vh - 400px)">
                  <div style={{ padding: '16px' }}>{renderVariants()}</div>
                </ScrollArea>
              </Tabs.Panel>
            )}

            {showImages && (
              <Tabs.Panel value="images" pt="md">
                <ScrollArea h="calc(100vh - 400px)">
                  <div style={{ padding: '16px' }}>{renderImages()}</div>
                </ScrollArea>
              </Tabs.Panel>
            )}
          </Tabs>
        </Paper>
      </Stack>
    </Modal>
  );
};

export default ProductDetailModal;
