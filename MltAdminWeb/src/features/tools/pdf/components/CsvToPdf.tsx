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
  NumberInput,
  Box,
  Center,
  rem,
  Table,
  ScrollArea,
} from '@mantine/core';
import {
  IconTable,
  IconFile,
  IconAlertCircle,
  IconUpload,
  IconCheck,
  IconEye,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Dropzone } from '@mantine/dropzone';

interface AutoTableOptions {
  head?: string[][];
  body: string[][];
  startY: number;
  styles: {
    fontSize: number;
    cellPadding: number;
    overflow: string;
    halign: string;
    valign: string;
  };
  headStyles: {
    fillColor: number[];
    textColor: number;
    fontSize: number;
    fontStyle: string;
    halign: string;
  };
  alternateRowStyles: {
    fillColor: number[];
  };
  margin: { top: number; right: number; bottom: number; left: number };
  tableWidth: string;
  columnStyles: Record<number, { cellWidth: number }>;
  theme: string;
  showHead: string;
}

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: AutoTableOptions) => jsPDF;
  }
}

const CsvToPdf: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [delimiter, setDelimiter] = useState<string>(',');
  const [hasHeader, setHasHeader] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<number>(9);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const handleFileDrop = useCallback(
    async (droppedFiles: File[]) => {
      const csvFile = droppedFiles.find(
        (file) =>
          file.type === 'text/csv' ||
          file.name.toLowerCase().endsWith('.csv') ||
          file.type === 'application/vnd.ms-excel' ||
          file.type === 'text/plain',
      );

      if (!csvFile) {
        notifications.show({
          title: 'Invalid File',
          message: 'Please select a CSV file',
          color: 'red',
        });
        return;
      }

      setFile(csvFile);
      setCsvData([]);
      setShowPreview(false);

      // Parse CSV using Papa Parse
      try {
        const Papa = (await import('papaparse')).default;
        Papa.parse(csvFile, {
          complete: (results) => {
            if (results.errors.length > 0) {
              console.warn('CSV parsing warnings:', results.errors);
            }

            // Filter out empty rows
            const filteredData = results.data.filter(
              (row: unknown) =>
                Array.isArray(row) &&
                row.some((cell: unknown) => cell && cell.toString().trim() !== ''),
            ) as string[][];

            if (filteredData.length === 0) {
              notifications.show({
                title: 'Empty File',
                message: 'The CSV file appears to be empty or contains no valid data',
                color: 'orange',
              });
              return;
            }

            setCsvData(filteredData);
            notifications.show({
              title: 'CSV Loaded',
              message: `Successfully loaded ${filteredData.length} rows with ${
                filteredData[0]?.length || 0
              } columns`,
              color: 'green',
            });
          },
          error: (error) => {
            console.error('CSV parsing error:', error);
            notifications.show({
              title: 'Parse Error',
              message: 'Failed to parse CSV file. Please check the file format.',
              color: 'red',
            });
          },
          delimiter: delimiter === 'auto' ? '' : delimiter,
          skipEmptyLines: true,
          transformHeader: undefined,
          dynamicTyping: false,
        });
      } catch (_error) {
        console.error('Error reading CSV:', _error);
        notifications.show({
          title: 'Error',
          message: 'Failed to read CSV file',
          color: 'red',
        });
      }
    },
    [delimiter],
  );

  const reparseWithNewDelimiter = useCallback(() => {
    if (!file) return;
    handleFileDrop([file]);
  }, [file, handleFileDrop]);

  const convertToPdf = async () => {
    if (!file || csvData.length === 0) return;

    setLoading(true);

    try {
      // Dynamically import jsPDF
      const { default: jsPDFConstructor } = await import('jspdf');

      const doc = new jsPDFConstructor({
        orientation: orientation,
        unit: 'mm',
        format: 'a4',
      });

      // Prepare data for autoTable
      const tableData = csvData.slice(hasHeader ? 1 : 0);
      const headers =
        hasHeader && csvData.length > 0
          ? csvData[0]
          : csvData[0]?.map((_, index) => `Column ${index + 1}`) || [];

      // Add title and metadata
      doc.setFontSize(16);
      doc.text('CSV Data Export', 20, 20);

      doc.setFontSize(10);
      doc.text(`Source: ${file.name}`, 20, 30);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 36);
      doc.text(`Rows: ${tableData.length} | Columns: ${headers.length}`, 20, 42);

      // Calculate column widths based on orientation
      const pageWidth = orientation === 'portrait' ? 170 : 257; // A4 width minus margins
      const columnWidth = Math.max(15, Math.min(50, pageWidth / headers.length));

      // Create table with better styling
      doc.autoTable({
        head: headers.length > 0 ? [headers] : undefined,
        body: tableData,
        startY: 50,
        styles: {
          fontSize: fontSize,
          cellPadding: 2,
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle',
        },
        headStyles: {
          fillColor: [41, 128, 185], // Professional blue
          textColor: 255,
          fontSize: fontSize + 1,
          fontStyle: 'bold',
          halign: 'center',
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250], // Light gray
        },
        margin: { top: 50, right: 15, bottom: 20, left: 15 },
        tableWidth: 'auto',
        columnStyles: headers.reduce(
          (acc, _, index) => {
            acc[index] = { cellWidth: columnWidth };
            return acc;
          },
          {} as Record<number, { cellWidth: number }>,
        ),
        theme: 'striped',
        showHead: 'everyPage',
      });

      // Save the PDF
      const fileName = `${file.name.replace(/\.csv$/i, '')}_table_export.pdf`;
      doc.save(fileName);

      notifications.show({
        title: 'Success!',
        message: 'CSV converted to PDF successfully!',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (_error) {
      console.error('Error converting to PDF:', _error);
      notifications.show({
        title: 'Conversion Failed',
        message:
          'Failed to convert CSV to PDF. Please try with a smaller file or different settings.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetTool = () => {
    setFile(null);
    setCsvData([]);
    setShowPreview(false);
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box ta="center">
          <Title order={2} mb="xs">
            <Group justify="center" gap="sm">
              <IconTable size={32} color="var(--mantine-color-teal-6)" />
              CSV to PDF Converter
            </Group>
          </Title>
          <Text c="dimmed" size="lg">
            Convert CSV files to PDF format with customizable table formatting
          </Text>
          <Text c="dimmed" size="sm" mt="xs">
            Upload a CSV file and customize the output appearance
          </Text>
        </Box>

        <Paper shadow="md" p="xl" radius="lg">
          <Stack gap="xl">
            {/* Upload Area */}
            {!file ? (
              <Dropzone
                onDrop={handleFileDrop}
                accept={{
                  'text/csv': ['.csv'],
                  'application/vnd.ms-excel': ['.csv'],
                  'text/plain': ['.csv'],
                }}
                maxSize={10 * 1024 * 1024} // 10MB
              >
                <Center style={{ minHeight: rem(220) }}>
                  <Stack align="center" gap="md">
                    <Box ta="center">
                      <IconUpload size={64} stroke={1.5} color="var(--mantine-color-teal-4)" />
                    </Box>
                    <Stack align="center" gap="xs">
                      <Text size="xl" fw={500}>
                        Drop CSV file here or click to browse
                      </Text>
                      <Text size="sm" c="dimmed">
                        Select a CSV file to convert (up to 10MB)
                      </Text>
                      <Text size="xs" c="dimmed">
                        Supports comma, semicolon, tab, and pipe delimited files
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
                          {csvData.length} rows
                        </Badge>
                        <Badge variant="light" color="blue">
                          {csvData[0]?.length || 0} columns
                        </Badge>
                        <Badge variant="light" color="gray">
                          {(file.size / 1024).toFixed(1)} KB
                        </Badge>
                      </Group>
                    </Box>
                  </Group>
                  <Group gap="sm">
                    <Button
                      variant="outline"
                      leftSection={<IconEye size={16} />}
                      onClick={() => setShowPreview(!showPreview)}
                      disabled={csvData.length === 0}
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

            {/* Data Preview */}
            {file && csvData.length > 0 && showPreview && (
              <Box>
                <Text fw={600} size="lg" mb="md">
                  Data Preview
                </Text>
                <Card shadow="sm" p="md">
                  <ScrollArea.Autosize mah={300}>
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        {hasHeader && csvData[0] && (
                          <Table.Tr>
                            {csvData[0].map((header, index) => (
                              <Table.Th key={index} style={{ minWidth: '100px' }}>
                                {header || `Column ${index + 1}`}
                              </Table.Th>
                            ))}
                          </Table.Tr>
                        )}
                      </Table.Thead>
                      <Table.Tbody>
                        {csvData
                          .slice(hasHeader ? 1 : 0, (hasHeader ? 1 : 0) + 5)
                          .map((row, rowIndex) => (
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
                    {csvData.length > (hasHeader ? 6 : 5) && (
                      <Text size="xs" c="dimmed" ta="center" mt="xs">
                        ... showing first 5 rows of{' '}
                        {hasHeader ? csvData.length - 1 : csvData.length} data rows
                      </Text>
                    )}
                  </ScrollArea.Autosize>
                </Card>
              </Box>
            )}

            {/* Parsing Options */}
            {file && (
              <Box>
                <Text fw={600} size="lg" mb="md">
                  Parsing Options
                </Text>
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
                      { value: 'auto', label: 'Auto-detect' },
                    ]}
                  />
                  <Button
                    variant="outline"
                    onClick={reparseWithNewDelimiter}
                    disabled={!file}
                    mt="auto"
                  >
                    Re-parse
                  </Button>
                </Group>
              </Box>
            )}

            {/* Conversion Options */}
            {file && csvData.length > 0 && (
              <Box>
                <Text fw={600} size="lg" mb="md">
                  PDF Options
                </Text>
                <Stack gap="md">
                  <Group gap="md" grow>
                    <Select
                      label="Page Orientation"
                      description="Layout orientation"
                      value={orientation}
                      onChange={(value: string | null) =>
                        setOrientation((value as 'portrait' | 'landscape') || 'landscape')
                      }
                      data={[
                        {
                          value: 'portrait',
                          label: 'Portrait (Fewer columns)',
                        },
                        {
                          value: 'landscape',
                          label: 'Landscape (More columns)',
                        },
                      ]}
                    />
                    <NumberInput
                      label="Font Size"
                      description="Text size in points"
                      value={fontSize}
                      onChange={(value: number | string) =>
                        setFontSize(typeof value === 'number' ? value : 9)
                      }
                      min={6}
                      max={14}
                    />
                  </Group>

                  <Checkbox
                    checked={hasHeader}
                    onChange={(event) => setHasHeader(event.currentTarget.checked)}
                    label={
                      <Box>
                        <Text fw={500}>First row contains headers</Text>
                        <Text size="sm" c="dimmed">
                          Use first row as column headers with special styling
                        </Text>
                      </Box>
                    }
                  />
                </Stack>
              </Box>
            )}

            {/* Action Button */}
            {file && csvData.length > 0 && (
              <Group justify="space-between">
                <Badge variant="outline" size="lg" color="teal">
                  {hasHeader ? csvData.length - 1 : csvData.length} data rows ×{' '}
                  {csvData[0]?.length || 0} columns
                </Badge>

                <Button
                  onClick={convertToPdf}
                  loading={loading}
                  size="lg"
                  leftSection={<IconTable size={20} />}
                >
                  Convert to PDF
                </Button>
              </Group>
            )}

            {/* Loading State */}
            {loading && (
              <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                <Text size="sm" mb="xs">
                  Converting CSV to PDF... Processing {csvData.length} rows
                </Text>
                <Progress value={50} animated />
              </Alert>
            )}

            {/* Tips */}
            {!file && (
              <Alert color="teal" variant="light">
                <Text size="sm" fw={500} mb="xs">
                  💡 Tips for best results:
                </Text>
                <Text size="xs" component="div">
                  • Use clean CSV files with consistent formatting
                  <br />
                  • Landscape orientation works better for wide tables
                  <br />
                  • Smaller font sizes fit more data per page
                  <br />
                  • Auto-detect delimiter works for most files
                  <br />• Preview your data before converting
                </Text>
              </Alert>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
};

export default CsvToPdf;
