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
  NumberInput,
  Radio,
  Divider,
  Box,
  Center,
  rem,
  Switch,
} from '@mantine/core';
import {
  IconCut,
  IconDownload,
  IconFile,
  IconAlertCircle,
  IconCheck,
  IconUpload,
  IconFileZip,
  IconFiles,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Dropzone, PDF_MIME_TYPE } from '@mantine/dropzone';
import JSZip from 'jszip';

const SplitPdf: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [splitType, setSplitType] = useState<'all' | 'range'>('all');
  const [startPage, setStartPage] = useState<number>(1);
  const [endPage, setEndPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [splitPdfs, setSplitPdfs] = useState<{ blob: Blob; name: string }[]>([]);
  const [downloadAsZip, setDownloadAsZip] = useState<boolean>(true);

  const handleFileDrop = useCallback(async (droppedFiles: File[]) => {
    const pdfFile = droppedFiles.find((file) => file.type === 'application/pdf');

    if (!pdfFile) {
      notifications.show({
        title: 'Invalid File',
        message: 'Please select a PDF file',
        color: 'red',
      });
      return;
    }

    setFile(pdfFile);
    setSplitPdfs([]); // Clear previous results

    // Get page count
    try {
      const { PDFDocument } = await import('pdf-lib');
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pageCount = pdf.getPageCount();
      setTotalPages(pageCount);
      setEndPage(pageCount);

      notifications.show({
        title: 'PDF Loaded',
        message: `Successfully loaded PDF with ${pageCount} pages`,
        color: 'green',
      });
    } catch (error) {
      console.error('Error reading PDF:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to read PDF file. It may be corrupted or password-protected.',
        color: 'red',
      });
      setFile(null);
    }
  }, []);

  const splitPdf = async () => {
    if (!file) return;

    setLoading(true);
    setSplitPdfs([]);

    try {
      const { PDFDocument } = await import('pdf-lib');
      const arrayBuffer = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(arrayBuffer);

      const splits: { blob: Blob; name: string }[] = [];

      if (splitType === 'all') {
        // Split into individual pages
        for (let i = 0; i < totalPages; i++) {
          const newPdf = await PDFDocument.create();
          const [copiedPage] = await newPdf.copyPages(sourcePdf, [i]);
          newPdf.addPage(copiedPage);

          const pdfBytes = await newPdf.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          splits.push({
            blob,
            name: `${file.name.replace('.pdf', '')}_page_${String(i + 1).padStart(3, '0')}.pdf`,
          });
        }
      } else {
        // Split by range
        const start = Math.max(0, startPage - 1);
        const end = Math.min(totalPages - 1, endPage - 1);

        if (start > end) {
          notifications.show({
            title: 'Invalid Range',
            message: 'Start page must be less than or equal to end page',
            color: 'red',
          });
          return;
        }

        const newPdf = await PDFDocument.create();
        const pageIndices = [];
        for (let i = start; i <= end; i++) {
          pageIndices.push(i);
        }
        const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
        copiedPages.forEach((page) => newPdf.addPage(page));

        const pdfBytes = await newPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        splits.push({
          blob,
          name: `${file.name.replace('.pdf', '')}_pages_${startPage}-${endPage}.pdf`,
        });
      }

      setSplitPdfs(splits);

      notifications.show({
        title: 'Success!',
        message: `PDF split into ${splits.length} file${splits.length > 1 ? 's' : ''}!`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      console.error('Error splitting PDF:', error);
      notifications.show({
        title: 'Split Failed',
        message: 'Failed to split PDF. Please ensure the file is a valid PDF document.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadSinglePdf = (split: { blob: Blob; name: string }) => {
    const url = URL.createObjectURL(split.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = split.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadAsZipFile = async () => {
    if (splitPdfs.length === 0) return;

    try {
      const zip = new JSZip();

      // Add all PDFs to zip
      splitPdfs.forEach((split) => {
        zip.file(split.name, split.blob);
      });

      // Generate zip file
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      // Download zip
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file!.name.replace('.pdf', '')}_split_pages.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      notifications.show({
        title: 'Download Started',
        message: `Downloading ${splitPdfs.length} files as ZIP archive`,
        color: 'blue',
      });
    } catch (error) {
      console.error('Error creating zip:', error);
      notifications.show({
        title: 'Download Failed',
        message: 'Failed to create ZIP file. Try downloading files individually.',
        color: 'red',
      });
    }
  };

  const downloadAllSeparately = () => {
    splitPdfs.forEach((split, index) => {
      setTimeout(() => downloadSinglePdf(split), index * 100); // Small delay between downloads
    });

    notifications.show({
      title: 'Downloads Started',
      message: `Starting ${splitPdfs.length} individual downloads`,
      color: 'blue',
    });
  };

  const resetTool = () => {
    setFile(null);
    setSplitPdfs([]);
    setTotalPages(0);
    setStartPage(1);
    setEndPage(1);
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box ta="center">
          <Title order={2} mb="xs">
            <Group justify="center" gap="sm">
              <IconCut size={32} color="var(--mantine-color-orange-6)" />
              Split PDF File
            </Group>
          </Title>
          <Text c="dimmed" size="lg">
            Split a PDF file into individual pages or extract specific page ranges
          </Text>
          <Text c="dimmed" size="sm" mt="xs">
            Upload a PDF and choose how you want to split it
          </Text>
        </Box>

        <Paper shadow="md" p="xl" radius="lg">
          <Stack gap="xl">
            {/* Upload Area */}
            {!file ? (
              <Dropzone
                onDrop={handleFileDrop}
                accept={PDF_MIME_TYPE}
                maxSize={100 * 1024 * 1024} // 100MB
              >
                <Center style={{ minHeight: rem(220) }}>
                  <Stack align="center" gap="md">
                    <Box ta="center">
                      <IconUpload size={64} stroke={1.5} color="var(--mantine-color-orange-4)" />
                    </Box>
                    <Stack align="center" gap="xs">
                      <Text size="xl" fw={500}>
                        Drop PDF file here or click to browse
                      </Text>
                      <Text size="sm" c="dimmed">
                        Select a PDF file to split (up to 100MB)
                      </Text>
                      <Text size="xs" c="dimmed">
                        Supports password-protected PDFs
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
                    <IconFile size={32} color="var(--mantine-color-red-6)" />
                    <Box>
                      <Text size="lg" fw={600}>
                        {file.name}
                      </Text>
                      <Group gap="md" mt="xs">
                        <Badge variant="light" color="blue">
                          {totalPages} pages
                        </Badge>
                        <Badge variant="light" color="gray">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </Badge>
                      </Group>
                    </Box>
                  </Group>
                  <Button variant="outline" onClick={resetTool}>
                    Change File
                  </Button>
                </Group>
              </Card>
            )}

            {/* Split Options */}
            {file && totalPages > 0 && (
              <>
                <Divider />

                <Box>
                  <Text size="xl" fw={600} mb="lg">
                    Split Options
                  </Text>
                  <Stack gap="lg">
                    <Radio.Group
                      value={splitType}
                      onChange={(value: string) => setSplitType(value as 'all' | 'range')}
                    >
                      <Stack gap="md">
                        <Radio
                          value="all"
                          label={
                            <Box>
                              <Text fw={500}>Split into individual pages</Text>
                              <Text size="sm" c="dimmed">
                                Create {totalPages} separate PDF files, one for each page
                              </Text>
                            </Box>
                          }
                        />
                        <Radio
                          value="range"
                          label={
                            <Box>
                              <Text fw={500}>Extract specific page range</Text>
                              <Text size="sm" c="dimmed">
                                Create one PDF file with selected pages
                              </Text>
                            </Box>
                          }
                        />
                      </Stack>
                    </Radio.Group>

                    {splitType === 'range' && (
                      <Group gap="md" grow>
                        <NumberInput
                          label="Start Page"
                          description={`Page 1 to ${totalPages}`}
                          value={startPage}
                          onChange={(value: number | string) =>
                            setStartPage(typeof value === 'number' ? value : 1)
                          }
                          min={1}
                          max={totalPages}
                        />
                        <NumberInput
                          label="End Page"
                          description={`Page ${startPage} to ${totalPages}`}
                          value={endPage}
                          onChange={(value: number | string) =>
                            setEndPage(typeof value === 'number' ? value : totalPages)
                          }
                          min={startPage}
                          max={totalPages}
                        />
                      </Group>
                    )}
                  </Stack>
                </Box>

                {/* Download Options */}
                <Box>
                  <Text size="xl" fw={600} mb="lg">
                    Download Options
                  </Text>
                  <Switch
                    checked={downloadAsZip}
                    onChange={(event) => setDownloadAsZip(event.currentTarget.checked)}
                    label={
                      <Box>
                        <Text fw={500}>Download as ZIP file (Recommended)</Text>
                        <Text size="sm" c="dimmed">
                          All files in one convenient archive
                        </Text>
                      </Box>
                    }
                    size="md"
                  />
                </Box>

                {/* Action Button */}
                <Group justify="space-between">
                  <Badge variant="outline" size="lg" color="orange">
                    {splitType === 'all'
                      ? `Will create ${totalPages} files`
                      : `Will create 1 file (${Math.max(0, endPage - startPage + 1)} pages)`}
                  </Badge>

                  <Button
                    onClick={splitPdf}
                    loading={loading}
                    size="lg"
                    leftSection={<IconCut size={20} />}
                  >
                    Split PDF
                  </Button>
                </Group>
              </>
            )}

            {/* Loading State */}
            {loading && (
              <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                <Text size="sm" mb="xs">
                  Splitting PDF... Processing{' '}
                  {splitType === 'all' ? totalPages : Math.max(0, endPage - startPage + 1)} page
                  {(splitType === 'all' && totalPages > 1) ||
                  (splitType === 'range' && endPage - startPage > 0)
                    ? 's'
                    : ''}
                </Text>
                <Progress value={50} animated />
              </Alert>
            )}

            {/* Success State */}
            {splitPdfs.length > 0 && (
              <Alert icon={<IconCheck size={16} />} color="green" variant="light">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Box>
                      <Text size="lg" fw={600} mb="xs">
                        PDF split successfully!
                      </Text>
                      <Text size="sm" c="dimmed">
                        Created {splitPdfs.length} file{splitPdfs.length > 1 ? 's' : ''} • Total
                        size:{' '}
                        {(
                          splitPdfs.reduce((acc, split) => acc + split.blob.size, 0) /
                          1024 /
                          1024
                        ).toFixed(2)}{' '}
                        MB
                      </Text>
                    </Box>

                    <Group gap="sm">
                      {downloadAsZip ? (
                        <Button
                          leftSection={<IconFileZip size={16} />}
                          onClick={downloadAsZipFile}
                          color="green"
                          size="md"
                        >
                          Download ZIP
                        </Button>
                      ) : (
                        <Button
                          leftSection={<IconFiles size={16} />}
                          onClick={downloadAllSeparately}
                          color="green"
                          size="md"
                        >
                          Download All
                        </Button>
                      )}
                    </Group>
                  </Group>

                  {/* Individual file list */}
                  {splitPdfs.length <= 10 && ( // Only show list for reasonable number of files
                    <Box>
                      <Text size="sm" fw={500} mb="sm">
                        Files:
                      </Text>
                      <Stack gap="xs">
                        {splitPdfs.slice(0, 5).map((split, index) => (
                          <Group
                            key={index}
                            justify="space-between"
                            p="sm"
                            style={{
                              backgroundColor: 'var(--mantine-color-gray-0)',
                              borderRadius: '8px',
                            }}
                          >
                            <Group gap="sm">
                              <IconFile size={16} />
                              <Text size="sm" truncate style={{ maxWidth: '300px' }}>
                                {split.name}
                              </Text>
                              <Text size="xs" c="dimmed">
                                ({(split.blob.size / 1024).toFixed(1)} KB)
                              </Text>
                            </Group>
                            <Button
                              size="xs"
                              variant="light"
                              leftSection={<IconDownload size={12} />}
                              onClick={() => downloadSinglePdf(split)}
                            >
                              Download
                            </Button>
                          </Group>
                        ))}
                        {splitPdfs.length > 5 && (
                          <Text size="xs" c="dimmed" ta="center">
                            ... and {splitPdfs.length - 5} more files
                          </Text>
                        )}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </Alert>
            )}

            {/* Tips */}
            {file === null && (
              <Alert color="orange" variant="light">
                <Text size="sm" fw={500} mb="xs">
                  💡 Tips for splitting PDFs:
                </Text>
                <Text size="xs" component="div">
                  • Large PDFs may take longer to process
                  <br />
                  • ZIP download is recommended for multiple files
                  <br />
                  • Individual downloads may trigger browser popup blockers
                  <br />• File names will include original PDF name + page numbers
                </Text>
              </Alert>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
};

export default SplitPdf;
