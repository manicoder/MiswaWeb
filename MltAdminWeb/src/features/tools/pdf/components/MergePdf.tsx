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
  ActionIcon,
  Badge,
  Box,
  Center,
  rem,
  Modal,
  Divider,
} from '@mantine/core';
import {
  IconFilePlus,
  IconDownload,
  IconTrash,
  IconFile,
  IconAlertCircle,
  IconCheck,
  IconDragDrop,
  IconArrowUp,
  IconArrowDown,
  IconGripVertical,
  IconEye,
  IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Dropzone, PDF_MIME_TYPE } from '@mantine/dropzone';

const MergePdf: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Preview state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleFileDrop = useCallback(
    (droppedFiles: File[]) => {
      const pdfFiles = droppedFiles.filter((file) => file.type === 'application/pdf');

      if (pdfFiles.length !== droppedFiles.length) {
        notifications.show({
          title: 'Some files skipped',
          message: 'Only PDF files are allowed. Non-PDF files were ignored.',
          color: 'yellow',
        });
      }

      if (pdfFiles.length === 0) {
        notifications.show({
          title: 'No valid files',
          message: 'Please select PDF files only.',
          color: 'red',
        });
        return;
      }

      setFiles((prev) => [...prev, ...pdfFiles]);

      // Clear previous result
      if (mergedPdfUrl) {
        URL.revokeObjectURL(mergedPdfUrl);
        setMergedPdfUrl(null);
      }
    },
    [mergedPdfUrl],
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));

    // Clear result if files change
    if (mergedPdfUrl) {
      URL.revokeObjectURL(mergedPdfUrl);
      setMergedPdfUrl(null);
    }
  };

  const moveFile = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const newFiles = [...files];
    const [moved] = newFiles.splice(fromIndex, 1);
    newFiles.splice(toIndex, 0, moved);
    setFiles(newFiles);

    // Clear result if order changes
    if (mergedPdfUrl) {
      URL.revokeObjectURL(mergedPdfUrl);
      setMergedPdfUrl(null);
    }

    // Show feedback notification
    notifications.show({
      title: 'File Reordered',
      message: `Moved "${moved.name}" to position ${toIndex + 1}`,
      color: 'blue',
      autoClose: 2000,
    });
  };

  // Preview functionality
  const handlePreviewFile = useCallback(async (file: File) => {
    setPreviewLoading(true);
    setPreviewFile(file);
    setPreviewModalOpen(true);

    try {
      // Create object URL for the PDF file
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } catch (error) {
      console.error('Error creating preview:', error);
      notifications.show({
        title: 'Preview Error',
        message: 'Failed to load PDF preview',
        color: 'red',
      });
      setPreviewModalOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const closePreview = useCallback(() => {
    setPreviewModalOpen(false);
    setPreviewFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    // Prevent drag if target is a button or inside button area
    const target = e.target as HTMLElement;
    if (target.closest('[data-button-area]')) {
      e.preventDefault();
      return;
    }

    // Only allow drag from grip handle or draggable content area
    if (!target.closest('[data-draggable-area]') && !target.closest('svg')) {
      e.preventDefault();
      return;
    }

    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());

    // Add some visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drag over if we're actually leaving the element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      moveFile(draggedIndex, dropIndex);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const mergePdfs = async () => {
    if (files.length < 2) {
      notifications.show({
        title: 'Insufficient Files',
        message: 'Please select at least 2 PDF files to merge',
        color: 'orange',
      });
      return;
    }

    setLoading(true);

    try {
      // Dynamic import of PDFLib
      const { PDFDocument } = await import('pdf-lib');

      const mergedPdf = await PDFDocument.create();

      // Process files in order
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await PDFDocument.load(arrayBuffer);
          const pageCount = pdf.getPageCount();

          // Copy all pages from this PDF
          const pageIndices = Array.from({ length: pageCount }, (_, i) => i);
          const pages = await mergedPdf.copyPages(pdf, pageIndices);
          pages.forEach((page) => mergedPdf.addPage(page));
        } catch (fileError) {
          console.error(`Error processing ${file.name}:`, fileError);
          notifications.show({
            title: 'File Error',
            message: `Failed to process "${file.name}". It may be corrupted or password-protected.`,
            color: 'red',
          });
          throw fileError;
        }
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setMergedPdfUrl(url);

      notifications.show({
        title: 'Success!',
        message: `Successfully merged ${files.length} PDF files`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      console.error('Error merging PDFs:', error);
      notifications.show({
        title: 'Merge Failed',
        message: 'Failed to merge PDFs. Please ensure all files are valid PDF documents.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadMergedPdf = () => {
    if (mergedPdfUrl) {
      const link = document.createElement('a');
      link.href = mergedPdfUrl;
      link.download = `merged-document-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      notifications.show({
        title: 'Download Started',
        message: 'Your merged PDF is being downloaded',
        color: 'blue',
      });
    }
  };

  const resetTool = () => {
    setFiles([]);
    if (mergedPdfUrl) {
      URL.revokeObjectURL(mergedPdfUrl);
      setMergedPdfUrl(null);
    }
    closePreview();
  };

  const getCardStyle = (index: number) => {
    const baseStyle: React.CSSProperties = {
      cursor: 'move',
      transition: 'all 0.2s ease',
      userSelect: 'none',
    };

    if (draggedIndex === index) {
      return {
        ...baseStyle,
        opacity: 0.5,
        transform: 'scale(1.02)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
      };
    }

    if (dragOverIndex === index) {
      return {
        ...baseStyle,
        transform: 'translateY(-2px)',
        borderColor: 'var(--mantine-color-blue-4)',
        borderWidth: '2px',
        borderStyle: 'dashed',
        backgroundColor: 'var(--mantine-color-blue-0)',
      };
    }

    return baseStyle;
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box ta="center">
          <Title order={2} mb="xs">
            <Group justify="center" gap="sm">
              <IconFilePlus size={32} color="var(--mantine-color-blue-6)" />
              Merge PDF Files
            </Group>
          </Title>
          <Text c="dimmed" size="lg">
            Combine multiple PDF files into a single document
          </Text>
          <Text c="dimmed" size="sm" mt="xs">
            Upload PDFs, preview to verify, drag to reorder, then merge into one file
          </Text>
        </Box>

        <Paper shadow="md" p="xl" radius="lg">
          <Stack gap="xl">
            {/* Upload Area */}
            <Dropzone
              onDrop={handleFileDrop}
              accept={PDF_MIME_TYPE}
              maxSize={50 * 1024 * 1024} // 50MB per file
              multiple
            >
              <Center style={{ minHeight: rem(220) }}>
                <Stack align="center" gap="md">
                  <Box ta="center">
                    <IconDragDrop size={64} stroke={1.5} color="var(--mantine-color-blue-4)" />
                  </Box>
                  <Stack align="center" gap="xs">
                    <Text size="xl" fw={500}>
                      Drop PDF files here or click to browse
                    </Text>
                    <Text size="sm" c="dimmed">
                      Upload multiple PDF files (up to 50MB each)
                    </Text>
                    <Text size="xs" c="dimmed">
                      Preview files to verify content, then drag to reorder
                    </Text>
                  </Stack>
                </Stack>
              </Center>
            </Dropzone>

            {/* File List */}
            {files.length > 0 && (
              <Box>
                <Group justify="space-between" mb="md">
                  <Text fw={600} size="lg">
                    Selected Files ({files.length})
                  </Text>
                  <Badge size="lg" variant="light" color="blue">
                    Preview • Drag to reorder
                  </Badge>
                </Group>

                <Stack gap="sm">
                  {files.map((file, index) => (
                    <Card
                      key={`${file.name}-${index}`}
                      shadow="sm"
                      p="md"
                      radius="md"
                      style={getCardStyle(index)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                    >
                      <Group justify="space-between" align="center">
                        {/* Draggable content area */}
                        <Group gap="md" style={{ flex: 1 }} data-draggable-area>
                          <Group gap="xs">
                            <IconGripVertical
                              size={20}
                              color="var(--mantine-color-gray-5)"
                              style={{ cursor: 'grab' }}
                              title="Drag to reorder"
                            />
                            <Badge variant="light" size="sm">
                              {index + 1}
                            </Badge>
                          </Group>
                          <IconFile size={24} color="var(--mantine-color-red-6)" />
                          <Box style={{ flex: 1 }}>
                            <Text size="sm" fw={500} truncate>
                              {file.name}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </Text>
                          </Box>
                        </Group>

                        {/* Button control area - non-draggable */}
                        <Group gap="xs" data-button-area style={{ flexShrink: 0 }}>
                          {/* Preview button */}
                          <ActionIcon
                            variant="light"
                            color="green"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handlePreviewFile(file);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            title="Preview file"
                            style={{ cursor: 'pointer' }}
                          >
                            <IconEye size={14} />
                          </ActionIcon>

                          {/* Move up button */}
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                            disabled={index === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              moveFile(index, index - 1);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            title="Move up"
                            style={{ cursor: 'pointer' }}
                          >
                            <IconArrowUp size={14} />
                          </ActionIcon>

                          {/* Move down button */}
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                            disabled={index === files.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              moveFile(index, index + 1);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            title="Move down"
                            style={{ cursor: 'pointer' }}
                          >
                            <IconArrowDown size={14} />
                          </ActionIcon>

                          {/* Remove button */}
                          <ActionIcon
                            variant="light"
                            color="red"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              removeFile(index);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            title="Remove file"
                            style={{ cursor: 'pointer' }}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Actions */}
            {files.length > 0 && (
              <Group justify="space-between">
                <Group gap="md">
                  <Badge variant="outline" size="lg" color="gray">
                    {files.length} file{files.length !== 1 ? 's' : ''} • Total:{' '}
                    {(files.reduce((acc, file) => acc + file.size, 0) / 1024 / 1024).toFixed(2)} MB
                  </Badge>
                </Group>

                <Group gap="sm">
                  <Button variant="outline" onClick={resetTool} disabled={loading}>
                    Clear All
                  </Button>
                  <Button
                    onClick={mergePdfs}
                    loading={loading}
                    disabled={files.length < 2}
                    leftSection={<IconFilePlus size={16} />}
                    size="md"
                  >
                    Merge PDFs
                  </Button>
                </Group>
              </Group>
            )}

            {/* Loading State */}
            {loading && (
              <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                <Text size="sm" mb="xs">
                  Merging PDFs... This may take a moment for large files.
                </Text>
                <Progress value={50} animated />
              </Alert>
            )}

            {/* Success State */}
            {mergedPdfUrl && (
              <Alert icon={<IconCheck size={16} />} color="green" variant="light">
                <Group justify="space-between">
                  <Box>
                    <Text size="sm" fw={500} mb="xs">
                      PDF merged successfully!
                    </Text>
                    <Text size="xs" c="dimmed">
                      Combined {files.length} files into one document
                    </Text>
                  </Box>
                  <Button
                    leftSection={<IconDownload size={16} />}
                    onClick={downloadMergedPdf}
                    color="green"
                    variant="filled"
                  >
                    Download
                  </Button>
                </Group>
              </Alert>
            )}

            {/* Tips */}
            {files.length === 0 && (
              <Alert color="blue" variant="light">
                <Text size="sm" fw={500} mb="xs">
                  💡 Tips for best results:
                </Text>
                <Text size="xs" component="div">
                  • Use high-quality PDF files for best output
                  <br />• <strong>Preview files</strong> to verify they're correct
                  <br />• <strong>Drag files up and down</strong> to reorder them
                  <br />
                  • You can also use the arrow buttons to reorder
                  <br />
                  • Large files may take longer to process
                  <br />• All pages from each PDF will be included
                </Text>
              </Alert>
            )}
          </Stack>
        </Paper>

        {/* Preview Modal */}
        <Modal
          opened={previewModalOpen}
          onClose={closePreview}
          title={
            <Group gap="sm" align="center">
              <IconEye size={20} />
              <Text fw={600}>PDF Preview</Text>
              {previewFile && (
                <Badge variant="light" color="blue">
                  {previewFile.name}
                </Badge>
              )}
            </Group>
          }
          size="xl"
          centered
          overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
        >
          <Stack gap="md">
            {previewFile && (
              <Group justify="space-between" align="center">
                <Box>
                  <Text size="sm" fw={500} truncate style={{ maxWidth: '300px' }}>
                    {previewFile.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Size: {(previewFile.size / 1024 / 1024).toFixed(2)} MB
                  </Text>
                </Box>
                <ActionIcon
                  variant="light"
                  color="gray"
                  onClick={closePreview}
                  title="Close preview"
                >
                  <IconX size={16} />
                </ActionIcon>
              </Group>
            )}

            <Divider />

            {previewLoading ? (
              <Center style={{ minHeight: '400px' }}>
                <Stack align="center" gap="md">
                  <Progress value={50} animated style={{ width: '200px' }} />
                  <Text size="sm" c="dimmed">
                    Loading PDF preview...
                  </Text>
                </Stack>
              </Center>
            ) : previewUrl ? (
              <Box style={{ height: '70vh', width: '100%' }}>
                <iframe
                  src={`${previewUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: '1px solid var(--mantine-color-gray-3)',
                    borderRadius: '8px',
                  }}
                  title="PDF Preview"
                />
              </Box>
            ) : (
              <Center style={{ minHeight: '400px' }}>
                <Stack align="center" gap="md">
                  <IconAlertCircle size={48} color="var(--mantine-color-red-6)" />
                  <Text size="sm" c="dimmed" ta="center">
                    Failed to load PDF preview.
                    <br />
                    The file might be corrupted or password-protected.
                  </Text>
                </Stack>
              </Center>
            )}

            <Group justify="center" mt="md">
              <Button variant="outline" onClick={closePreview}>
                Close Preview
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
};

export default MergePdf;
