import { useState } from 'react';
import {
  Paper,
  TextInput,
  Button,
  Title,
  Text,
  Container,
  Stack,
  Alert,
  Group,
  PasswordInput,
  Stepper,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconMail, IconCheck, IconLock, IconArrowLeft } from '@tabler/icons-react';
import { ENV } from '../../../config/environment';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const API_BASE_URL = ENV.apiUrl;

      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setActiveStep(1); // Go directly to password reset step
        notifications.show({
          title: 'OTP Sent',
          message:
            'A verification code has been sent to your email. You can now enter the code and your new password.',
          color: 'blue',
          icon: <IconMail size="1rem" />,
        });
      } else {
        notifications.show({
          title: 'Error',
          message: data.message || 'Failed to send verification code',
          color: 'red',
        });
      }
    } catch (error) {
      // Provide more specific error messages
      let errorMessage = 'Unable to connect to server. Please try again.';

      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Network connection failed. Please check your internet connection.';
      } else if (error instanceof Error) {
        errorMessage = `Connection error: ${error.message}`;
      }

      notifications.show({
        title: 'Network Error',
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const API_BASE_URL = ENV.apiUrl;

      const response = await fetch(`${API_BASE_URL}/auth/reset-password-with-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otpCode,
          newPassword,
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
        onBackToLogin();
      } else {
        notifications.show({
          title: 'Reset Failed',
          message: data.message || 'Failed to reset password',
          color: 'red',
        });
      }
    } catch (error) {
      // Provide more specific error messages
      let errorMessage = 'Unable to connect to server. Please try again.';

      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Network connection failed. Please check your internet connection.';
      } else if (error instanceof Error) {
        errorMessage = `Connection error: ${error.message}`;
      }

      notifications.show({
        title: 'Network Error',
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xs" px="xs">
      <Paper withBorder shadow="md" p={30} radius="md" mt={30}>
        <Title size="h3" mb="md">
          Reset Password
        </Title>

        <Stepper active={activeStep} mb="xl">
          <Stepper.Step label="Email" description="Enter your email">
            <IconMail size="1rem" />
          </Stepper.Step>
          <Stepper.Step label="Reset Password" description="Enter OTP and new password">
            <IconLock size="1rem" />
          </Stepper.Step>
        </Stepper>

        {activeStep === 0 && (
          <form onSubmit={handleRequestOTP}>
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Enter your email address and we'll send you a verification code to reset your
                password.
              </Text>

              <TextInput
                label="Email"
                placeholder="Enter your email"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftSection={<IconMail size="1rem" />}
              />

              <Group justify="space-between" mt="md">
                <Button
                  variant="light"
                  onClick={onBackToLogin}
                  leftSection={<IconArrowLeft size="1rem" />}
                >
                  Back to Login
                </Button>
                <Button type="submit" loading={loading}>
                  Send Verification Code
                </Button>
              </Group>
            </Stack>
          </form>
        )}

        {activeStep === 1 && (
          <form onSubmit={handleResetPassword}>
            <Stack gap="md">
              <Alert icon={<IconMail size="1rem" />} title="Check Your Email" color="blue">
                A 6-digit verification code has been sent to {email}
              </Alert>

              <TextInput
                label="Verification Code"
                placeholder="Enter 6-digit code"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
              />

              {passwordError && (
                <Alert color="red" title="Error">
                  {passwordError}
                </Alert>
              )}

              <PasswordInput
                label="New Password"
                placeholder="Enter new password"
                required
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError('');
                }}
                leftSection={<IconLock size="1rem" />}
              />

              <PasswordInput
                label="Confirm Password"
                placeholder="Confirm new password"
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError('');
                }}
                leftSection={<IconLock size="1rem" />}
              />

              <Group justify="space-between" mt="md">
                <Button variant="light" onClick={() => setActiveStep(0)}>
                  Back
                </Button>
                <Button
                  type="submit"
                  loading={loading}
                  disabled={
                    otpCode.length !== 6 ||
                    !newPassword ||
                    !confirmPassword ||
                    newPassword !== confirmPassword
                  }
                >
                  Reset Password
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Paper>
    </Container>
  );
};

export default ForgotPassword;
