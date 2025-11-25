import React, { useState, useCallback } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Alert,
  Progress,
  Card,
  Badge,
  Select,
  Checkbox,
  Box,
  Center,
  rem,
  Table,
  ScrollArea,
  Switch,
  NumberInput,
} from '@mantine/core';
import {
  IconFile,
  IconAlertCircle,
  IconUpload,
  IconCheck,
  IconEye,
  IconDownload,
  IconFileSpreadsheet,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Dropzone } from '@mantine/dropzone';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

interface TableData {
  headers: string[];
  rows: string[][];
  pageNumber: number;
  confidence: number;
}

interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

const PdfToCsv: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [extractedTables, setExtractedTables] = useState<TableData[]>([]);
  const [selectedTables, setSelectedTables] = useState<Set<number>>(new Set());
  const [delimiter, setDelimiter] = useState<string>(',');
  const [includeHeaders, setIncludeHeaders] = useState<boolean>(true);
  const [minConfidence, setMinConfidence] = useState<number>(0.3);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewTableIndex, setPreviewTableIndex] = useState<number | null>(null);
  const [processingProgress, setProcessingProgress] = useState<number>(0);

  const extractTablesFromPdf = useCallback(
    async (pdfFile: File) => {
      setLoading(true);
      setProcessingProgress(0);

      try {
        // Use local worker URL for Vite
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl as string;
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;
        const tables: TableData[] = [];

        setProcessingProgress(10);

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();

          // Debug: Log text content info
          console.log(`Page ${pageNum}: Found ${textContent.items.length} text items`);

          // Simple table detection based on text positioning
          const tableData = detectTablesFromTextContent({ items: textContent.items }, pageNum);

          console.log(`Page ${pageNum}: Detected ${tableData.length} tables`);

          if (tableData.length > 0) {
            tables.push(...tableData);
          }

          setProcessingProgress((pageNum / totalPages) * 80 + 10);
        }

        // Filter tables by confidence
        const filteredTables = tables.filter((table) => table.confidence >= minConfidence);

        // If no tables found with confidence filter, show all detected tables
        const tablesToShow = filteredTables.length > 0 ? filteredTables : tables;

        setExtractedTables(tablesToShow);

        if (tablesToShow.length > 0) {
          // Auto-select all tables
          setSelectedTables(new Set(tablesToShow.map((_, index) => index)));

          notifications.show({
            title: 'Tables Extracted',
            message: `Found ${tablesToShow.length} tables across ${totalPages} pages${filteredTables.length === 0 ? ' (low confidence)' : ''}`,
            color: 'green',
          });
        } else {
          notifications.show({
            title: 'No Tables Found',
            message:
              'No structured data was detected in the PDF. Try adjusting the confidence threshold or check if the PDF contains tables.',
            color: 'orange',
          });
        }
      } catch (error) {
        console.error('Error extracting tables:', error);
        notifications.show({
          title: 'Extraction Failed',
          message: 'Failed to extract tables from PDF. Please try a different file.',
          color: 'red',
        });
      } finally {
        setLoading(false);
        setProcessingProgress(100);
      }
    },
    [minConfidence],
  );

  const handleFileDrop = useCallback(
    async (droppedFiles: File[]) => {
      const pdfFile = droppedFiles.find(
        (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'),
      );

      if (!pdfFile) {
        notifications.show({
          title: 'Invalid File',
          message: 'Please select a PDF file',
          color: 'red',
        });
        return;
      }

      setFile(pdfFile);
      setExtractedTables([]);
      setSelectedTables(new Set());
      setShowPreview(false);
      setProcessingProgress(0);

      // Extract tables from PDF
      await extractTablesFromPdf(pdfFile);
    },
    [extractTablesFromPdf],
  );

  const detectTablesFromTextContent = (
    textContent: { items: unknown[] },
    pageNumber: number,
  ): TableData[] => {
    const tables: TableData[] = [];

    // Group text items by their vertical position (rows)
    const textItems: TextItem[] = (textContent.items as PdfTextItem[])
      .filter((item: PdfTextItem) => 'str' in item)
      .map((item: PdfTextItem) => ({
        text: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height,
      }));

    // Filter out empty or very short text items
    const filteredItems = textItems.filter(
      (item) => item.text.trim().length > 0 && item.text.trim().length < 1000,
    );

    if (filteredItems.length === 0) {
      return tables;
    }

    // Sort by Y position (top to bottom)
    filteredItems.sort((a, b) => b.y - a.y);

    // More flexible table detection: look for aligned text items
    const rowGroups: TextItem[][] = [];
    let currentRow: TextItem[] = [];
    let lastY = -1;
    const yTolerance = 8; // Increased tolerance for better detection

    for (const item of filteredItems) {
      if (lastY === -1 || Math.abs(item.y - lastY) <= yTolerance) {
        currentRow.push(item);
      } else {
        if (currentRow.length > 0) {
          rowGroups.push(currentRow);
        }
        currentRow = [item];
      }
      lastY = item.y;
    }
    if (currentRow.length > 0) {
      rowGroups.push(currentRow);
    }

    // Sort items in each row by X position (left to right)
    rowGroups.forEach((row) => {
      row.sort((a, b) => a.x - b.x);
    });

    // More flexible table detection
    if (rowGroups.length >= 2) {
      // Calculate average items per row
      const avgItemsPerRow = rowGroups.reduce((sum, row) => sum + row.length, 0) / rowGroups.length;

      // Check if rows have reasonable number of items (at least 2 on average)
      if (avgItemsPerRow >= 2) {
        // Use first row as headers if it has more items than average
        const firstRowLength = rowGroups[0].length;
        const useFirstRowAsHeader = firstRowLength >= avgItemsPerRow;

        const headers = useFirstRowAsHeader
          ? rowGroups[0].map((item) => item.text.trim())
          : rowGroups[0].map((_, index) => `Column ${index + 1}`);

        const dataRows = useFirstRowAsHeader ? rowGroups.slice(1) : rowGroups;
        const rows = dataRows.map((row) => row.map((item) => item.text.trim()));

        // Calculate confidence based on structure consistency
        const structureConsistency =
          rowGroups.filter((row) => Math.abs(row.length - avgItemsPerRow) <= 1).length /
          rowGroups.length;

        const confidence = Math.min(0.9, 0.5 + structureConsistency * 0.4);

        if (rows.length > 0) {
          tables.push({
            headers,
            rows,
            pageNumber,
            confidence,
          });
        }
      }
    }

    // If no tables found with strict criteria, try more relaxed detection
    if (tables.length === 0 && rowGroups.length >= 2) {
      // Try to find any structured data
      const allRows = rowGroups.map((row) => row.map((item) => item.text.trim()));

      if (allRows.length >= 2) {
        const headers = allRows[0].map((_, index) => `Column ${index + 1}`);
        const rows = allRows.slice(1);

        tables.push({
          headers,
          rows,
          pageNumber,
          confidence: 0.6, // Lower confidence for relaxed detection
        });
      }
    }

    return tables;
  };

  const convertToCsv = async () => {
    if (selectedTables.size === 0) {
      notifications.show({
        title: 'No Tables Selected',
        message: 'Please select at least one table to convert',
        color: 'orange',
      });
      return;
    }

    setLoading(true);

    try {
      const selectedTableData = Array.from(selectedTables).map((index) => extractedTables[index]);

      let csvContent = '';

      selectedTableData.forEach((table, tableIndex) => {
        if (tableIndex > 0) {
          csvContent += '\n'; // Separate tables with blank line
        }

        if (includeHeaders && table.headers.length > 0) {
          csvContent += table.headers.join(delimiter) + '\n';
        }

        table.rows.forEach((row) => {
          // Escape special characters and wrap in quotes if needed
          const escapedRow = row.map((cell) => {
            const escaped = cell.replace(/"/g, '""');
            return cell.includes(delimiter) || cell.includes('"') || cell.includes('\n')
              ? `"${escaped}"`
              : escaped;
          });
          csvContent += escapedRow.join(delimiter) + '\n';
        });
      });

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${file?.name.replace(/\.pdf$/i, '')}_tables.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      notifications.show({
        title: 'Success!',
        message: `Converted ${selectedTables.size} table(s) to CSV successfully!`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      console.error('Error converting to CSV:', error);
      notifications.show({
        title: 'Conversion Failed',
        message: 'Failed to convert tables to CSV. Please try again.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetTool = () => {
    setFile(null);
    setExtractedTables([]);
    setSelectedTables(new Set());
    setShowPreview(false);
    setPreviewTableIndex(null);
    setProcessingProgress(0);
  };

  const toggleTableSelection = (index: number) => {
    const newSelection = new Set(selectedTables);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedTables(newSelection);
  };

  const selectAllTables = () => {
    setSelectedTables(new Set(extractedTables.map((_, index) => index)));
  };

  const deselectAllTables = () => {
    setSelectedTables(new Set());
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box ta="center">
          <Title order={2} mb="xs">
            <Group justify="center" gap="sm">
              <IconFileSpreadsheet size={32} color="var(--mantine-color-teal-6)" />
              PDF to CSV Converter
            </Group>
          </Title>
          <Text c="dimmed" size="lg">
            Extract tables from PDF files and convert them to CSV format
          </Text>
          <Text c="dimmed" size="sm" mt="xs">
            Upload a PDF file and extract tables for CSV conversion
          </Text>
        </Box>

        <Paper shadow="md" p="xl" radius="lg">
          <Stack gap="xl">
            {/* Upload Area */}
            {!file ? (
              <Dropzone
                onDrop={handleFileDrop}
                accept={{
                  'application/pdf': ['.pdf'],
                }}
                maxSize={50 * 1024 * 1024} // 50MB
              >
                <Center style={{ minHeight: rem(220) }}>
                  <Stack align="center" gap="md">
                    <Box ta="center">
                      <IconUpload size={64} stroke={1.5} color="var(--mantine-color-teal-4)" />
                    </Box>
                    <Stack align="center" gap="xs">
                      <Text size="xl" fw={500}>
                        Drop PDF file here or click to browse
                      </Text>
                      <Text size="sm" c="dimmed">
                        Select a PDF file to extract tables (up to 50MB)
                      </Text>
                      <Text size="xs" c="dimmed">
                        Supports PDF files with tables and structured data
                      </Text>
                    </Stack>
                  </Stack>
                </Center>
              </Dropzone>
            ) : (
              /* File Info */
              <Card shadow="sm" p="lg" radius="md">
                <Group justify="space-between">
                  <Group gap="md">
                    <IconFile size={32} color="var(--mantine-color-teal-6)" />
                    <Box>
                      <Text size="lg" fw={600}>
                        {file.name}
                      </Text>
                      <Group gap="md" mt="xs">
                        <Badge variant="light" color="teal">
                          {extractedTables.length} tables found
                        </Badge>
                        <Badge variant="light" color="blue">
                          {selectedTables.size} selected
                        </Badge>
                        <Badge variant="light" color="gray">
                          {(file.size / 1024 / 1024).toFixed(1)} MB
                        </Badge>
                      </Group>
                    </Box>
                  </Group>
                  <Group gap="sm">
                    <Button
                      variant="outline"
                      leftSection={<IconEye size={16} />}
                      onClick={() => {
                        if (showPreview) {
                          setShowPreview(false);
                          setPreviewTableIndex(null);
                        } else if (extractedTables.length > 0) {
                          setShowPreview(true);
                          setPreviewTableIndex(0); // Show first table by default
                        }
                      }}
                      disabled={extractedTables.length === 0}
                    >
                      {showPreview ? 'Hide' : 'Preview'}
                    </Button>
                    <Button variant="outline" onClick={resetTool}>
                      Change File
                    </Button>
                  </Group>
                </Group>
              </Card>
            )}

            {/* Processing Progress */}
            {loading && (
              <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                <Text size="sm" mb="xs">
                  Extracting tables from PDF... {processingProgress.toFixed(0)}%
                </Text>
                <Progress value={processingProgress} animated />
              </Alert>
            )}

            {/* Table Selection */}
            {file && extractedTables.length > 0 && (
              <Box>
                <Group justify="space-between" mb="md">
                  <Text fw={600} size="lg">
                    Extracted Tables ({extractedTables.length})
                  </Text>
                  <Group gap="sm">
                    <Button variant="outline" size="xs" onClick={selectAllTables}>
                      Select All
                    </Button>
                    <Button variant="outline" size="xs" onClick={deselectAllTables}>
                      Deselect All
                    </Button>
                  </Group>
                </Group>

                <Stack gap="md">
                  {extractedTables.map((table, index) => (
                    <Card
                      key={index}
                      shadow="sm"
                      p="md"
                      radius="md"
                      style={{
                        border: selectedTables.has(index)
                          ? '2px solid var(--mantine-color-teal-6)'
                          : '1px solid var(--mantine-color-gray-3)',
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleTableSelection(index)}
                    >
                      <Group justify="space-between">
                        <Box>
                          <Group gap="md">
                            <Checkbox
                              checked={selectedTables.has(index)}
                              onChange={() => toggleTableSelection(index)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Box>
                              <Text fw={500}>
                                Table {index + 1} (Page {table.pageNumber})
                              </Text>
                              <Text size="sm" c="dimmed">
                                {table.headers.length} columns × {table.rows.length} rows
                              </Text>
                            </Box>
                          </Group>
                        </Box>
                        <Group gap="sm">
                          <Badge variant="light" color="teal">
                            {(table.confidence * 100).toFixed(0)}% confidence
                          </Badge>
                          <Button
                            variant="outline"
                            size="xs"
                            leftSection={<IconEye size={14} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (previewTableIndex === index) {
                                setPreviewTableIndex(null);
                                setShowPreview(false);
                              } else {
                                setPreviewTableIndex(index);
                                setShowPreview(true);
                              }
                            }}
                          >
                            {previewTableIndex === index ? 'Hide' : 'Preview'}
                          </Button>
                        </Group>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Table Preview */}
            {file && extractedTables.length > 0 && showPreview && previewTableIndex !== null && (
              <Box>
                <Text fw={600} size="lg" mb="md">
                  Table Preview
                </Text>
                <ScrollArea.Autosize mah={400}>
                  {(() => {
                    const table = extractedTables[previewTableIndex];
                    if (!table) return null;

                    return (
                      <Card shadow="sm" p="md">
                        <Text fw={500} mb="sm">
                          Table {previewTableIndex + 1} (Page {table.pageNumber})
                        </Text>
                        <Table striped highlightOnHover>
                          <Table.Thead>
                            <Table.Tr>
                              {table.headers.map((header, index) => (
                                <Table.Th key={index} style={{ minWidth: '100px' }}>
                                  {header || `Column ${index + 1}`}
                                </Table.Th>
                              ))}
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {table.rows.slice(0, 10).map((row, rowIndex) => (
                              <Table.Tr key={rowIndex}>
                                {row.map((cell, cellIndex) => (
                                  <Table.Td key={cellIndex} style={{ maxWidth: '200px' }}>
                                    <Text size="sm" truncate>
                                      {cell || '-'}
                                    </Text>
                                  </Table.Td>
                                ))}
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                        {table.rows.length > 10 && (
                          <Text size="xs" c="dimmed" ta="center" mt="xs">
                            ... showing first 10 rows of {table.rows.length} data rows
                          </Text>
                        )}
                      </Card>
                    );
                  })()}
                </ScrollArea.Autosize>
              </Box>
            )}

            {/* Extraction Options */}
            {file && extractedTables.length === 0 && !loading && (
              <Box>
                <Text fw={600} size="lg" mb="md">
                  Extraction Options
                </Text>
                <Group gap="md" grow>
                  <NumberInput
                    label="Minimum Confidence"
                    description="Threshold for table detection (0.1 - 1.0)"
                    value={minConfidence}
                    onChange={(value: number | string) =>
                      setMinConfidence(typeof value === 'number' ? value : 0.7)
                    }
                    min={0.1}
                    max={1.0}
                    step={0.1}
                  />
                  <Button
                    variant="outline"
                    onClick={() => file && extractTablesFromPdf(file)}
                    disabled={!file}
                    mt="auto"
                  >
                    Re-extract
                  </Button>
                </Group>
              </Box>
            )}

            {/* CSV Options */}
            {file && extractedTables.length > 0 && (
              <Box>
                <Text fw={600} size="lg" mb="md">
                  CSV Options
                </Text>
                <Stack gap="md">
                  <Group gap="md" grow>
                    <Select
                      label="Delimiter"
                      description="Character that separates values"
                      value={delimiter}
                      onChange={(value: string | null) => setDelimiter(value || ',')}
                      data={[
                        { value: ',', label: 'Comma (,)' },
                        { value: ';', label: 'Semicolon (;)' },
                        { value: '\t', label: 'Tab' },
                        { value: '|', label: 'Pipe (|)' },
                      ]}
                    />
                    <Switch
                      label="Include Headers"
                      description="Add column headers to CSV output"
                      checked={includeHeaders}
                      onChange={(event) => setIncludeHeaders(event.currentTarget.checked)}
                    />
                  </Group>
                </Stack>
              </Box>
            )}

            {/* Action Button */}
            {file && extractedTables.length > 0 && selectedTables.size > 0 && (
              <Group justify="space-between">
                <Badge variant="outline" size="lg" color="teal">
                  {selectedTables.size} table(s) selected
                </Badge>

                <Button
                  onClick={convertToCsv}
                  loading={loading}
                  size="lg"
                  leftSection={<IconDownload size={20} />}
                >
                  Convert to CSV
                </Button>
              </Group>
            )}

            {/* Tips */}
            {!file && (
              <Alert color="teal" variant="light">
                <Text size="sm" fw={500} mb="xs">
                  💡 Tips for best results:
                </Text>
                <Text size="xs" component="div">
                  • Use PDFs with clear, structured tables
                  <br />
                  • Tables should have consistent formatting
                  <br />
                  • Adjust confidence threshold if tables aren't detected
                  <br />
                  • Preview tables before converting to CSV
                  <br />• Select only the tables you want to convert
                </Text>
              </Alert>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
};

export default PdfToCsv;
