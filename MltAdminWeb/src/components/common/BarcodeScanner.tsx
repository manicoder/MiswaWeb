import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  Button,
  Stack,
  Group,
  Text,
  TextInput,
  Tabs,
  Card,
  Badge,
  Alert,
  LoadingOverlay,
  Image,
  Grid,
  Paper,
  Divider,
} from '@mantine/core';
import {
  IconScan,
  IconKeyboard,
  IconCamera,
  IconCameraOff,
  IconCheck,
  IconX,
  IconPackage,
  IconBarcode,
  IconAlertCircle,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType, Result } from '@zxing/library';

interface BarcodeProduct {
  barcode: string;
  productId: string;
  variantId: string;
  title: string;
  variantTitle?: string;
  sku?: string;
  price: number;
  currency: string;
  imageUrl?: string;
  inventoryQuantity?: number;
  isFound: boolean;
}

interface BarcodeScannerProps {
  opened: boolean;
  onClose: () => void;
  onProductFound: (product: BarcodeProduct) => void;
  onBarcodeScanned: (barcode: string) => void;
  lookupProduct?: (barcode: string) => Promise<BarcodeProduct>;
  title?: string;
  placeholder?: string;
  debug?: boolean;
}

interface CameraState {
  isSupported: boolean;
  isPermissionGranted: boolean;
  isActive: boolean;
  error?: string;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  opened,
  onClose,
  onProductFound,
  onBarcodeScanned,
  lookupProduct,
  title = 'Scan Barcode',
  placeholder = 'Enter barcode manually',
  debug = false,
}) => {
  const [activeTab, setActiveTab] = useState<string>('camera');
  const [manualBarcode, setManualBarcode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastScannedProduct, setLastScannedProduct] = useState<BarcodeProduct | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>({
    isSupported: false,
    isPermissionGranted: false,
    isActive: false,
  });
  const [flashlightActive, setFlashlightActive] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  // We're now using ZXing's BrowserMultiFormatReader for barcode detection
  // The detection happens automatically in the callback provided to decodeFromVideoDevice

  const processBarcode = useCallback(
    async (barcode: string) => {
      setIsLoading(true);

      try {
        onBarcodeScanned(barcode);

        if (lookupProduct) {
          const product = await lookupProduct(barcode);
          setLastScannedProduct(product);

          if (product.isFound) {
            onProductFound(product);
            notifications.show({
              title: 'Product Found',
              message: `${product.title} - ${product.variantTitle || 'Default'}`,
              color: 'green',
              icon: <IconCheck size={16} />,
            });
          } else {
            notifications.show({
              title: 'Product Not Found',
              message: `No product found for barcode: ${barcode}`,
              color: 'orange',
              icon: <IconAlertCircle size={16} />,
            });
          }
        }
      } catch (error) {
        console.error('Error processing barcode:', error);
        notifications.show({
          title: 'Error',
          message: 'Failed to process barcode',
          color: 'red',
          icon: <IconX size={16} />,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [onBarcodeScanned, lookupProduct, onProductFound],
  );

  const handleBarcodeDetected = useCallback(
    async (scannedValue: string) => {
      if (!scannedValue.trim()) return;
      await processBarcode(scannedValue.trim());
    },
    [processBarcode],
  );

  const startCamera = useCallback(async () => {
    try {
      // Initialize ZXing code reader if not already created
      if (!codeReaderRef.current) {
        const hints = new Map();
        // Set formats to recognize - add or remove formats as needed
        const formats = [
          BarcodeFormat.QR_CODE,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.DATA_MATRIX,
          BarcodeFormat.ITF,
        ];
        hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
        hints.set(DecodeHintType.TRY_HARDER, true);
        hints.set(DecodeHintType.CHARACTER_SET, 'UTF-8');
        hints.set(DecodeHintType.ASSUME_GS1, false);
        hints.set(DecodeHintType.PURE_BARCODE, false);

        codeReaderRef.current = new BrowserMultiFormatReader(hints);
      }

      // Get available video devices
      const videoDevices = await codeReaderRef.current.listVideoInputDevices();
      console.log('Available video devices:', videoDevices);
      setAvailableCameras(videoDevices);

      // Use back camera on mobile if available or previously selected camera
      let deviceId: string | null = selectedCameraId;

      if (!deviceId) {
        const backCamera = videoDevices.find(
          (device: MediaDeviceInfo) =>
            device.label.toLowerCase().includes('back') ||
            device.label.toLowerCase().includes('rear'),
        );

        if (backCamera) {
          deviceId = backCamera.deviceId;
          setSelectedCameraId(backCamera.deviceId);
          console.log('Using back camera:', backCamera.label);
        }
      }

      if (videoRef.current) {
        // Define video constraints for better barcode scanning
        const constraints = {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          aspectRatio: { ideal: 1.777777778 },
          facingMode: { ideal: 'environment' },
          // Standard MediaTrackConstraints don't include focusMode or advanced options
          // that we tried to use, so we'll stick with the standard properties
        };

        // Start decoding from video element with constraints
        codeReaderRef.current.decodeFromConstraints(
          { video: constraints },
          videoRef.current,
          (result: Result | undefined, error: unknown) => {
            if (result) {
              console.log('Barcode detected:', result.getText());
              handleBarcodeDetected(result.getText());
            }
            if (error) {
              // Only log errors that aren't "not found" errors, which are normal during scanning
              if (
                !(error instanceof TypeError) &&
                !error.toString().includes('NotFoundException') &&
                !error.toString().includes('No MultiFormat Readers were able to detect')
              ) {
                console.error('Decoding error:', error);
              }
            }
          },
        );

        // Get the stream to store in ref
        const videoTracks = videoRef.current.srcObject as MediaStream;
        if (videoTracks) {
          streamRef.current = videoTracks;
        }

        setCameraState((prev) => ({
          ...prev,
          isActive: true,
          isPermissionGranted: true,
          error: undefined,
        }));
      }
    } catch (_error) {
      console.error('Error starting camera:', _error);
      setCameraState((prev) => ({
        ...prev,
        isActive: false,
        error: 'Camera access denied or unavailable',
      }));
    }
  }, [selectedCameraId, handleBarcodeDetected]);

  // Check camera support and permissions
  useEffect(() => {
    checkCameraSupport();
    return () => {
      stopCamera();
    };
  }, []);

  // Start camera when modal opens and camera tab is active
  useEffect(() => {
    if (opened && activeTab === 'camera' && cameraState.isSupported) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [opened, activeTab, cameraState.isSupported, startCamera]);

  const checkCameraSupport = async () => {
    try {
      const isSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      setCameraState((prev) => ({ ...prev, isSupported }));

      if (isSupported) {
        // Check if we already have permission
        const permissions = await navigator.permissions.query({
          name: 'camera' as PermissionName,
        });
        setCameraState((prev) => ({
          ...prev,
          isPermissionGranted: permissions.state === 'granted',
        }));
      }
    } catch (_error) {
      console.error('Error checking camera support:', _error);
      setCameraState((prev) => ({
        ...prev,
        isSupported: false,
        error: 'Camera not supported on this device',
      }));
    }
  };

  const stopCamera = () => {
    // Stop ZXing code reader
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
        console.log('ZXing code reader reset');
      } catch (_error) {
        console.error('Error resetting code reader:', _error);
      }
    }

    // Stop media stream if needed
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear any remaining interval (should not be needed with ZXing)
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    setCameraState((prev) => ({ ...prev, isActive: false }));
  };

  const handleManualSubmit = useCallback(async () => {
    if (!manualBarcode.trim()) return;
    await processBarcode(manualBarcode.trim());
    setManualBarcode('');
  }, [manualBarcode, processBarcode]);

  // Note: Flashlight control is not well-supported in the standard MediaTrackConstraints
  // We'll show a notification instead of trying to control it directly
  const toggleFlashlight = () => {
    setFlashlightActive(!flashlightActive);

    notifications.show({
      title: 'Flashlight Control',
      message:
        "Please use your device's built-in flashlight or torch feature for better barcode scanning in low light conditions.",
      color: 'blue',
      autoClose: 3000,
    });
  };

  const switchCamera = async () => {
    if (availableCameras.length <= 1) {
      notifications.show({
        title: 'Camera Switch',
        message: 'No additional cameras available on this device.',
        color: 'yellow',
      });
      return;
    }

    // Stop current camera
    stopCamera();

    // Find the next camera in the list
    const currentIndex = availableCameras.findIndex(
      (camera) => camera.deviceId === selectedCameraId,
    );
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCamera = availableCameras[nextIndex];

    // Set the new camera and restart
    setSelectedCameraId(nextCamera.deviceId);

    notifications.show({
      title: 'Camera Switched',
      message: `Switched to ${nextCamera.label || 'next camera'}`,
      color: 'blue',
      autoClose: 2000,
    });

    // Short delay to ensure camera is fully stopped before restarting
    setTimeout(() => {
      startCamera();
    }, 500);
  };

  const handleClose = () => {
    stopCamera();
    setManualBarcode('');
    setLastScannedProduct(null);
    setFlashlightActive(false);
    onClose();
  };

  const renderCameraTab = () => (
    <Stack gap="md">
      {cameraState.error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          {cameraState.error}
        </Alert>
      )}

      {!cameraState.isSupported && (
        <Alert icon={<IconCameraOff size={16} />} color="orange">
          Camera not supported on this device. Please use manual input.
        </Alert>
      )}

      {cameraState.isSupported && (
        <Card p="xs" style={{ position: 'relative' }}>
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: '300px',
              objectFit: 'cover',
              borderRadius: 'var(--mantine-radius-md)',
              background: '#000',
            }}
            playsInline
            muted
            autoPlay
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Scanning overlay */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '200px',
              height: '100px',
              border: '2px solid var(--mantine-color-blue-5)',
              borderRadius: '8px',
              pointerEvents: 'none',
            }}
          />

          {/* Scanning indicator */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: '2px',
              background: 'var(--mantine-color-blue-5)',
              animation: 'scan 2s infinite ease-in-out',
              opacity: cameraState.isActive ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          />

          {/* Camera controls */}
          <Group justify="center" mt="sm">
            {!cameraState.isActive ? (
              <Button
                leftSection={<IconCamera size={16} />}
                onClick={startCamera}
                disabled={!cameraState.isSupported}
              >
                Start Camera
              </Button>
            ) : (
              <Group>
                <Button
                  leftSection={<IconCameraOff size={16} />}
                  onClick={stopCamera}
                  variant="outline"
                >
                  Stop Camera
                </Button>
                <Button
                  leftSection={<IconScan size={16} />}
                  onClick={toggleFlashlight}
                  variant={flashlightActive ? 'filled' : 'light'}
                  color={flashlightActive ? 'yellow' : 'gray'}
                >
                  Flashlight
                </Button>
                {availableCameras.length > 1 && (
                  <Button
                    leftSection={<IconCamera size={16} />}
                    onClick={switchCamera}
                    variant="light"
                  >
                    Switch Camera
                  </Button>
                )}
              </Group>
            )}
          </Group>
        </Card>
      )}

      <Stack gap="xs">
        <Text size="sm" c="dimmed" ta="center">
          Position the barcode within the blue rectangle for automatic scanning. Make sure the
          barcode is well-lit and clearly visible.
        </Text>
        <Alert color="blue" title="Scanning Tips" icon={<IconBarcode size={16} />}>
          <Text size="xs">
            • Hold the device 4-8 inches (10-20 cm) from the barcode
            <br />
            • Ensure good lighting on the barcode
            <br />
            • Keep the camera steady and focused
            <br />
            • Try different angles if scanning fails
            <br />• Make sure the barcode is clean and undamaged
          </Text>
        </Alert>
      </Stack>
    </Stack>
  );

  const renderManualTab = () => (
    <Stack gap="md">
      <TextInput
        label="Enter Barcode"
        placeholder={placeholder}
        value={manualBarcode}
        onChange={(e) => setManualBarcode(e.currentTarget.value)}
        leftSection={<IconBarcode size={16} />}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleManualSubmit();
          }
        }}
      />

      <Button
        leftSection={<IconScan size={16} />}
        onClick={handleManualSubmit}
        disabled={!manualBarcode.trim() || isLoading}
        loading={isLoading}
      >
        Lookup Product
      </Button>
    </Stack>
  );

  const renderProductInfo = () => {
    if (!lastScannedProduct) return null;

    const { isFound } = lastScannedProduct;

    return (
      <Paper p="md" withBorder>
        <Group justify="space-between" mb="sm">
          <Group gap="xs">
            <IconPackage size={16} />
            <Text fw={500}>Last Scanned Product</Text>
          </Group>
          <Badge color={isFound ? 'green' : 'red'}>{isFound ? 'Found' : 'Not Found'}</Badge>
        </Group>

        {isFound ? (
          <Grid>
            <Grid.Col span={3}>
              {lastScannedProduct.imageUrl ? (
                <Image
                  src={lastScannedProduct.imageUrl}
                  alt={lastScannedProduct.title}
                  height={60}
                  fit="contain"
                />
              ) : (
                <Paper
                  h={60}
                  bg="gray.1"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconPackage size={24} color="var(--mantine-color-gray-5)" />
                </Paper>
              )}
            </Grid.Col>
            <Grid.Col span={9}>
              <Stack gap="xs">
                <Text size="sm" fw={500} lineClamp={2}>
                  {lastScannedProduct.title}
                </Text>
                {lastScannedProduct.variantTitle && (
                  <Text size="xs" c="dimmed">
                    {lastScannedProduct.variantTitle}
                  </Text>
                )}
                <Group gap="sm">
                  <Text size="xs" c="dimmed">
                    SKU: {lastScannedProduct.sku || 'N/A'}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Price: {lastScannedProduct.currency} {lastScannedProduct.price}
                  </Text>
                </Group>
              </Stack>
            </Grid.Col>
          </Grid>
        ) : (
          <Text size="sm" c="dimmed">
            Barcode: {lastScannedProduct.barcode}
          </Text>
        )}
      </Paper>
    );
  };

  // Define the scanning animation
  const scanAnimationStyle = `
    @keyframes scan {
      0% {
        transform: translateY(-50px);
      }
      50% {
        transform: translateY(50px);
      }
      100% {
        transform: translateY(-50px);
      }
    }
  `;

  return (
    <Modal opened={opened} onClose={handleClose} title={title} size="md" centered>
      <style>{scanAnimationStyle}</style>
      <LoadingOverlay visible={isLoading} />

      <Stack gap="md">
        <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'camera')}>
          <Tabs.List grow>
            <Tabs.Tab
              value="camera"
              leftSection={<IconCamera size={16} />}
              disabled={!cameraState.isSupported}
            >
              Camera
            </Tabs.Tab>
            <Tabs.Tab value="manual" leftSection={<IconKeyboard size={16} />}>
              Manual
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="camera" pt="md">
            {renderCameraTab()}
          </Tabs.Panel>

          <Tabs.Panel value="manual" pt="md">
            {renderManualTab()}
          </Tabs.Panel>
        </Tabs>

        {renderProductInfo()}

        {debug && (
          <Paper p="xs" withBorder mt="md">
            <Text size="sm" fw={500}>
              Debug Info
            </Text>
            <Text size="xs" c="dimmed">
              Camera supported: {cameraState.isSupported ? 'Yes' : 'No'}
            </Text>
            <Text size="xs" c="dimmed">
              Permission granted: {cameraState.isPermissionGranted ? 'Yes' : 'No'}
            </Text>
            <Text size="xs" c="dimmed">
              Camera active: {cameraState.isActive ? 'Yes' : 'No'}
            </Text>
            <Text size="xs" c="dimmed">
              Error: {cameraState.error || 'None'}
            </Text>
            <Text size="xs" c="dimmed">
              ZXing initialized: {codeReaderRef.current ? 'Yes' : 'No'}
            </Text>
            <Text size="xs" c="dimmed">
              Available cameras: {availableCameras.length}
            </Text>
            <Text size="xs" c="dimmed">
              Selected camera: {selectedCameraId || 'None'}
            </Text>
            {availableCameras.length > 0 && (
              <div>
                <Text size="xs" fw={500} mt="xs">
                  Camera List:
                </Text>
                {availableCameras.map((camera, index) => (
                  <Text
                    key={camera.deviceId}
                    size="xs"
                    c={camera.deviceId === selectedCameraId ? 'blue' : 'dimmed'}
                  >
                    {index + 1}. {camera.label || `Camera ${index + 1}`}
                  </Text>
                ))}
              </div>
            )}
          </Paper>
        )}

        <Divider />

        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose}>
            Close
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default BarcodeScanner;
