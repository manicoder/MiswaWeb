import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Group,
  Badge,
  Button,
  ActionIcon,
  Grid,
  Card,
  Table,
  ScrollArea,
  Loader,
  Alert,
  Center,
  Divider,
  Tabs,
  Modal,
  Box,
  Image,
  Breadcrumbs,
  Anchor,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconEdit,
  IconShare,
  IconPackage,
  IconTags,
  IconCalendar,
  IconBarcode,
  IconEye,
  IconExternalLink,
  IconPhoto,
  IconInfoCircle,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMediaQuery, useDisclosure } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { ShopifyService } from '../../../../services/shopifyService';
import useShopifyConnection from '../../../../hooks/useShopifyConnection';
import SquareImage from '../../../../components/common/SquareImage';
import ShopifyConnectionGuard from '../../../../components/shopify/ShopifyConnectionGuardWithModal';

interface ProductDetailsProps {
  productId?: string;
  onClose?: () => void;
  isModal?: boolean;
}

const ProductDetails: React.FC<ProductDetailsProps> = ({
  productId: propProductId,
  onClose,
  isModal = false,
}) => {
  const { id: routeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const productId = propProductId || routeId;

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('overview');

  const isMobile = useMediaQuery('(max-width: 768px)');
  const [imageModalOpened, { open: openImageModal, close: closeImageModal }] = useDisclosure(false);

  // Get store connection info for proper URLs
  const { store } = useShopifyConnection();

  // Convert numeric ID to full Shopify GraphQL ID if needed
  const fullProductId = productId?.startsWith('gid://')
    ? productId
    : `gid://shopify/Product/${productId}`;

  // Use React Query for product details with aggressive caching
  const {
    data: product,
    isLoading: loading,
    error,
    refetch: fetchProductDetails,
  } = useQuery({
    queryKey: ['shopify-product-details', fullProductId],
    queryFn: async () => {
      if (!productId) {
        throw new Error('No productId provided');
      }

      // React Query will handle caching and prevent duplicate requests
      return await ShopifyService.getProduct(fullProductId);
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 60, // 1 hour - very long stale time
    gcTime: 1000 * 60 * 60 * 2, // 2 hours - keep in memory
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  // Set selected variant when product data loads
  useEffect(() => {
    if (product?.variants?.length && product.variants.length > 0 && !selectedVariantId) {
      setSelectedVariantId(product.variants[0].id);
    }
  }, [product, selectedVariantId]);

  const handleBack = () => {
    if (isModal && onClose) {
      onClose();
    } else {
      // Use browser back navigation to preserve React Query cache
      navigate(-1);
    }
  };

  // Quick action handlers
  const handleViewInStore = () => {
    if (!product || !store?.shopDomain) {
      notifications.show({
        title: 'Error',
        message: 'Store information not available',
        color: 'red',
      });
      return;
    }

    // Generate product handle from title if not available
    const productHandle =
      (product as { handle?: string }).handle ||
      (product.title || 'product')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    const storeUrl = `https://${store.shopDomain}/products/${productHandle}`;
    window.open(storeUrl, '_blank');
  };

  const handleShareProduct = () => {
    if (!product) return;

    const shareUrl = window.location.href;

    if (navigator.share) {
      // Use native share API if available
      navigator
        .share({
          title: product.title,
          text: `Check out this product: ${product.title}`,
          url: shareUrl,
        })
        .catch((err) => {
          console.log('Error sharing:', err);
          copyToClipboard(shareUrl);
        });
    } else {
      // Fallback to clipboard
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        notifications.show({
          title: 'Copied!',
          message: 'Product link copied to clipboard',
          color: 'green',
        });
      })
      .catch(() => {
        notifications.show({
          title: 'Copy failed',
          message: 'Could not copy link to clipboard',
          color: 'red',
        });
      });
  };

  const handleShopifyAdmin = () => {
    if (!product || !store?.shopDomain) {
      notifications.show({
        title: 'Error',
        message: 'Store information not available',
        color: 'red',
      });
      return;
    }

    // Extract numeric ID from GraphQL format
    const numericId = product.id.replace('gid://shopify/Product/', '');
    const adminUrl = `https://${store.shopDomain}/admin/products/${numericId}`;
    window.open(adminUrl, '_blank');
  };

  const selectedVariant =
    product?.variants?.find((v) => v.id === selectedVariantId) || product?.variants?.[0];
  const selectedImage = product?.images?.[selectedImageIndex];

  const formatPrice = (price: string) => {
    const amount = parseFloat(price || '0');
    return `₹${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'green',
      draft: 'yellow',
      archived: 'gray',
    };

    const statusLower = status?.toLowerCase() || 'unknown';

    return (
      <Badge color={colors[statusLower] || 'blue'} variant="light" size="lg">
        {status?.toUpperCase() || 'UNKNOWN'}
      </Badge>
    );
  };

  const getInventoryStatus = (quantity: number) => {
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

  if (loading) {
    return (
      <Container size="xl" py="md">
        <Center py="xl">
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text>Loading product details...</Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Error" icon={<IconAlertCircle size={16} />}>
          {error instanceof Error ? error.message : 'Failed to fetch product details'}
        </Alert>
        <Group justify="center" mt="xl">
          <Button variant="light" onClick={handleBack}>
            Go Back
          </Button>
          <Button onClick={() => fetchProductDetails()}>Try Again</Button>
        </Group>
      </Container>
    );
  }

  if (!product) {
    return (
      <Container size="xl" py="md">
        <Alert color="yellow" title="Product Not Found" icon={<IconInfoCircle size={16} />}>
          The requested product could not be found.
        </Alert>
        <Group justify="center" mt="xl">
          <Button variant="light" onClick={handleBack}>
            Go Back
          </Button>
        </Group>
      </Container>
    );
  }

  const breadcrumbItems = [
    { title: 'Products', href: '/shopify/products' },
    { title: product.title, href: '#' },
  ].map((item, index) => (
    <Anchor key={index} onClick={() => item.href !== '#' && navigate(-1)}>
      {item.title}
    </Anchor>
  ));

  return (
    <ShopifyConnectionGuard
      title="Product Details"
      description="View detailed product information."
    >
      <Container size="xl" py={isMobile ? 'xs' : 'md'}>
        {/* Header with Breadcrumbs */}
        {!isModal && (
          <Stack mb="lg" gap="sm">
            <Breadcrumbs>{breadcrumbItems}</Breadcrumbs>
            <Group justify="space-between" align="flex-start">
              <Group>
                <ActionIcon variant="light" size="lg" onClick={handleBack}>
                  <IconArrowLeft size={18} />
                </ActionIcon>
                <div>
                  <Title order={isMobile ? 3 : 1} size={isMobile ? '1.5rem' : undefined}>
                    {product.title}
                  </Title>
                  <Text c="dimmed" size="sm" mt={4}>
                    Product ID: {product.id}
                  </Text>
                </div>
              </Group>
              <Group gap="sm">
                {getStatusBadge(product.status)}
                <Tooltip label="Share product">
                  <ActionIcon variant="light" size="lg" onClick={handleShareProduct}>
                    <IconShare size={18} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Edit product in Shopify Admin">
                  <ActionIcon variant="light" size="lg" onClick={handleShopifyAdmin}>
                    <IconEdit size={18} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          </Stack>
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
                      cursor: product.images?.length > 0 ? 'pointer' : 'default',
                    }}
                    onClick={product.images?.length > 0 ? openImageModal : undefined}
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
                      <SquareImage fallbackIcon="package" alt={product.title} />
                    )}
                  </Box>
                </Center>

                {/* Image Thumbnails */}
                {product.images && product.images.length > 1 && (
                  <Group justify="center" gap="xs">
                    {product.images.map((image, index) => (
                      <Box
                        key={image.id}
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
              {/* Basic Info */}
              <Paper withBorder p="md">
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <div style={{ flex: 1 }}>
                      <Text fw={600} size="xl" mb="xs">
                        {formatPrice(selectedVariant?.price || '0')}
                      </Text>
                      {selectedVariant?.compare_at_price &&
                        parseFloat(selectedVariant.compare_at_price) >
                          parseFloat(selectedVariant.price || '0') && (
                          <Text td="line-through" c="dimmed" size="sm">
                            {formatPrice(selectedVariant.compare_at_price)}
                          </Text>
                        )}
                    </div>
                    <Badge
                      {...getInventoryStatus(selectedVariant?.inventory_quantity || 0)}
                      variant="light"
                    >
                      {getInventoryStatus(selectedVariant?.inventory_quantity || 0).label}
                    </Badge>
                  </Group>

                  <Divider />

                  <Stack gap="sm">
                    <Group gap="sm">
                      <IconPackage size={16} />
                      <Text size="sm" fw={500}>
                        Vendor:
                      </Text>
                      <Text size="sm">{product.vendor || 'N/A'}</Text>
                    </Group>

                    <Group gap="sm">
                      <IconTags size={16} />
                      <Text size="sm" fw={500}>
                        Type:
                      </Text>
                      <Text size="sm">{product.product_type || 'N/A'}</Text>
                    </Group>

                    {selectedVariant?.sku && (
                      <Group gap="sm">
                        <IconBarcode size={16} />
                        <Text size="sm" fw={500}>
                          SKU:
                        </Text>
                        <Text size="sm" ff="monospace">
                          {selectedVariant.sku}
                        </Text>
                      </Group>
                    )}

                    {selectedVariant?.barcode && (
                      <Group gap="sm">
                        <IconBarcode size={16} />
                        <Text size="sm" fw={500}>
                          Barcode:
                        </Text>
                        <Text size="sm" ff="monospace">
                          {selectedVariant.barcode}
                        </Text>
                      </Group>
                    )}

                    <Group gap="sm">
                      <IconCalendar size={16} />
                      <Text size="sm" fw={500}>
                        Created:
                      </Text>
                      <Text size="sm">{formatDate(product.created_at)}</Text>
                    </Group>
                  </Stack>

                  {/* Tags */}
                  {(() => {
                    let tags: string[] = [];
                    if (Array.isArray(product.tags)) {
                      tags = product.tags;
                    } else if (typeof product.tags === 'string' && product.tags.trim()) {
                      tags = product.tags
                        .split(',')
                        .filter((tag) => tag.trim())
                        .map((tag) => tag.trim());
                    }

                    return (
                      tags.length > 0 && (
                        <>
                          <Divider />
                          <div>
                            <Text size="sm" fw={500} mb="xs">
                              Tags:
                            </Text>
                            <Group gap="xs">
                              {tags.slice(0, 8).map((tag: string, index: number) => (
                                <Badge key={index} variant="outline" size="sm">
                                  {tag}
                                </Badge>
                              ))}
                              {tags.length > 8 && (
                                <Badge variant="outline" size="sm" c="dimmed">
                                  +{tags.length - 8} more
                                </Badge>
                              )}
                            </Group>
                          </div>
                        </>
                      )
                    );
                  })()}
                </Stack>
              </Paper>

              {/* Quick Actions */}
              <Paper withBorder p="md">
                <Text fw={500} mb="md">
                  Quick Actions
                </Text>
                <Group>
                  <Button
                    leftSection={<IconEye size={16} />}
                    variant="light"
                    size="sm"
                    onClick={handleViewInStore}
                  >
                    View in Store
                  </Button>
                  <Button
                    leftSection={<IconShare size={16} />}
                    variant="light"
                    size="sm"
                    onClick={handleShareProduct}
                  >
                    Share Product
                  </Button>
                  <Button
                    leftSection={<IconExternalLink size={16} />}
                    variant="light"
                    size="sm"
                    onClick={handleShopifyAdmin}
                  >
                    Shopify Admin
                  </Button>
                </Group>
              </Paper>
            </Stack>
          </Grid.Col>
        </Grid>

        {/* Detailed Tabs */}
        <Paper withBorder mt="xl">
          <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'overview')}>
            <Tabs.List>
              <Tabs.Tab value="overview">Overview</Tabs.Tab>
              <Tabs.Tab value="variants">Variants ({product.variants?.length || 0})</Tabs.Tab>
              <Tabs.Tab value="images">Images ({product.images?.length || 0})</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="overview" pt="md">
              <Stack gap="md" p="md">
                {/* Description */}
                {product.body_html && (
                  <div>
                    <Text fw={500} mb="sm">
                      Description
                    </Text>
                    <Paper withBorder p="md" bg="gray.0">
                      <div
                        dangerouslySetInnerHTML={{ __html: product.body_html }}
                        style={{
                          fontSize: '14px',
                          lineHeight: 1.6,
                          color: 'var(--mantine-color-dark-6)',
                        }}
                      />
                    </Paper>
                  </div>
                )}

                {/* Product Metadata */}
                <div>
                  <Text fw={500} mb="sm">
                    Product Information
                  </Text>
                  <Grid>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Paper withBorder p="md">
                        <Stack gap="xs">
                          <Group justify="space-between">
                            <Text size="sm" c="dimmed">
                              Status
                            </Text>
                            <Text size="sm">{product.status}</Text>
                          </Group>
                          <Group justify="space-between">
                            <Text size="sm" c="dimmed">
                              Created
                            </Text>
                            <Text size="sm">{formatDate(product.created_at)}</Text>
                          </Group>
                          <Group justify="space-between">
                            <Text size="sm" c="dimmed">
                              Updated
                            </Text>
                            <Text size="sm">{formatDate(product.updated_at)}</Text>
                          </Group>
                          {product.published_at && (
                            <Group justify="space-between">
                              <Text size="sm" c="dimmed">
                                Published
                              </Text>
                              <Text size="sm">{formatDate(product.published_at)}</Text>
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
                              Vendor
                            </Text>
                            <Text size="sm">{product.vendor || 'N/A'}</Text>
                          </Group>
                          <Group justify="space-between">
                            <Text size="sm" c="dimmed">
                              Product Type
                            </Text>
                            <Text size="sm">{product.product_type || 'N/A'}</Text>
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
                            <Text size="sm">{product.images?.length || 0}</Text>
                          </Group>
                        </Stack>
                      </Paper>
                    </Grid.Col>
                  </Grid>
                </div>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="variants" pt="md">
              {product.variants && product.variants.length > 0 ? (
                <ScrollArea>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Title/SKU</Table.Th>
                        <Table.Th>Price</Table.Th>
                        <Table.Th>Inventory</Table.Th>
                        <Table.Th>Barcode</Table.Th>
                        <Table.Th>Status</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {product.variants.map((variant) => {
                        const inventoryStatus = getInventoryStatus(variant.inventory_quantity || 0);
                        return (
                          <Table.Tr key={variant.id}>
                            <Table.Td>
                              <Stack gap={2}>
                                <Text size="sm" fw={500}>
                                  {variant.title}
                                </Text>
                                {variant.sku && (
                                  <Text size="xs" c="dimmed" ff="monospace">
                                    SKU: {variant.sku}
                                  </Text>
                                )}
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <Stack gap={2}>
                                <Text size="sm" fw={500}>
                                  {formatPrice(variant.price)}
                                </Text>
                                {variant.compare_at_price &&
                                  parseFloat(variant.compare_at_price) >
                                    parseFloat(variant.price || '0') && (
                                    <Text size="xs" td="line-through" c="dimmed">
                                      {formatPrice(variant.compare_at_price)}
                                    </Text>
                                  )}
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs">
                                <Text size="sm">{variant.inventory_quantity || 0}</Text>
                                <Badge color={inventoryStatus.color} variant="light" size="xs">
                                  {inventoryStatus.label}
                                </Badge>
                              </Group>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" ff="monospace">
                                {variant.barcode || 'N/A'}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge
                                color={variant.inventory_quantity > 0 ? 'green' : 'red'}
                                variant="light"
                                size="sm"
                              >
                                {variant.inventory_quantity > 0 ? 'Available' : 'Unavailable'}
                              </Badge>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              ) : (
                <Center py="xl">
                  <Text c="dimmed">No variants available</Text>
                </Center>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="images" pt="md">
              {product.images && product.images.length > 0 ? (
                <Grid p="md">
                  {product.images.map((image, index) => (
                    <Grid.Col key={image.id} span={{ base: 12, xs: 6, sm: 4, md: 3 }}>
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
                              openImageModal();
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
            </Tabs.Panel>
          </Tabs>
        </Paper>

        {/* Image Modal */}
        <Modal
          opened={imageModalOpened}
          onClose={closeImageModal}
          size="xl"
          title={selectedImage?.alt || 'Product Image'}
          centered
        >
          {selectedImage && (
            <Image
              src={selectedImage.src}
              alt={selectedImage.alt || product.title}
              fit="contain"
              mah="70vh"
            />
          )}
        </Modal>
      </Container>
    </ShopifyConnectionGuard>
  );
};

export default ProductDetails;
