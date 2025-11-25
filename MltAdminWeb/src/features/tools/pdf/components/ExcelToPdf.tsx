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
  IconFileSpreadsheet,
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

const ExcelToPdf: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [excelData, setExcelData] = useState<string[][]>([]);
  const [worksheets, setWorksheets] = useState<string[]>([]);
  const [selectedWorksheet, setSelectedWorksheet] = useState<string>('');
  const [hasHeader, setHasHeader] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<number>(8);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const handleFileDrop = useCallback(async (droppedFiles: File[]) => {
    const excelFile = droppedFiles.find(
      (file) =>
        file.name.toLowerCase().endsWith('.xlsx') ||
        file.name.toLowerCase().endsWith('.xls') ||
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel',
    );

    if (!excelFile) {
      notifications.show({
        title: 'Invalid File',
        message: 'Please select an Excel file (.xlsx or .xls)',
        color: 'red',
      });
      return;
    }

    setFile(excelFile);
    setExcelData([]);
    setWorksheets([]);
    setSelectedWorksheet('');
    setShowPreview(false);

    // Parse Excel file
    try {
      // Dynamically import XLSX
      const XLSX = await import('xlsx');

      const arrayBuffer = await excelFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Get worksheet names
      const sheetNames = workbook.SheetNames;

      if (sheetNames.length === 0) {
        notifications.show({
          title: 'Empty Workbook',
          message: 'The Excel file contains no worksheets',
          color: 'orange',
        });
        return;
      }

      setWorksheets(sheetNames);
      setSelectedWorksheet(sheetNames[0]);

      // Parse first worksheet by default
      const worksheet = workbook.Sheets[sheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        raw: false,
      });

      // Filter out empty rows and convert to strings
      const filteredData = jsonData
        .filter(
          (row: unknown) =>
            Array.isArray(row) &&
            row.some(
              (cell: unknown) =>
                cell !== null && cell !== undefined && cell.toString().trim() !== '',
            ),
        )
        .map((row: unknown) =>
          (row as unknown[]).map((cell: unknown) => cell?.toString() || ''),
        ) as string[][];

      if (filteredData.length === 0) {
        notifications.show({
          title: 'Empty Worksheet',
          message: `Worksheet "${sheetNames[0]}" appears to be empty`,
          color: 'orange',
        });
        return;
      }

      setExcelData(filteredData);

      notifications.show({
        title: 'Excel File Loaded',
        message: `Successfully loaded "${sheetNames[0]}" with ${
          filteredData.length
        } rows and ${filteredData[0]?.length || 0} columns`,
        color: 'green',
      });
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      notifications.show({
        title: 'Parse Error',
        message:
          'Failed to parse Excel file. It may be corrupted, password-protected, or in an unsupported format.',
        color: 'red',
      });
      setFile(null);
    }
  }, []);

  const handleWorksheetChange = useCallback(
    async (worksheetName: string) => {
      if (!file || !worksheetName) return;

      setSelectedWorksheet(worksheetName);
      setExcelData([]);
      setShowPreview(false);

      try {
        const XLSX = await import('xlsx');
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets[worksheetName];

        if (!worksheet) {
          notifications.show({
            title: 'Worksheet Not Found',
            message: `Worksheet "${worksheetName}" could not be found`,
            color: 'red',
          });
          return;
        }

        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          raw: false,
        });

        const filteredData = jsonData
          .filter(
            (row: unknown) =>
              Array.isArray(row) &&
              row.some(
                (cell: unknown) =>
                  cell !== null && cell !== undefined && cell.toString().trim() !== '',
              ),
          )
          .map((row: unknown) =>
            (row as unknown[]).map((cell: unknown) => cell?.toString() || ''),
          ) as string[][];

        setExcelData(filteredData);

        if (filteredData.length > 0) {
          notifications.show({
            title: 'Worksheet Switched',
            message: `Loaded "${worksheetName}" with ${filteredData.length} rows`,
            color: 'blue',
          });
        } else {
          notifications.show({
            title: 'Empty Worksheet',
            message: `Worksheet "${worksheetName}" appears to be empty`,
            color: 'orange',
          });
        }
      } catch (error) {
        console.error('Error switching worksheet:', error);
        notifications.show({
          title: 'Error',
          message: 'Failed to load worksheet data',
          color: 'red',
        });
      }
    },
    [file],
  );

  const convertToPdf = async () => {
    if (!file || excelData.length === 0) return;

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
      const tableData = excelData.slice(hasHeader ? 1 : 0);
      const headers =
        hasHeader && excelData.length > 0
          ? excelData[0]
          : excelData[0]?.map((_, index) => `Column ${index + 1}`) || [];

      // Add title and metadata
      doc.setFontSize(16);
      doc.text('Excel Data Export', 20, 20);

      doc.setFontSize(10);
      doc.text(`Source: ${file.name}`, 20, 30);
      if (selectedWorksheet) {
        doc.text(`Worksheet: ${selectedWorksheet}`, 20, 36);
      }
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 42);
      doc.text(`Rows: ${tableData.length} | Columns: ${headers.length}`, 20, 48);

      // Calculate column widths based on orientation and number of columns
      const pageWidth = orientation === 'portrait' ? 170 : 257; // A4 width minus margins
      const columnWidth = Math.max(12, Math.min(45, pageWidth / headers.length));

      // Create table with professional styling
      doc.autoTable({
        head: headers.length > 0 ? [headers] : undefined,
        body: tableData,
        startY: 55,
        styles: {
          fontSize: fontSize,
          cellPadding: 1.5,
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle',
        },
        headStyles: {
          fillColor: [52, 152, 219], // Professional blue
          textColor: 255,
          fontSize: fontSize + 1,
          fontStyle: 'bold',
          halign: 'center',
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250], // Very light gray
        },
        margin: { top: 55, right: 12, bottom: 20, left: 12 },
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

      // Save the PDF with descriptive filename
      const baseFileName = file.name.replace(/\.(xlsx|xls)$/i, '');
      const worksheetSuffix = selectedWorksheet
        ? `_${selectedWorksheet.replace(/[^a-zA-Z0-9]/g, '_')}`
        : '';
      const fileName = `${baseFileName}${worksheetSuffix}_export.pdf`;
      doc.save(fileName);

      notifications.show({
        title: 'Success!',
        message: 'Excel file converted to PDF successfully!',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      console.error('Error converting to PDF:', error);
      notifications.show({
        title: 'Conversion Failed',
        message:
          'Failed to convert Excel to PDF. Please try with a smaller dataset or different settings.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetTool = () => {
    setFile(null);
    setExcelData([]);
    setWorksheets([]);
    setSelectedWorksheet('');
    setShowPreview(false);
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box ta="center">
          <Title order={2} mb="xs">
            <Group justify="center" gap="sm">
              <IconFileSpreadsheet size={32} color="var(--mantine-color-green-6)" />
              Excel to PDF Converter
            </Group>
          </Title>
          <Text c="dimmed" size="lg">
            Convert Excel files (.xlsx/.xls) to PDF format with customizable table formatting
          </Text>
          <Text c="dimmed" size="sm" mt="xs">
            Upload an Excel file, select a worksheet, and customize the output
          </Text>
        </Box>

        <Paper shadow="md" p="xl" radius="lg">
          <Stack gap="xl">
            {/* Upload Area */}
            {!file ? (
              <Dropzone
                onDrop={handleFileDrop}
                accept={{
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                  'application/vnd.ms-excel': ['.xls'],
                }}
                maxSize={25 * 1024 * 1024} // 25MB
              >
                <Center style={{ minHeight: rem(220) }}>
                  <Stack align="center" gap="md">
                    <Box ta="center">
                      <IconUpload size={64} stroke={1.5} color="var(--mantine-color-green-4)" />
                    </Box>
                    <Stack align="center" gap="xs">
                      <Text size="xl" fw={500}>
                        Drop Excel file here or click to browse
                      </Text>
                      <Text size="sm" c="dimmed">
                        Select an Excel file to convert (up to 25MB)
                      </Text>
                      <Text size="xs" c="dimmed">
                        Supports .xlsx and .xls formats with multiple worksheets
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
                    <IconFile size={32} color="var(--mantine-color-green-6)" />
                    <Box>
                      <Text size="lg" fw={600}>
                        {file.name}
                      </Text>
                      <Group gap="md" mt="xs">
                        <Badge variant="light" color="green">
                          {excelData.length} rows
                        </Badge>
                        <Badge variant="light" color="blue">
                          {excelData[0]?.length || 0} columns
                        </Badge>
                        <Badge variant="light" color="purple">
                          {worksheets.length} worksheet
                          {worksheets.length !== 1 ? 's' : ''}
                        </Badge>
                        <Badge variant="light" color="gray">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </Badge>
                      </Group>
                    </Box>
                  </Group>
                  <Group gap="sm">
                    <Button
                      variant="outline"
                      leftSection={<IconEye size={16} />}
                      onClick={() => setShowPreview(!showPreview)}
                      disabled={excelData.length === 0}
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

            {/* Worksheet Selection */}
            {file && worksheets.length > 0 && (
              <Box>
                <Text fw={600} size="lg" mb="md">
                  Worksheet Selection
                </Text>
                <Group gap="md">
                  <Select
                    label="Select Worksheet"
                    description={`Choose from ${
                      worksheets.length
                    } available worksheet${worksheets.length !== 1 ? 's' : ''}`}
                    value={selectedWorksheet}
                    onChange={(value) => value && handleWorksheetChange(value)}
                    data={worksheets.map((name) => ({
                      value: name,
                      label: name,
                    }))}
                    style={{ flex: 1 }}
                  />
                  {worksheets.length > 1 && (
                    <Badge variant="outline" color="blue" size="lg" mt="auto">
                      {worksheets.length} sheets available
                    </Badge>
                  )}
                </Group>
              </Box>
            )}

            {/* Data Preview */}
            {file && excelData.length > 0 && showPreview && (
              <Box>
                <Text fw={600} size="lg" mb="md">
                  Data Preview
                </Text>
                <Card shadow="sm" p="md">
                  <ScrollArea.Autosize mah={350}>
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        {hasHeader && excelData[0] && (
                          <Table.Tr>
                            {excelData[0].map((header, index) => (
                              <Table.Th key={index} style={{ minWidth: '120px' }}>
                                {header || `Column ${index + 1}`}
                              </Table.Th>
                            ))}
                          </Table.Tr>
                        )}
                      </Table.Thead>
                      <Table.Tbody>
                        {excelData
                          .slice(hasHeader ? 1 : 0, (hasHeader ? 1 : 0) + 8)
                          .map((row, rowIndex) => (
                            <Table.Tr key={rowIndex}>
                              {row.map((cell, cellIndex) => (
                                <Table.Td key={cellIndex} style={{ maxWidth: '250px' }}>
                                  <Text size="sm" truncate>
                                    {cell || '-'}
                                  </Text>
                                </Table.Td>
                              ))}
                            </Table.Tr>
                          ))}
                      </Table.Tbody>
                    </Table>
                    {excelData.length > (hasHeader ? 9 : 8) && (
                      <Text size="xs" c="dimmed" ta="center" mt="xs">
                        ... showing first 8 rows of{' '}
                        {hasHeader ? excelData.length - 1 : excelData.length} data rows
                      </Text>
                    )}
                  </ScrollArea.Autosize>
                </Card>
              </Box>
            )}

            {/* Conversion Options */}
            {file && excelData.length > 0 && (
              <Box>
                <Text fw={600} size="lg" mb="md">
                  PDF Options
                </Text>
                <Stack gap="md">
                  <Group gap="md" grow>
                    <Select
                      label="Page Orientation"
                      description="Layout orientation for the PDF"
                      value={orientation}
                      onChange={(value: string | null) =>
                        setOrientation((value as 'portrait' | 'landscape') || 'landscape')
                      }
                      data={[
                        {
                          value: 'portrait',
                          label: 'Portrait (Better for few columns)',
                        },
                        {
                          value: 'landscape',
                          label: 'Landscape (Better for many columns)',
                        },
                      ]}
                    />
                    <NumberInput
                      label="Font Size"
                      description="Text size in points (smaller = more data)"
                      value={fontSize}
                      onChange={(value: number | string) =>
                        setFontSize(typeof value === 'number' ? value : 8)
                      }
                      min={6}
                      max={12}
                    />
                  </Group>

                  <Checkbox
                    checked={hasHeader}
                    onChange={(event) => setHasHeader(event.currentTarget.checked)}
                    label={
                      <Box>
                        <Text fw={500}>First row contains headers</Text>
                        <Text size="sm" c="dimmed">
                          Use first row as column headers with special formatting
                        </Text>
                      </Box>
                    }
                  />
                </Stack>
              </Box>
            )}

            {/* Action Button */}
            {file && excelData.length > 0 && (
              <Group justify="space-between">
                <Badge variant="outline" size="lg" color="green">
                  {hasHeader ? excelData.length - 1 : excelData.length} data rows ×{' '}
                  {excelData[0]?.length || 0} columns
                  {selectedWorksheet && ` (${selectedWorksheet})`}
                </Badge>

                <Button
                  onClick={convertToPdf}
                  loading={loading}
                  size="lg"
                  leftSection={<IconFileSpreadsheet size={20} />}
                >
                  Convert to PDF
                </Button>
              </Group>
            )}

            {/* Loading State */}
            {loading && (
              <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                <Text size="sm" mb="xs">
                  Converting Excel to PDF... Processing {excelData.length} rows from "
                  {selectedWorksheet}"
                </Text>
                <Progress value={50} animated />
              </Alert>
            )}

            {/* Tips */}
            {!file && (
              <Alert color="green" variant="light">
                <Text size="sm" fw={500} mb="xs">
                  💡 Tips for Excel conversion:
                </Text>
                <Text size="xs" component="div">
                  • Works with both .xlsx and .xls files
                  <br />
                  • Multiple worksheets are supported - switch between them
                  <br />
                  • Landscape orientation fits more columns
                  <br />
                  • Smaller font sizes allow more data per page
                  <br />
                  • Large datasets may take longer to process
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

export default ExcelToPdf;
