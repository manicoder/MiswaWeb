import React, { useState } from 'react';
import {
  Paper,
  Stack,
  Group,
  Button,
  Text,
  Textarea,
  FileInput,
  Alert,
  Tabs,
  Badge,
  Card,
  Grid,
  ActionIcon,
  Center,
  Loader,
  TextInput,
  Table,
  ScrollArea,
  Tooltip,
} from '@mantine/core';
import {
  IconSearch,
  IconUpload,
  IconInfoCircle,
  IconFilter,
  IconCheck,
  IconAlertTriangle,
  IconX as IconXCircle,
  IconEye,
  IconEdit,
  IconShoppingBag,
  IconLayoutGrid,
  IconList,
} from '@tabler/icons-react';

import { paginatedShopifyService } from '../../../../services/paginatedShopifyService';
import type { ShopifyProduct } from '../../../../services/paginatedShopifyService';
import SquareImage from '../../../../components/common/SquareImage';
import ExportButton from '../../../../components/common/ExportButton';
import type { ExportColumn } from '../../../../utils/exportUtils';

interface SmartSearchResult {
  searchTerm: string;
  status: 'found' | 'not-found' | 'loading';
  product?: ShopifyProduct;
  matchedBy?: 'sku' | 'barcode' | 'title';
}

const SmartSearchProductList: React.FC = () => {
  // Smart search states
  const [bulkSearchInput, setBulkSearchInput] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [smartSearchActive, setSmartSearchActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SmartSearchResult[]>([]);
  const [searchStats, setSearchStats] = useState<{
    totalSearched: number;
    found: number;
    notFound: number;
  }>({ totalSearched: 0, found: 0, notFound: 0 });

  // Progress tracking states
  const [searchProgress, setSearchProgress] = useState<{
    step: string;
    percentage: number;
    isLoading: boolean;
  }>({ step: '', percentage: 0, isLoading: false });

  // Single search input
  const [singleSearchInput, setSingleSearchInput] = useState('');

  // View mode state
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  const processCsvFile = async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line);

          if (lines.length === 0) {
            resolve([]);
            return;
          }

          // Check if first line has headers
          const firstLine = lines[0];
          const hasHeaders =
            firstLine.toLowerCase().includes('sku') ||
            firstLine.toLowerCase().includes('barcode') ||
            firstLine.toLowerCase().includes('fnsku');

          let terms: string[] = [];

          if (hasHeaders) {
            // Parse CSV with headers
            const headers = firstLine.split(',').map((h) => h.trim().toLowerCase());
            const relevantColumnIndices = headers
              .map((h, index) =>
                h === 'sku' ||
                h.includes('sku') ||
                h === 'barcode' ||
                h.includes('barcode') ||
                h.includes('fnsku')
                  ? index
                  : -1,
              )
              .filter((index) => index !== -1);

            if (relevantColumnIndices.length === 0) {
              // No relevant columns found, treat all values as potential search terms
              lines.forEach((line) => {
                const values = line
                  .split(',')
                  .map((v) => v.trim())
                  .filter((v) => v);
                terms.push(...values);
              });
            } else {
              // Use relevant columns
              for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map((v) => v.trim());
                relevantColumnIndices.forEach((colIndex) => {
                  if (values[colIndex] && values[colIndex].trim()) {
                    terms.push(values[colIndex].trim());
                  }
                });
              }
            }
          } else {
            // No headers, treat as comma-separated values
            lines.forEach((line) => {
              const values = line
                .split(',')
                .map((v) => v.trim())
                .filter((v) => v);
              terms.push(...values);
            });
          }

          // Remove duplicates and empty values
          terms = [...new Set(terms.filter((term) => term && term.length > 0))];

          resolve(terms);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleCsvUpload = async (file: File | null) => {
    setCsvFile(file);
    setSearchResults([]);

    if (!file) {
      setSearchTerms([]);
      return;
    }

    try {
      const terms = await processCsvFile(file);
      setSearchTerms(terms);
      setBulkSearchInput(terms.join('\n'));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error reading CSV';
      setError(`Error reading CSV: ${errorMessage}`);
      setCsvFile(null);
      setSearchTerms([]);
    }
  };

  const handleBulkSearchInputChange = (value: string) => {
    setBulkSearchInput(value);
    const terms = value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    setSearchTerms(terms);
  };

  const searchProducts = async (terms: string[]) => {
    if (terms.length === 0) return;

    setSmartSearchActive(true);
    setError(null);
    setSearchProgress({ step: 'Initializing search...', percentage: 0, isLoading: true });

    // Initialize search results
    const initialResults: SmartSearchResult[] = terms.map((term) => ({
      searchTerm: term,
      status: 'loading' as const,
    }));
    setSearchResults(initialResults);

    try {
      setSearchProgress({ step: 'Loading all products...', percentage: 20, isLoading: true });

      // Load all products to search through
      const allProducts: ShopifyProduct[] = [];
      let hasMore = true;
      let cursor = '';

      while (hasMore) {
        const response = await paginatedShopifyService.fetchProducts({
          limit: 250,
          after: cursor,
        });

        if (response.success && response.data) {
          allProducts.push(...response.data.items);
          hasMore = response.data.hasMore;
          cursor = response.data.pageInfo.endCursor || '';
        } else {
          throw new Error(response.error || 'Failed to load products');
        }
      }

      setSearchProgress({ step: 'Searching products...', percentage: 60, isLoading: true });

      // Search for each term
      const results: SmartSearchResult[] = [];

      for (let i = 0; i < terms.length; i++) {
        const term = terms[i].toLowerCase();
        const progress = 60 + (30 * (i + 1)) / terms.length;
        setSearchProgress({
          step: `Searching for "${terms[i]}" (${i + 1}/${terms.length})...`,
          percentage: progress,
          isLoading: true,
        });

        // Search in products
        const foundProduct = allProducts.find((product) => {
          // Search in SKU (variants)
          const skuMatch = product.variants.some((variant) =>
            variant.sku?.toLowerCase().includes(term),
          );
          if (skuMatch) return true;

          // Search in barcode (variants)
          const barcodeMatch = product.variants.some(
            (variant) =>
              variant.barcode &&
              variant.barcode.trim() !== '' &&
              variant.barcode.toLowerCase().includes(term),
          );
          if (barcodeMatch) return true;

          // Search in title
          if (product.title?.toLowerCase().includes(term)) return true;

          return false;
        });

        if (foundProduct) {
          // Determine what matched
          let matchedBy: 'sku' | 'barcode' | 'title' = 'title';

          const skuMatch = foundProduct.variants.some((variant) =>
            variant.sku?.toLowerCase().includes(term),
          );
          const barcodeMatch = foundProduct.variants.some(
            (variant) =>
              variant.barcode &&
              variant.barcode.trim() !== '' &&
              variant.barcode.toLowerCase().includes(term),
          );

          if (skuMatch) matchedBy = 'sku';
          else if (barcodeMatch) matchedBy = 'barcode';
          else if (foundProduct.title?.toLowerCase().includes(term)) matchedBy = 'title';

          results.push({
            searchTerm: terms[i],
            status: 'found',
            product: foundProduct,
            matchedBy,
          });
        } else {
          results.push({
            searchTerm: terms[i],
            status: 'not-found',
          });
        }
      }

      setSearchResults(results);

      const foundCount = results.filter((r) => r.status === 'found').length;
      const notFoundCount = results.filter((r) => r.status === 'not-found').length;

      setSearchStats({
        totalSearched: terms.length,
        found: foundCount,
        notFound: notFoundCount,
      });

      setSearchProgress({ step: 'Search completed!', percentage: 100, isLoading: false });
    } catch (error: unknown) {
      console.error('Smart search error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to search products';
      setError(errorMessage);
      setSearchProgress({ step: 'Search failed', percentage: 0, isLoading: false });
    } finally {
      setTimeout(() => {
        setSmartSearchActive(false);
        setSearchProgress({ step: '', percentage: 0, isLoading: false });
      }, 1000);
    }
  };

  const handleSingleSearch = async () => {
    if (!singleSearchInput.trim()) return;
    await searchProducts([singleSearchInput.trim()]);
  };

  const handleBulkSearch = async () => {
    if (searchTerms.length === 0) return;
    await searchProducts(searchTerms);
  };

  const handleClearSearch = () => {
    setBulkSearchInput('');
    setSingleSearchInput('');
    setCsvFile(null);
    setSearchTerms([]);
    setSearchResults([]);
    setSearchStats({ totalSearched: 0, found: 0, notFound: 0 });
    setError(null);
    setSmartSearchActive(false);
    setSearchProgress({ step: '', percentage: 0, isLoading: false });
  };

  const getMatchedByBadge = (matchedBy?: string) => {
    if (!matchedBy) return null;

    const colors = {
      sku: 'blue',
      barcode: 'green',
      title: 'orange',
    };

    return (
      <Badge size="xs" color={colors[matchedBy as keyof typeof colors]} variant="light">
        {matchedBy?.toUpperCase() || 'UNKNOWN'}
      </Badge>
    );
  };

  const formatPrice = (variants: ShopifyProduct['variants'], currency: string = 'INR') => {
    if (!variants || variants.length === 0) return 'N/A';

    const prices = variants.map((v) => parseFloat(v.price)).filter((p) => !isNaN(p));

    if (prices.length === 0) return 'N/A';

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const currencySymbols: { [key: string]: string } = {
      INR: '₹',
    };

    const symbol = currencySymbols[currency] || currency;

    if (minPrice === maxPrice) {
      return `${symbol}${minPrice.toFixed(2)}`;
    }

    return `${symbol}${minPrice.toFixed(2)} - ${symbol}${maxPrice.toFixed(2)}`;
  };

  const getInventoryCount = (variants: ShopifyProduct['variants']) => {
    if (!variants || variants.length === 0) return 0;
    return variants.reduce((total, variant) => total + (variant.inventoryQuantity || 0), 0);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'green',
      draft: 'yellow',
      archived: 'gray',
    };

    const statusLower = status?.toLowerCase() || 'unknown';

    return (
      <Badge size="sm" color={colors[statusLower as keyof typeof colors] || 'gray'} variant="light">
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Custom export configuration for Smart Search results
  const smartSearchExportConfig = {
    columns: [
      {
        key: 'images',
        label: 'Photo',
        width: 20,
        isImage: true,
        formatter: (images: ShopifyProduct['images']) => {
          if (!images || images.length === 0) return '';
          return images[0]?.url || '';
        },
      },
      { key: 'title', label: 'Title', width: 35 },
      {
        key: 'variants',
        label: 'Qty.',
        width: 12,
        formatter: (variants: ShopifyProduct['variants']) => {
          if (!variants || variants.length === 0) return '0';
          return variants
            .reduce((total, variant) => total + (variant.inventoryQuantity || 0), 0)
            .toString();
        },
      },
      {
        key: 'variants',
        label: 'SKU/Barcode',
        width: 20,
        formatter: (variants: ShopifyProduct['variants']) => {
          if (!variants || variants.length === 0) return 'No SKU\nNo Barcode';
          const primaryVariant = variants[0];
          const sku = primaryVariant?.sku || 'No SKU';
          const barcode = primaryVariant?.barcode || 'No Barcode';

          return `${sku}\n${barcode}`;
        },
      },
      {
        key: 'variants',
        label: 'Price',
        width: 13,
        formatter: (variants: ShopifyProduct['variants']) => {
          if (!variants || variants.length === 0) return 'N/A';
          const prices = variants.map((v) => parseFloat(v.price)).filter((p) => !isNaN(p));
          if (prices.length === 0) return 'N/A';
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          return min === max ? `₹${min.toFixed(2)}` : `₹${min.toFixed(2)} - ₹${max.toFixed(2)}`;
        },
      },
    ] as ExportColumn<unknown>[],
  };

  const foundResults = searchResults.filter((r) => r.status === 'found');
  const notFoundResults = searchResults.filter((r) => r.status === 'not-found');

  return (
    <Stack gap="lg">
      {/* Search Input Section */}
      <Paper withBorder radius="md" p="lg" style={{ backgroundColor: '#f8f9fa' }}>
        <Stack gap="md">
          <Group gap="xs" align="center">
            <IconSearch size={22} />
            <Text size="xl" fw={700} style={{ letterSpacing: -0.5 }}>
              Smart Product Search
            </Text>
          </Group>

          <Text size="sm" c="dimmed">
            Search products by SKU, Barcode, or Title keywords. You can search individually or
            upload a CSV file.
          </Text>

          <Tabs defaultValue="single" variant="outline">
            <Tabs.List>
              <Tabs.Tab value="single" leftSection={<IconSearch size={16} />}>
                Single Search
              </Tabs.Tab>
              <Tabs.Tab value="bulk" leftSection={<IconFilter size={16} />}>
                Bulk Search
              </Tabs.Tab>
              <Tabs.Tab value="csv" leftSection={<IconUpload size={16} />}>
                CSV Upload
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="single" pt="md">
              <Stack gap="md">
                <TextInput
                  placeholder="Enter SKU, Barcode, or Title keywords..."
                  value={singleSearchInput}
                  onChange={(e) => setSingleSearchInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSingleSearch()}
                  size="md"
                  leftSection={<IconSearch size={16} />}
                />
                <Group gap="sm">
                  <Button
                    onClick={handleSingleSearch}
                    loading={smartSearchActive}
                    disabled={!singleSearchInput.trim()}
                  >
                    Search Product
                  </Button>
                  {(searchResults.length > 0 || searchTerms.length > 0) && (
                    <Button variant="light" color="gray" onClick={handleClearSearch}>
                      Clear
                    </Button>
                  )}
                </Group>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="bulk" pt="md">
              <Stack gap="md">
                <Textarea
                  placeholder="Enter multiple search terms (one per line)..."
                  value={bulkSearchInput}
                  onChange={(e) => handleBulkSearchInputChange(e.target.value)}
                  minRows={4}
                  maxRows={8}
                  size="md"
                />
                <Group gap="sm">
                  <Button
                    onClick={handleBulkSearch}
                    loading={smartSearchActive}
                    disabled={searchTerms.length === 0}
                  >
                    Search Products ({searchTerms.length} terms)
                  </Button>
                  {(searchResults.length > 0 || searchTerms.length > 0) && (
                    <Button variant="light" color="gray" onClick={handleClearSearch}>
                      Clear
                    </Button>
                  )}
                </Group>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="csv" pt="md">
              <Stack gap="md">
                <FileInput
                  placeholder="Select CSV file..."
                  accept=".csv"
                  value={csvFile}
                  onChange={handleCsvUpload}
                  leftSection={<IconUpload size={16} />}
                  description="CSV can contain SKU, Barcode, or FNSKU columns"
                  size="md"
                />
                {searchTerms.length > 0 && (
                  <Group gap="sm">
                    <Button onClick={handleBulkSearch} loading={smartSearchActive}>
                      Search Products ({searchTerms.length} from CSV)
                    </Button>
                    <Button variant="light" color="gray" onClick={handleClearSearch}>
                      Clear
                    </Button>
                  </Group>
                )}
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Paper>

      {/* Progress Indicator */}
      {searchProgress.isLoading && (
        <Paper withBorder p="md">
          <Group gap="md">
            <Loader size="sm" />
            <Stack gap={4} style={{ flex: 1 }}>
              <Text size="sm" fw={500}>
                {searchProgress.step}
              </Text>
              <div
                style={{
                  width: '100%',
                  height: '4px',
                  backgroundColor: '#e9ecef',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${searchProgress.percentage}%`,
                    height: '100%',
                    backgroundColor: '#228be6',
                    borderRadius: '2px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </Stack>
          </Group>
        </Paper>
      )}

      {/* Error Alert */}
      {error && (
        <Alert color="red" icon={<IconAlertTriangle size={16} />} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Stack gap="lg">
          {/* Summary */}
          <Alert
            color={searchStats.found > 0 ? 'green' : 'orange'}
            title={
              <Group gap={6}>
                <IconInfoCircle size={18} />
                <Text span size="lg" fw={600}>
                  Search Results Summary
                </Text>
              </Group>
            }
          >
            <Text size="sm">
              Found {searchStats.found} products out of {searchStats.totalSearched} search terms
              {searchStats.notFound > 0 && ` (${searchStats.notFound} not found)`}
            </Text>
          </Alert>

          {/* Results Tabs */}
          <Tabs defaultValue="found" variant="outline">
            <Tabs.List>
              <Tabs.Tab value="found" leftSection={<IconCheck size={16} />} color="green">
                Found Products ({foundResults.length})
              </Tabs.Tab>
              {notFoundResults.length > 0 && (
                <Tabs.Tab value="not-found" leftSection={<IconXCircle size={16} />} color="red">
                  Not Found ({notFoundResults.length})
                </Tabs.Tab>
              )}
            </Tabs.List>

            {/* Found Products Tab */}
            <Tabs.Panel value="found" pt="md">
              {foundResults.length > 0 ? (
                <Stack gap="md">
                  <Group justify="space-between">
                    <Group gap="sm">
                      <Tooltip label={`Switch to ${viewMode === 'grid' ? 'table' : 'grid'} view`}>
                        <ActionIcon
                          variant="outline"
                          size="lg"
                          onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                          color="blue"
                        >
                          {viewMode === 'grid' ? (
                            <IconList size={18} />
                          ) : (
                            <IconLayoutGrid size={18} />
                          )}
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                    <ExportButton
                      data={foundResults.map((r) => r.product!)}
                      exportConfig={{
                        ...smartSearchExportConfig,
                        title: 'Smart Search Results - Found Products',
                        subtitle: `${foundResults.length} products found`,
                        filename: 'smart_search_found_products',
                      }}
                      size="sm"
                    />
                  </Group>

                  {viewMode === 'table' ? (
                    <ScrollArea>
                      <Table stickyHeader>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th style={{ minWidth: '60px' }}>Image</Table.Th>
                            <Table.Th style={{ minWidth: '200px' }}>Product</Table.Th>
                            <Table.Th style={{ minWidth: '160px' }}>SKU/Barcode</Table.Th>
                            <Table.Th style={{ minWidth: '100px' }}>Status</Table.Th>
                            <Table.Th style={{ minWidth: '120px' }}>Price</Table.Th>
                            <Table.Th style={{ minWidth: '100px' }}>Stock</Table.Th>
                            <Table.Th style={{ minWidth: '120px' }}>Matched By</Table.Th>
                            <Table.Th style={{ minWidth: '150px' }}>Search Term</Table.Th>
                            <Table.Th style={{ minWidth: '120px' }}>Created</Table.Th>
                            <Table.Th style={{ minWidth: '100px', textAlign: 'center' }}>
                              Actions
                            </Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {foundResults.map((result, index) => {
                            // Show only first variant for primary display, like inventory
                            const primaryVariant = result.product!.variants[0];

                            return (
                              <Table.Tr key={index} style={{ transition: 'all 0.2s ease' }}>
                                <Table.Td>
                                  <SquareImage
                                    src={result.product!.images?.[0]?.url}
                                    alt={
                                      result.product!.images?.[0]?.altText || result.product!.title
                                    }
                                    fallbackIcon="package"
                                  />
                                </Table.Td>
                                <Table.Td>
                                  <Stack gap={2}>
                                    <Text size="sm" fw={500} lineClamp={2}>
                                      {result.product!.title}
                                    </Text>
                                    {result.product!.variants.length > 1 && (
                                      <Text size="xs" c="dimmed">
                                        {result.product!.variants.length} variants
                                      </Text>
                                    )}
                                  </Stack>
                                </Table.Td>
                                <Table.Td>
                                  <Stack gap={2}>
                                    <Text
                                      size="sm"
                                      ff="monospace"
                                      c={primaryVariant?.sku ? undefined : 'dimmed'}
                                      style={{
                                        backgroundColor: !primaryVariant?.sku
                                          ? '#ffeaa7'
                                          : undefined,
                                        padding: !primaryVariant?.sku ? '2px 6px' : undefined,
                                        borderRadius: !primaryVariant?.sku ? '4px' : undefined,
                                      }}
                                    >
                                      {primaryVariant?.sku || 'No SKU'}
                                    </Text>
                                    <Text
                                      size="xs"
                                      ff="monospace"
                                      c="dimmed"
                                      style={{
                                        backgroundColor:
                                          !primaryVariant?.barcode ||
                                          primaryVariant?.barcode.trim() === ''
                                            ? '#ffeaa7'
                                            : undefined,
                                        padding:
                                          !primaryVariant?.barcode ||
                                          primaryVariant?.barcode.trim() === ''
                                            ? '2px 6px'
                                            : undefined,
                                        borderRadius:
                                          !primaryVariant?.barcode ||
                                          primaryVariant?.barcode.trim() === ''
                                            ? '4px'
                                            : undefined,
                                      }}
                                    >
                                      {primaryVariant?.barcode &&
                                      primaryVariant?.barcode.trim() !== ''
                                        ? primaryVariant.barcode
                                        : 'No Barcode'}
                                    </Text>
                                  </Stack>
                                </Table.Td>
                                <Table.Td>{getStatusBadge(result.product!.status)}</Table.Td>
                                <Table.Td>
                                  <Text size="sm" fw={500}>
                                    {formatPrice(result.product!.variants, 'INR')}
                                  </Text>
                                </Table.Td>
                                <Table.Td>
                                  <Text size="sm">
                                    {getInventoryCount(result.product!.variants)}
                                  </Text>
                                </Table.Td>
                                <Table.Td>{getMatchedByBadge(result.matchedBy)}</Table.Td>
                                <Table.Td>
                                  <Text size="sm" c="blue" fw={500}>
                                    "{result.searchTerm}"
                                  </Text>
                                </Table.Td>
                                <Table.Td>
                                  <Text size="sm">{formatDate(result.product!.createdAt)}</Text>
                                </Table.Td>
                                <Table.Td>
                                  <Group gap="xs" justify="center">
                                    <ActionIcon variant="subtle" color="blue" size="sm">
                                      <IconEye size={16} />
                                    </ActionIcon>
                                    <ActionIcon variant="subtle" color="gray" size="sm">
                                      <IconEdit size={16} />
                                    </ActionIcon>
                                  </Group>
                                </Table.Td>
                              </Table.Tr>
                            );
                          })}
                        </Table.Tbody>
                      </Table>
                    </ScrollArea>
                  ) : (
                    <Grid>
                      {foundResults.map((result, index) => (
                        <Grid.Col key={index} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
                          <Card withBorder h="100%" style={{ transition: 'all 0.2s ease' }}>
                            <Stack gap="sm" h="100%">
                              <Center>
                                <SquareImage
                                  src={result.product!.images?.[0]?.url}
                                  alt={
                                    result.product!.images?.[0]?.altText || result.product!.title
                                  }
                                  fallbackIcon="package"
                                />
                              </Center>

                              <Stack gap="xs" style={{ flex: 1 }}>
                                <Text fw={500} size="sm" lineClamp={2}>
                                  {result.product!.title}
                                </Text>

                                <Group justify="space-between" wrap="wrap" gap="xs">
                                  {getStatusBadge(result.product!.status)}
                                  {getMatchedByBadge(result.matchedBy)}
                                </Group>

                                <Stack gap={2}>
                                  <Text size="xs" c="dimmed">
                                    <strong>SKU:</strong>{' '}
                                    <Text component="span" ff="monospace">
                                      {result.product!.variants[0]?.sku || 'No SKU'}
                                    </Text>
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    <strong>Barcode:</strong>{' '}
                                    <Text component="span" ff="monospace">
                                      {result.product!.variants[0]?.barcode &&
                                      result.product!.variants[0]?.barcode.trim() !== ''
                                        ? result.product!.variants[0].barcode
                                        : 'No Barcode'}
                                    </Text>
                                  </Text>
                                </Stack>

                                <Group justify="space-between">
                                  <Text fw={500} size="sm">
                                    {formatPrice(result.product!.variants, 'INR')}
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    {getInventoryCount(result.product!.variants)} in stock
                                  </Text>
                                </Group>

                                <Text size="xs" c="blue" fw={500}>
                                  Search: "{result.searchTerm}"
                                </Text>

                                <Text size="xs" c="dimmed">
                                  Created: {formatDate(result.product!.createdAt)}
                                </Text>
                              </Stack>

                              <Group justify="flex-end" gap="xs">
                                <ActionIcon variant="subtle" color="blue" size="sm">
                                  <IconEye size={16} />
                                </ActionIcon>
                                <ActionIcon variant="subtle" color="gray" size="sm">
                                  <IconEdit size={16} />
                                </ActionIcon>
                              </Group>
                            </Stack>
                          </Card>
                        </Grid.Col>
                      ))}
                    </Grid>
                  )}
                </Stack>
              ) : (
                <Center py="xl">
                  <Stack align="center" gap="md">
                    <IconShoppingBag size={48} color="var(--mantine-color-gray-5)" />
                    <Text size="lg" fw={500} c="dimmed">
                      No products found
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      No products found matching your search criteria
                    </Text>
                  </Stack>
                </Center>
              )}
            </Tabs.Panel>

            {/* Not Found Tab */}
            {notFoundResults.length > 0 && (
              <Tabs.Panel value="not-found" pt="md">
                <Stack gap="xs">
                  {notFoundResults.map((result, index) => (
                    <Paper key={index} withBorder p="md">
                      <Group gap="md" justify="space-between" align="center">
                        <Stack gap={4} style={{ flex: 1 }}>
                          <Text fw={500} size="sm" c="red">
                            "{result.searchTerm}"
                          </Text>
                          <Text size="xs" c="dimmed">
                            No product found matching this search term
                          </Text>
                        </Stack>
                        <Badge size="sm" color="red" variant="light">
                          Not Found
                        </Badge>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </Tabs.Panel>
            )}
          </Tabs>
        </Stack>
      )}
    </Stack>
  );
};

export default SmartSearchProductList;
