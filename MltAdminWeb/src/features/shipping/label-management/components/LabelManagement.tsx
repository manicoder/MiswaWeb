import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Paper,
  Group,
  Badge,
  Stack,
  Text,
  Center,
  Alert,
  ActionIcon,
  ScrollArea,
  Table,
  Button,
  Modal,
  TextInput,
  Select,
  FileInput,
  Tooltip,
  Skeleton,
} from '@mantine/core';
import {
  IconEye,
  IconDownload,
  IconPrinter,
  IconTrash,
  IconUpload,
  IconFile,
  IconRefresh,
  IconAlertCircle,
  IconChevronDown,
  IconChevronRight,
  IconFileTypePdf,
  IconPlus,
  IconClipboardList,
  IconNote,
} from '@tabler/icons-react';
import CourierIcon from '../../../../components/common/CourierIcon';
import { useMediaQuery } from '@mantine/hooks';
import { format } from 'date-fns';
import { notifications } from '@mantine/notifications';
import {
  labelManagementService,
  type LabelManagementResponse,
  type LabelDocument,
  type UploadLabelDto,
  type UploadMultipleLabelDto,
} from '../../../../services/labelManagementService';
import {
  getResponsivePadding,
  getResponsiveSectionMargin,
  getResponsiveStackGap,
  getResponsiveGroupGap,
  getResponsiveTitleSize,
  getResponsiveTitleOrder,
  getResponsiveTitleIconSize,
  getResponsiveIconSize,
  getResponsiveActionIconSize,
  getResponsiveButtonSize,
  getResponsiveCaptionSize,
} from '../../../../constants/mobileDesignSystem';

const LabelManagement: React.FC = () => {
  const [data, setData] = useState<LabelManagementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[] | null>(null);
  const [selectedCourier, setSelectedCourier] = useState<string>('');
  const [description, setDescription] = useState('');

  // Delete confirmation state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [labelToDelete, setLabelToDelete] = useState<LabelDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isMobile = useMediaQuery('(max-width: 768px)');

  const courierOptions = [
    { value: 'XpressBees', label: 'XpressBees' },
    { value: 'Bluedart', label: 'Bluedart' },
    { value: 'Delhivery', label: 'Delhivery' },
    { value: 'Amazon', label: 'Amazon' },
    { value: 'Others', label: 'Others' },
  ];

  const fetchData = async () => {
    try {
      const response = await labelManagementService.getLabels();
      setData(response.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch labels');
      console.error('Error fetching labels:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const toggleGroup = (courierName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(courierName)) {
      newExpanded.delete(courierName);
    } else {
      newExpanded.add(courierName);
    }
    setExpandedGroups(newExpanded);
  };

  // Upload handlers
  const openUploadModal = () => {
    setUploadModalOpen(true);
    setUploadFiles(null);
    setSelectedCourier('');
    setDescription('');
  };

  const closeUploadModal = () => {
    setUploadModalOpen(false);
    setUploadFiles(null);
    setSelectedCourier('');
    setDescription('');
  };

  const handleUpload = async () => {
    if (!uploadFiles || uploadFiles.length === 0 || !selectedCourier) {
      notifications.show({
        title: 'Error',
        message: 'Please select at least one file and courier company',
        color: 'red',
      });
      return;
    }

    setUploading(true);
    try {
      if (uploadFiles.length === 1) {
        // Single file upload
        const uploadData: UploadLabelDto = {
          file: uploadFiles[0],
          courierCompany: selectedCourier,
          description: description || undefined,
        };

        await labelManagementService.uploadLabel(uploadData);

        notifications.show({
          title: 'Success',
          message: 'Label uploaded successfully',
          color: 'green',
        });
      } else {
        // Multiple file upload
        const uploadData: UploadMultipleLabelDto = {
          files: uploadFiles,
          courierCompany: selectedCourier,
          description: description || undefined,
        };

        await labelManagementService.uploadMultipleLabels(uploadData);

        notifications.show({
          title: 'Success',
          message: `${uploadFiles.length} labels uploaded successfully`,
          color: 'green',
        });
      }

      closeUploadModal();
      await fetchData();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to upload labels',
        color: 'red',
      });
    } finally {
      setUploading(false);
    }
  };

  // Label action handlers
  const handleView = async (label: LabelDocument) => {
    try {
      const blob: Blob = await labelManagementService.viewLabel(label.id);

      // Create blob URL and open in new tab
      const url = window.URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');

      // Clean up the blob URL after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);

      if (!newWindow) {
        notifications.show({
          title: 'Error',
          message: 'Please allow popups to view PDFs',
          color: 'red',
        });
      }
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to view label',
        color: 'red',
      });
    }
  };

  const handleDownload = async (label: LabelDocument) => {
    try {
      const blob = await labelManagementService.downloadLabel(label.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = label.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      notifications.show({
        title: 'Success',
        message: 'Label downloaded successfully',
        color: 'green',
      });
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to download label',
        color: 'red',
      });
    }
  };

  const handlePrint = async (label: LabelDocument) => {
    try {
      const blob: Blob = await labelManagementService.viewLabel(label.id);

      // Create blob URL for printing
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');

      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
          // Clean up the blob URL after a longer delay, but don't close the window
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
          }, 5001);
        });
      } else {
        // Clean up if window couldn't open
        window.URL.revokeObjectURL(url);
        notifications.show({
          title: 'Error',
          message: 'Please allow popups to print PDFs',
          color: 'red',
        });
      }
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to print label',
        color: 'red',
      });
    }
  };

  const openDeleteModal = (label: LabelDocument) => {
    setLabelToDelete(label);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setLabelToDelete(null);
  };

  const handleDelete = async () => {
    if (!labelToDelete) return;

    setDeleting(true);
    try {
      await labelManagementService.deleteLabel(labelToDelete.id);

      notifications.show({
        title: 'Success',
        message: 'Label deleted successfully',
        color: 'green',
      });

      closeDeleteModal();
      await fetchData();
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete label',
        color: 'red',
      });
    } finally {
      setDeleting(false);
    }
  };

  // Skeleton loading component
  const LabelManagementTableSkeleton = () => (
    <ScrollArea>
      <Table stickyHeader>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ minWidth: '200px' }}>Courier Company</Table.Th>
            <Table.Th style={{ minWidth: '100px' }}>Labels</Table.Th>
            <Table.Th style={{ minWidth: '120px' }}>Total Size</Table.Th>
            <Table.Th style={{ minWidth: '150px' }}>Latest Upload</Table.Th>
            <Table.Th style={{ minWidth: '80px' }}></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {Array.from({ length: 5 }).map((_, index) => (
            <Table.Tr key={index}>
              <Table.Td>
                <Group gap="sm">
                  <Skeleton height={20} width={20} />
                  <Skeleton height={16} width="60%" />
                </Group>
              </Table.Td>
              <Table.Td>
                <Skeleton height={20} width="40%" />
              </Table.Td>
              <Table.Td>
                <Skeleton height={16} width="70%" />
              </Table.Td>
              <Table.Td>
                <Skeleton height={16} width="80%" />
              </Table.Td>
              <Table.Td>
                <Skeleton height={16} width={16} />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );

  if (error) {
    return (
      <Container size="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" variant="light">
          {error}
          <Button variant="light" size="sm" onClick={handleRefresh} mt="md" loading={refreshing}>
            Try Again
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" py={getResponsivePadding(isMobile)}>
      {/* Header */}
      <Stack mb={getResponsiveSectionMargin(isMobile)} gap={getResponsiveStackGap(isMobile)}>
        <Group justify="space-between" align={isMobile ? 'flex-start' : 'center'} wrap="wrap">
          <Group gap={getResponsiveGroupGap(isMobile)}>
            <IconClipboardList
              size={getResponsiveTitleIconSize(isMobile)}
              color="var(--mantine-color-blue-6)"
            />
            <Title
              order={getResponsiveTitleOrder(isMobile)}
              size={getResponsiveTitleSize(isMobile)}
            >
              Label Management
            </Title>
          </Group>
          <Group gap={getResponsiveGroupGap(isMobile)}>
            {data && (
              <Badge size="lg" variant="light" color="blue">
                Total Labels: {data.totalLabels}
              </Badge>
            )}
            <Button
              leftSection={<IconPlus size={getResponsiveIconSize(isMobile)} />}
              onClick={openUploadModal}
              size={getResponsiveButtonSize(isMobile)}
            >
              Upload Label
            </Button>
            <Tooltip label="Refresh data">
              <ActionIcon
                size={getResponsiveActionIconSize(isMobile)}
                variant="subtle"
                onClick={handleRefresh}
                loading={refreshing}
              >
                <IconRefresh size={getResponsiveIconSize(isMobile)} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Stack>

      <Paper withBorder radius="md" py={getResponsivePadding(isMobile)} px={0}>
        {/* Results Summary */}
        {data && data.courierGroups.length > 0 && (
          <Group
            justify="space-between"
            px={getResponsivePadding(isMobile)}
            mb={getResponsiveStackGap(isMobile)}
          >
            <Text size={getResponsiveCaptionSize(isMobile)} c="dimmed">
              {data.courierGroups.length} courier companies • {data.totalLabels} labels •{' '}
              {labelManagementService.getFileSize(data.totalSize)}
            </Text>
          </Group>
        )}

        {/* Loading State */}
        {loading ? (
          <LabelManagementTableSkeleton />
        ) : !data || data.courierGroups.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="md">
              <IconFile size={48} color="var(--mantine-color-gray-5)" />
              <Text size="lg" fw={500} c="dimmed">
                No labels found
              </Text>
              <Text size="sm" c="dimmed">
                Upload your first label to get started
              </Text>
              <Button onClick={openUploadModal} leftSection={<IconUpload size={16} />}>
                Upload Label
              </Button>
            </Stack>
          </Center>
        ) : isMobile ? (
          /* Mobile Card Layout */
          <div>
            {data.courierGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.courierName);

              return (
                <div key={group.courierName}>
                  {/* Mobile Courier Group Header */}
                  <Paper
                    radius={0}
                    p="md"
                    style={{
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--mantine-color-default-border)',
                      backgroundColor: isExpanded ? 'var(--mantine-color-gray-light)' : undefined,
                    }}
                    onClick={() => toggleGroup(group.courierName)}
                  >
                    <Group justify="space-between" align="center">
                      <div>
                        <Group gap="sm" mb="xs">
                          <CourierIcon courierName={group.courierName} size={16} />
                          <Text fw={500} size="sm">
                            {group.courierName}
                          </Text>
                          <Badge size="xs" variant="outline">
                            {group.labelCount}
                          </Badge>
                        </Group>
                        <Text size="xs" c="dimmed">
                          {labelManagementService.getFileSize(group.totalSize)}
                        </Text>
                      </div>
                      <ActionIcon variant="subtle" size="sm">
                        {isExpanded ? (
                          <IconChevronDown size={16} />
                        ) : (
                          <IconChevronRight size={16} />
                        )}
                      </ActionIcon>
                    </Group>
                  </Paper>

                  {/* Mobile Expanded Labels */}
                  {isExpanded &&
                    group.labels.map((label) => (
                      <Paper
                        key={label.id}
                        radius={0}
                        p="md"
                        pl="xl"
                        style={{
                          borderBottom: '1px solid var(--mantine-color-default-border)',
                          borderLeft: '6px solid var(--mantine-color-blue-5)',
                          transition: 'border-left 0.2s ease',
                        }}
                      >
                        <Stack gap="sm">
                          <Group justify="space-between" align="flex-start">
                            <div style={{ flex: 1 }}>
                              <Group gap="xs" mb="xs">
                                <IconFileTypePdf size={16} color="var(--mantine-color-red-6)" />
                                <Text fw={500} size="sm">
                                  {label.originalName}
                                </Text>
                              </Group>

                              <Text size="xs" c="dimmed" mb="xs">
                                {labelManagementService.getFileSize(label.fileSize)} •{' '}
                                {format(new Date(label.uploadedAt), 'MMM dd, yyyy HH:mm')}
                              </Text>

                              {label.description && (
                                <Group gap="xs" mb="xs">
                                  <IconNote size={12} color="var(--mantine-color-gray-6)" />
                                  <Text size="xs" c="dimmed">
                                    {label.description}
                                  </Text>
                                </Group>
                              )}
                            </div>
                          </Group>

                          {/* Mobile Action Buttons */}
                          <Group gap="xs">
                            <ActionIcon
                              variant="outline"
                              color="blue"
                              size="lg"
                              onClick={() => handleView(label)}
                            >
                              <IconEye size={18} />
                            </ActionIcon>
                            <ActionIcon
                              variant="outline"
                              color="green"
                              size="lg"
                              onClick={() => handleDownload(label)}
                            >
                              <IconDownload size={18} />
                            </ActionIcon>
                            <ActionIcon
                              variant="outline"
                              color="violet"
                              size="lg"
                              onClick={() => handlePrint(label)}
                            >
                              <IconPrinter size={18} />
                            </ActionIcon>
                            <ActionIcon
                              variant="outline"
                              color="red"
                              size="lg"
                              onClick={() => openDeleteModal(label)}
                            >
                              <IconTrash size={18} />
                            </ActionIcon>
                          </Group>
                        </Stack>
                      </Paper>
                    ))}
                </div>
              );
            })}
          </div>
        ) : (
          /* Desktop Table Layout */
          <ScrollArea>
            <Table stickyHeader>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ minWidth: '200px' }}>Courier Company</Table.Th>
                  <Table.Th style={{ minWidth: '100px' }}>Labels</Table.Th>
                  <Table.Th style={{ minWidth: '120px' }}>Total Size</Table.Th>
                  <Table.Th style={{ minWidth: '150px' }}>Latest Upload</Table.Th>
                  <Table.Th style={{ minWidth: '80px' }}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.courierGroups.map((group) => {
                  const isExpanded = expandedGroups.has(group.courierName);
                  const latestLabel = group.labels?.[0]; // Assuming sorted by upload date

                  return (
                    <React.Fragment key={group.courierName}>
                      {/* Group Header Row */}
                      <Table.Tr
                        style={{
                          cursor: 'pointer',
                          transition: 'background-color 0.2s ease',
                        }}
                        onClick={() => toggleGroup(group.courierName)}
                        data-expanded={isExpanded}
                      >
                        <Table.Td>
                          <Group gap="sm">
                            <CourierIcon courierName={group.courierName} size={20} />
                            <Text fw={500}>{group.courierName}</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Badge color="blue" variant="light">
                            {group.labelCount}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={500}>
                            {labelManagementService.getFileSize(group.totalSize)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {latestLabel &&
                              format(new Date(latestLabel.uploadedAt), 'MMM dd, yyyy HH:mm')}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <ActionIcon variant="subtle" size="sm">
                            {isExpanded ? (
                              <IconChevronDown size={16} />
                            ) : (
                              <IconChevronRight size={16} />
                            )}
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>

                      {/* Expanded Labels */}
                      {isExpanded &&
                        group.labels.map((label) => (
                          <Table.Tr
                            key={label.id}
                            style={{
                              borderLeft: '6px solid var(--mantine-color-blue-5)',
                              transition: 'border-left 0.2s ease',
                            }}
                          >
                            <Table.Td style={{ paddingLeft: '3rem' }}>
                              <Stack gap="xs">
                                <Group gap="sm">
                                  <IconFileTypePdf size={16} color="var(--mantine-color-red-6)" />
                                  <Text fw={500} size="sm">
                                    {label.originalName}
                                  </Text>
                                </Group>
                                {label.description && (
                                  <Text size="xs" c="dimmed">
                                    {label.description}
                                  </Text>
                                )}
                              </Stack>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" c="dimmed">
                                PDF Document
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text fw={500} size="sm">
                                {labelManagementService.getFileSize(label.fileSize)}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">
                                {format(new Date(label.uploadedAt), 'MMM dd, yyyy HH:mm')}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs" wrap="nowrap">
                                <Tooltip label="View">
                                  <ActionIcon
                                    variant="outline"
                                    color="blue"
                                    size="lg"
                                    onClick={() => handleView(label)}
                                  >
                                    <IconEye size={18} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Download">
                                  <ActionIcon
                                    variant="outline"
                                    color="green"
                                    size="lg"
                                    onClick={() => handleDownload(label)}
                                  >
                                    <IconDownload size={18} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Print">
                                  <ActionIcon
                                    variant="outline"
                                    color="violet"
                                    size="lg"
                                    onClick={() => handlePrint(label)}
                                  >
                                    <IconPrinter size={18} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Delete">
                                  <ActionIcon
                                    variant="outline"
                                    color="red"
                                    size="lg"
                                    onClick={() => openDeleteModal(label)}
                                  >
                                    <IconTrash size={18} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                    </React.Fragment>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Paper>

      {/* Upload Modal */}
      <Modal opened={uploadModalOpen} onClose={closeUploadModal} title="Upload Label" size="md">
        <Stack gap="md">
          <FileInput
            label="Select PDF Labels"
            placeholder="Choose PDF files (multiple allowed)"
            accept="application/pdf"
            value={uploadFiles || undefined}
            onChange={setUploadFiles}
            leftSection={<IconFileTypePdf size={16} />}
            multiple
            required
          />

          <Select
            label="Courier Company"
            placeholder="Select courier company"
            value={selectedCourier}
            onChange={(value) => setSelectedCourier(value || '')}
            data={courierOptions}
            required
          />

          <TextInput
            label="Description (Optional)"
            placeholder="Add a description for this label"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
          />

          <Group justify="flex-end" gap="sm">
            <Button variant="outline" onClick={closeUploadModal} disabled={uploading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              loading={uploading}
              disabled={!uploadFiles || uploadFiles.length === 0 || !selectedCourier}
              leftSection={<IconUpload size={16} />}
            >
              Upload{' '}
              {uploadFiles && uploadFiles.length > 1 ? `${uploadFiles.length} Labels` : 'Label'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal opened={deleteModalOpen} onClose={closeDeleteModal} title="Delete Label" size="sm">
        <Stack gap="md">
          <Text>
            Are you sure you want to delete "{labelToDelete?.originalName}"? This action cannot be
            undone.
          </Text>

          <Group justify="flex-end" gap="sm">
            <Button variant="outline" onClick={closeDeleteModal} disabled={deleting}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleDelete}
              loading={deleting}
              leftSection={<IconTrash size={16} />}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};

export default LabelManagement;
