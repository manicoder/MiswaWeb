import { useState, useEffect } from 'react';
import {
  Paper,
  PasswordInput,
  Button,
  Title,
  Stack,
  Alert,
  Group,
  TextInput,
  Stepper,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconLock,
  IconCheck,
  IconExclamationMark,
  IconMail,
  IconShieldLock,
} from '@tabler/icons-react';
import { ENV } from '../../../config/environment';

interface ChangePasswordProps {
  onClose?: () => void;
}

const ChangePassword: React.FC<ChangePasswordProps> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    email: '',
    otpCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [otpSent, setOtpSent] = useState(false);

  // Get user email from localStorage
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('mlt-admin-user') || '{}');
    if (user && user.email) {
      setFormData((prev) => ({ ...prev, email: user.email }));
    }
  }, []);

  useEffect(() => {
    // Validate passwords in real-time
    const newErrors: string[] = [];

    if (formData.newPassword && formData.newPassword.length < 6) {
      newErrors.push('New password must be at least 6 characters long');
    }

    if (formData.confirmPassword && formData.newPassword !== formData.confirmPassword) {
      newErrors.push('New passwords do not match');
    }

    if (
      formData.currentPassword &&
      formData.newPassword &&
      formData.currentPassword === formData.newPassword
    ) {
      newErrors.push('New password must be different from current password');
    }

    setErrors(newErrors);
  }, [formData.currentPassword, formData.newPassword, formData.confirmPassword]);

  const requestOTP = async () => {
    setLoading(true);

    try {
      const API_BASE_URL = ENV.apiUrl;
      const token = localStorage.getItem('mlt-admin-token');

      const response = await fetch(`${API_BASE_URL}/auth/request-change-password-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setOtpSent(true);
        setActiveStep(1);
        notifications.show({
          title: 'OTP Sent',
          message: 'A verification code has been sent to your email',
          color: 'blue',
        });
      } else {
        notifications.show({
          title: 'Verification Failed',
          message: data.message || 'Failed to send verification code',
          color: 'red',
        });
      }
    } catch {
      notifications.show({
        title: 'Network Error',
        message: 'Unable to connect to server. Please try again.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (errors.length > 0) {
      notifications.show({
        title: 'Validation Error',
        message: errors[0],
        color: 'red',
      });
      return;
    }

    setLoading(true);

    try {
      const API_BASE_URL = ENV.apiUrl;
      const token = localStorage.getItem('mlt-admin-token');

      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
          otpCode: formData.otpCode,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        notifications.show({
          title: 'Password Changed',
          message: 'Your password has been changed successfully.',
          color: 'green',
          icon: <IconCheck size="1rem" />,
        });

        // Reset form
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          email: formData.email,
          otpCode: '',
        });

        setActiveStep(0);
        setOtpSent(false);

        if (onClose) {
          onClose();
        }
      } else {
        notifications.show({
          title: 'Change Failed',
          message: data.message || 'Failed to change password',
          color: 'red',
        });
      }
    } catch {
      notifications.show({
        title: 'Network Error',
        message: 'Unable to connect to server. Please try again.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const isPasswordFormValid =
    formData.currentPassword.length > 0 &&
    formData.newPassword.length >= 6 &&
    formData.confirmPassword === formData.newPassword &&
    formData.currentPassword !== formData.newPassword &&
    errors.length === 0;

  const isOtpFormValid = formData.otpCode.length === 6;

  return (
    <Paper withBorder shadow="md" p={30} radius="md">
      <Title size="h3" mb="lg">
        Change Password
      </Title>

      <Stepper active={activeStep} onStepClick={setActiveStep} mb="xl">
        <Stepper.Step label="Verify Identity" description="Enter your current password">
          <IconLock size="1rem" />
        </Stepper.Step>
        <Stepper.Step label="Enter OTP" description="Check your email for code">
          <IconMail size="1rem" />
        </Stepper.Step>
        <Stepper.Step label="Set New Password" description="Create a secure password">
          <IconShieldLock size="1rem" />
        </Stepper.Step>
      </Stepper>

      {activeStep === 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            requestOTP();
          }}
        >
          <Stack gap="md">
            <PasswordInput
              label="Current Password"
              placeholder="Enter current password"
              required
              value={formData.currentPassword}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, currentPassword: e.target.value }))
              }
              leftSection={<IconLock size="1rem" />}
            />

            <Group justify="flex-end" mt="md">
              {onClose && (
                <Button variant="light" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
              )}

              <Button type="submit" loading={loading} disabled={!formData.currentPassword}>
                Send Verification Code
              </Button>
            </Group>
          </Stack>
        </form>
      )}

      {activeStep === 1 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setActiveStep(2);
          }}
        >
          <Stack gap="md">
            {otpSent && (
              <Alert icon={<IconCheck size="1rem" />} title="Verification Code Sent" color="blue">
                A 6-digit code has been sent to your email address. Please enter it below.
              </Alert>
            )}

            <TextInput
              label="Verification Code"
              placeholder="Enter 6-digit code"
              required
              maxLength={6}
              value={formData.otpCode}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, otpCode: e.target.value.replace(/[^0-9]/g, '') }))
              }
            />

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setActiveStep(0)} disabled={loading}>
                Back
              </Button>

              <Button type="submit" loading={loading} disabled={!isOtpFormValid}>
                Verify & Continue
              </Button>
            </Group>
          </Stack>
        </form>
      )}

      {activeStep === 2 && (
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            {errors.length > 0 && (
              <Alert
                icon={<IconExclamationMark size="1rem" />}
                title="Validation Errors"
                color="red"
              >
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </Alert>
            )}

            <PasswordInput
              label="New Password"
              placeholder="Enter new password"
              required
              value={formData.newPassword}
              onChange={(e) => setFormData((prev) => ({ ...prev, newPassword: e.target.value }))}
              leftSection={<IconLock size="1rem" />}
            />

            <PasswordInput
              label="Confirm New Password"
              placeholder="Confirm new password"
              required
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
              }
              leftSection={<IconLock size="1rem" />}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setActiveStep(1)} disabled={loading}>
                Back
              </Button>

              <Button type="submit" loading={loading} disabled={!isPasswordFormValid}>
                Change Password
              </Button>
            </Group>
          </Stack>
        </form>
      )}
    </Paper>
  );
};

export default ChangePassword;
