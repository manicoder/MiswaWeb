import React, { useState, useCallback } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Progress,
  Card,
  Select,
  NumberInput,
  Center,
  rem,
  Grid,
  Image,
  ActionIcon,
  Switch,
  Divider,
  ScrollArea,
} from '@mantine/core';
import { IconPhoto, IconUpload, IconTrash, IconDownload, IconSettings } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Dropzone } from '@mantine/dropzone';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  name: string;
  size: number;
}

interface PdfSettings {
  pageSize: 'a4' | 'a3' | 'letter' | 'legal';
  orientation: 'portrait' | 'landscape';
  fitToPage: boolean;
  maintainAspectRatio: boolean;
  imageQuality: number; // Percentage value (10, 25, 50, 100)
  margin: number;
  centerImage: boolean;
  useHighQuality: boolean; // Use PNG for 100% quality
}

const ImageToPdf: React.FC = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<PdfSettings>({
    pageSize: 'a4',
    orientation: 'portrait',
    fitToPage: true,
    maintainAspectRatio: true,
    imageQuality: 80, // Default to 80% quality
    margin: 10,
    centerImage: true,
    useHighQuality: true, // Use PNG for 100% quality
  });

  const handleFileDrop = useCallback(async (droppedFiles: File[]) => {
    const imageFiles = droppedFiles.filter(
      (file) =>
        file.type.startsWith('image/') ||
        file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i),
    );

    if (imageFiles.length === 0) {
      notifications.show({
        title: 'Invalid Files',
        message: 'Please select image files (JPG, PNG, GIF, BMP, WebP, SVG)',
        color: 'red',
      });
      return;
    }

    const newImages: ImageFile[] = await Promise.all(
      imageFiles.map(async (file) => {
        const preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        return {
          id: Math.random().toString(36).substr(2, 9),
          file,
          preview,
          name: file.name,
          size: file.size,
        };
      }),
    );

    setImages((prev) => [...prev, ...newImages]);
    notifications.show({
      title: 'Images Added',
      message: `Successfully added ${newImages.length} image(s)`,
      color: 'green',
    });
  }, []);

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const clearAllImages = () => {
    setImages([]);
  };

  const convertToPdf = async () => {
    if (images.length === 0) {
      notifications.show({
        title: 'No Images',
        message: 'Please add at least one image to convert',
        color: 'orange',
      });
      return;
    }

    setLoading(true);

    try {
      // Dynamically import jsPDF
      const { default: jsPDFConstructor } = await import('jspdf');

      // Page size dimensions in mm
      const pageSizes = {
        a4: { width: 210, height: 297 },
        a3: { width: 297, height: 420 },
        letter: { width: 216, height: 279 },
        legal: { width: 216, height: 356 },
      };

      const selectedSize = pageSizes[settings.pageSize];
      const isLandscape = settings.orientation === 'landscape';
      const pageWidth = isLandscape ? selectedSize.height : selectedSize.width;
      const pageHeight = isLandscape ? selectedSize.width : selectedSize.height;

      const doc = new jsPDFConstructor({
        orientation: settings.orientation,
        unit: 'mm',
        format: settings.pageSize,
      });

      for (let i = 0; i < images.length; i++) {
        const image = images[i];

        // Add new page for each image (except the first one)
        if (i > 0) {
          doc.addPage();
        }

        // Create canvas to process image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const img = new window.Image();

        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            // Calculate dimensions
            const availableWidth = pageWidth - settings.margin * 2;
            const availableHeight = pageHeight - settings.margin * 2;

            let imgWidth = img.width;
            let imgHeight = img.height;

            if (settings.fitToPage) {
              const scaleX = availableWidth / imgWidth;
              const scaleY = availableHeight / imgHeight;
              const scale = settings.maintainAspectRatio
                ? Math.min(scaleX, scaleY)
                : Math.min(scaleX, scaleY);

              imgWidth *= scale;
              imgHeight *= scale;
            }

            // For high quality (100%), use PNG format to avoid JPEG compression artifacts
            const usePNG = settings.imageQuality === 100 && settings.useHighQuality;

            // Set canvas size with higher resolution for better quality
            const qualityMultiplier = settings.imageQuality === 100 ? 2 : 1;
            canvas.width = imgWidth * qualityMultiplier;
            canvas.height = imgHeight * qualityMultiplier;

            // Enable image smoothing for better quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Draw image on canvas with higher resolution
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Convert to base64 with appropriate format and quality
            let imageData: string;
            if (usePNG) {
              // Use PNG for 100% quality to avoid compression artifacts
              imageData = canvas.toDataURL('image/png');
            } else {
              // Use JPEG with quality setting for other percentages
              imageData = canvas.toDataURL('image/jpeg', settings.imageQuality / 100);
            }

            // Calculate position
            let x = settings.margin;
            let y = settings.margin;

            if (settings.centerImage) {
              x = (pageWidth - imgWidth) / 2;
              y = (pageHeight - imgHeight) / 2;
            }

            // Add image to PDF with appropriate format
            const imageFormat = usePNG ? 'PNG' : 'JPEG';
            doc.addImage(imageData, imageFormat, x, y, imgWidth, imgHeight);

            resolve();
          };
          img.onerror = reject;
          img.src = image.preview;
        });
      }

      // Save the PDF
      const fileName =
        images.length === 1
          ? `${images[0].name.replace(/\.[^/.]+$/, '')}.pdf`
          : `images_to_pdf_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;

      doc.save(fileName);

      notifications.show({
        title: 'PDF Created',
        message: `Successfully converted ${images.length} image(s) to PDF`,
        color: 'green',
      });
    } catch (error) {
      console.error('Error creating PDF:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to create PDF. Please try again.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetTool = () => {
    setImages([]);
    setSettings({
      pageSize: 'a4',
      orientation: 'portrait',
      fitToPage: true,
      maintainAspectRatio: true,
      imageQuality: 80,
      margin: 10,
      centerImage: true,
      useHighQuality: true,
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Paper shadow="sm" p="xl" radius="lg">
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <div>
                <Title order={2} mb="xs">
                  Image to PDF Converter
                </Title>
                <Text c="dimmed" size="sm">
                  Convert multiple images to a single PDF document with customizable settings
                </Text>
              </div>
              <IconPhoto size={32} />
            </Group>
          </Stack>
        </Paper>

        {/* Main Content */}
        <Grid gutter="xl">
          {/* Left Panel - File Upload and Settings */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="xl">
              {/* File Upload */}
              <Paper shadow="md" p="xl" radius="lg">
                <Stack gap="md">
                  <Title order={3} size="h4">
                    Upload Images
                  </Title>

                  <Dropzone
                    onDrop={handleFileDrop}
                    accept={['image/*']}
                    maxFiles={10}
                    maxSize={10 * 1024 * 1024} // 10MB
                  >
                    <Group
                      justify="center"
                      gap="xl"
                      style={{ minHeight: rem(120), pointerEvents: 'none' }}
                    >
                      <Dropzone.Accept>
                        <IconUpload
                          style={{
                            width: rem(52),
                            height: rem(52),
                            color: 'var(--mantine-color-blue-6)',
                          }}
                          stroke={1.5}
                        />
                      </Dropzone.Accept>
                      <Dropzone.Reject>
                        <IconUpload
                          style={{
                            width: rem(52),
                            height: rem(52),
                            color: 'var(--mantine-color-red-6)',
                          }}
                          stroke={1.5}
                        />
                      </Dropzone.Reject>
                      <Dropzone.Idle>
                        <IconPhoto
                          style={{
                            width: rem(52),
                            height: rem(52),
                            color: 'var(--mantine-color-dimmed)',
                          }}
                          stroke={1.5}
                        />
                      </Dropzone.Idle>

                      <div>
                        <Text size="xl" inline>
                          Drag images here or click to select files
                        </Text>
                        <Text size="sm" c="dimmed" inline mt={7}>
                          Upload up to 10 images (JPG, PNG, GIF, BMP, WebP, SVG)
                        </Text>
                      </div>
                    </Group>
                  </Dropzone>

                  {images.length > 0 && (
                    <Group justify="space-between" mt="md">
                      <Text size="sm" c="dimmed">
                        {images.length} image(s) selected
                      </Text>
                      <Button
                        variant="light"
                        color="red"
                        size="xs"
                        onClick={clearAllImages}
                        leftSection={<IconTrash size={14} />}
                      >
                        Clear All
                      </Button>
                    </Group>
                  )}
                </Stack>
              </Paper>

              {/* PDF Settings */}
              <Paper shadow="md" p="xl" radius="lg">
                <Stack gap="md">
                  <Group>
                    <IconSettings size={20} />
                    <Title order={3} size="h4">
                      PDF Settings
                    </Title>
                  </Group>

                  <Grid>
                    <Grid.Col span={6}>
                      <Select
                        label="Page Size"
                        value={settings.pageSize}
                        onChange={(value) =>
                          setSettings((prev) => ({
                            ...prev,
                            pageSize: value as 'a4' | 'a3' | 'letter' | 'legal',
                          }))
                        }
                        data={[
                          { value: 'a4', label: 'A4 (210 × 297 mm)' },
                          { value: 'a3', label: 'A3 (297 × 420 mm)' },
                          { value: 'letter', label: 'Letter (216 × 279 mm)' },
                          { value: 'legal', label: 'Legal (216 × 356 mm)' },
                        ]}
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Select
                        label="Orientation"
                        value={settings.orientation}
                        onChange={(value) =>
                          setSettings((prev) => ({
                            ...prev,
                            orientation: value as 'portrait' | 'landscape',
                          }))
                        }
                        data={[
                          { value: 'portrait', label: 'Portrait' },
                          { value: 'landscape', label: 'Landscape' },
                        ]}
                      />
                    </Grid.Col>
                  </Grid>

                  <Divider />

                  <Grid>
                    <Grid.Col span={6}>
                      <NumberInput
                        label="Margin (mm)"
                        value={settings.margin}
                        onChange={(value) =>
                          setSettings((prev) => ({ ...prev, margin: Number(value) || 10 }))
                        }
                        min={0}
                        max={50}
                        step={1}
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Select
                        label="Image Quality"
                        value={settings.imageQuality.toString()}
                        onChange={(value) =>
                          setSettings((prev) => ({
                            ...prev,
                            imageQuality: Number(value) || 80,
                          }))
                        }
                        data={[
                          { value: '10', label: '10% (Low)' },
                          { value: '25', label: '25% (Medium)' },
                          { value: '50', label: '50% (Good)' },
                          { value: '100', label: '100% (High)' },
                        ]}
                      />
                    </Grid.Col>
                  </Grid>

                  <Divider />

                  <Stack gap="sm">
                    <Switch
                      label="Fit to Page"
                      checked={settings.fitToPage}
                      onChange={(event) =>
                        setSettings((prev) => ({ ...prev, fitToPage: event.currentTarget.checked }))
                      }
                    />
                    <Switch
                      label="Maintain Aspect Ratio"
                      checked={settings.maintainAspectRatio}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          maintainAspectRatio: event.currentTarget.checked,
                        }))
                      }
                    />
                    <Switch
                      label="Center Image"
                      checked={settings.centerImage}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          centerImage: event.currentTarget.checked,
                        }))
                      }
                    />
                    <Switch
                      label="Use PNG for 100% Quality (Larger file size)"
                      checked={settings.useHighQuality}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          useHighQuality: event.currentTarget.checked,
                        }))
                      }
                    />
                  </Stack>
                </Stack>
              </Paper>

              {/* Convert Button */}
              <Paper shadow="md" p="xl" radius="lg">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Button
                      size="lg"
                      onClick={convertToPdf}
                      loading={loading}
                      disabled={images.length === 0}
                      leftSection={<IconDownload size={20} />}
                      fullWidth
                    >
                      Convert to PDF
                    </Button>
                    <Button
                      variant="light"
                      onClick={resetTool}
                      disabled={images.length === 0 && !loading}
                    >
                      Reset
                    </Button>
                  </Group>

                  {loading && (
                    <Stack gap="xs">
                      <Progress value={100} animated size="sm" />
                      <Text size="xs" c="dimmed" ta="center">
                        Creating PDF...
                      </Text>
                    </Stack>
                  )}
                </Stack>
              </Paper>
            </Stack>
          </Grid.Col>

          {/* Right Panel - Image Preview */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper shadow="md" p="xl" radius="lg">
              <Stack gap="md">
                <Title order={3} size="h4">
                  Image Preview
                </Title>

                {images.length === 0 ? (
                  <Center style={{ minHeight: rem(200) }}>
                    <Stack align="center" gap="md">
                      <IconPhoto size={48} style={{ opacity: 0.5 }} />
                      <Text c="dimmed" ta="center">
                        No images uploaded yet
                      </Text>
                      <Text size="sm" c="dimmed" ta="center">
                        Upload images to see them here
                      </Text>
                    </Stack>
                  </Center>
                ) : (
                  <ScrollArea h={400}>
                    <Stack gap="md">
                      {images.map((image) => (
                        <Card key={image.id} withBorder p="md">
                          <Group justify="space-between" align="flex-start">
                            <Group gap="sm">
                              <Image
                                src={image.preview}
                                alt={image.name}
                                w={80}
                                h={80}
                                fit="cover"
                                radius="sm"
                              />
                              <Stack gap="xs">
                                <Text size="sm" fw={500} lineClamp={1}>
                                  {image.name}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  {formatFileSize(image.size)}
                                </Text>
                              </Stack>
                            </Group>
                            <ActionIcon
                              variant="light"
                              color="red"
                              size="sm"
                              onClick={() => removeImage(image.id)}
                            >
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Group>
                        </Card>
                      ))}
                    </Stack>
                  </ScrollArea>
                )}
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
};

export default ImageToPdf;
