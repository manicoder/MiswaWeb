import React, { useState } from 'react';
import { Paper, TextInput, Button, Title, Container, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { api } from '../../../services/api';

interface OtpRequestFormProps {
  onOtpSent?: (email: string) => void;
}

interface OtpResponse {
  success: boolean;
  error?: string;
  message?: string;
}

const OtpRequestForm: React.FC<OtpRequestFormProps> = ({ onOtpSent }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!email) {
      notifications.show({
        title: 'Error',
        message: 'Please enter your email address',
        color: 'red',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await api.post<OtpResponse>('/auth/send-otp', { email });

      if (response.data.success) {
        notifications.show({
          title: 'Success',
          message: 'OTP sent successfully! Check your email.',
          color: 'green',
        });
        onOtpSent?.(email);
      } else {
        notifications.show({
          title: 'Error',
          message: response.data.error || 'Failed to send OTP',
          color: 'red',
        });
      }
    } catch (err: unknown) {
      console.error('Error sending OTP:', err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : err &&
              typeof err === 'object' &&
              'response' in err &&
              err.response &&
              typeof err.response === 'object' &&
              'data' in err.response &&
              err.response.data &&
              typeof err.response.data === 'object' &&
              'error' in err.response.data
            ? String(err.response.data.error)
            : 'Network error. Please try again.';

      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xs" py={80}>
      <Title ta="center" mb="lg">
        Request OTP
      </Title>

      <Paper withBorder shadow="md" p={30} radius="md">
        <Stack gap="md">
          <TextInput
            label="Email Address"
            placeholder="your@email.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendOtp();
              }
            }}
          />

          <Button fullWidth onClick={handleSendOtp} loading={loading} disabled={!email}>
            Send OTP
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
};

export default OtpRequestForm;
