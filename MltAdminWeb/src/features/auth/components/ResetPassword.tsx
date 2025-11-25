import { useState, useEffect } from 'react';
import { Paper, PasswordInput, Button, Title, Text, Container, Stack, Alert } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconLock, IconCheck, IconExclamationMark } from '@tabler/icons-react';
import { ENV } from '../../../config/environment';

interface ResetPasswordProps {
  token: string;
  onResetSuccess: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ token, onResetSuccess }) => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    // Validate passwords in real-time
    const newErrors: string[] = [];

    if (formData.newPassword && formData.newPassword.length < 6) {
      newErrors.push('Password must be at least 6 characters long');
    }

    if (formData.confirmPassword && formData.newPassword !== formData.confirmPassword) {
      newErrors.push('Passwords do not match');
    }

    setErrors(newErrors);
  }, [formData.newPassword, formData.confirmPassword]);

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

      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        notifications.show({
          title: 'Password Reset Successful',
          message: 'Your password has been reset successfully. You can now log in.',
          color: 'green',
          icon: <IconCheck size="1rem" />,
        });
        onResetSuccess();
      } else {
        notifications.show({
          title: 'Reset Failed',
          message: data.message || 'Failed to reset password',
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

  const isFormValid =
    formData.newPassword.length >= 6 &&
    formData.confirmPassword === formData.newPassword &&
    errors.length === 0;

  return (
    <Container size="xs" py={80}>
      <Title ta="center" mb="lg">
        Reset Your Password
      </Title>

      <Paper withBorder shadow="md" p={30} radius="md">
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Text c="dimmed" size="sm" ta="center">
              Enter your new password below.
            </Text>

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

            <Button type="submit" fullWidth loading={loading} disabled={!isFormValid}>
              Reset Password
            </Button>

            <Text ta="center" c="dimmed" size="xs">
              Password must be at least 6 characters long
            </Text>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
};

export default ResetPassword;
