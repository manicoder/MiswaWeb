import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Stack,
  PasswordInput,
  LoadingOverlay,
  Alert,
  Group,
  Badge,
  ThemeIcon,
  Card,
} from '@mantine/core';
import {
  IconCheck,
  IconX,
  IconMail,
  IconUser,
  IconShield,
  IconAlertCircle,
  IconClock,
  IconUserPlus,
} from '@tabler/icons-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import api from '../../../services/api';

interface InvitationDetails {
  email: string;
  name: string;
  role: string;
  expiresAt: string;
  inviterName: string;
  isExpired: boolean;
}

const AcceptInvitation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  // State
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isValidToken, setIsValidToken] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  // Validate invitation token
  const validateToken = useCallback(async () => {
    setValidating(true);
    try {
      const response = await api.post('/invitation/validate', { token });

      if (response.data.success && response.data.valid) {
        setIsValidToken(true);
        setInvitation(response.data.invitation);
      } else {
        setIsValidToken(false);
        setError(response.data.message || 'Invalid invitation token');
      }
    } catch (error: unknown) {
      console.error('Error validating invitation:', error);
      setIsValidToken(false);
      setError(error instanceof Error ? error.message : 'Failed to validate invitation');
    } finally {
      setValidating(false);
    }
  }, [token]);

  // Validate token on component mount
  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setValidating(false);
      setError('No invitation token provided');
    }
  }, [token, validateToken]);

  // Accept invitation
  const acceptInvitation = async () => {
    if (!password || !confirmPassword) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please fill in all fields',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    if (password !== confirmPassword) {
      notifications.show({
        title: 'Password Mismatch',
        message: 'Passwords do not match',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    if (password.length < 8) {
      notifications.show({
        title: 'Password Too Short',
        message: 'Password must be at least 8 characters long',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/invitation/accept', {
        token,
        password,
        confirmPassword,
      });

      if (response.data.success) {
        notifications.show({
          title: 'Welcome to MLT Admin!',
          message: 'Your account has been created successfully. Please log in.',
          color: 'green',
          icon: <IconCheck size={16} />,
        });

        // Redirect to login page after a short delay
        setTimeout(() => {
          navigate('/auth/login');
        }, 2000);
      } else {
        notifications.show({
          title: 'Error',
          message: response.data.message || 'Failed to accept invitation',
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
      }
    } catch (error: unknown) {
      console.error('Error accepting invitation:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to accept invitation',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  // Get role badge
  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      Admin: 'red',
      Manager: 'orange',
      User: 'blue',
      Viewer: 'gray',
    };

    return (
      <Badge color={colors[role] || 'blue'} variant="light" size="lg">
        {role}
      </Badge>
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading state
  if (validating) {
    return (
      <Container size="sm" py="xl">
        <LoadingOverlay visible />
        <Paper withBorder shadow="md" p="xl" radius="md">
          <Text ta="center">Validating invitation...</Text>
        </Paper>
      </Container>
    );
  }

  // Error state
  if (!isValidToken || error) {
    return (
      <Container size="sm" py="xl">
        <Paper withBorder shadow="md" p="xl" radius="md">
          <Stack align="center" gap="md">
            <ThemeIcon color="red" size="xl" radius="xl">
              <IconX size={32} />
            </ThemeIcon>
            <Title order={2} ta="center">
              Invalid Invitation
            </Title>
            <Text ta="center" c="dimmed">
              {error || 'This invitation link is invalid or has expired.'}
            </Text>
            <Button onClick={() => navigate('/auth/login')} variant="light">
              Go to Login
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  // Success state - show invitation details and accept form
  return (
    <Container size="sm" py="xl">
      <LoadingOverlay visible={loading} />

      <Stack gap="xl">
        {/* Header */}
        <Paper withBorder shadow="md" p="xl" radius="md">
          <Stack align="center" gap="md">
            <ThemeIcon color="blue" size="xl" radius="xl">
              <IconUserPlus size={32} />
            </ThemeIcon>
            <Title order={2} ta="center">
              You're Invited!
            </Title>
            <Text ta="center" c="dimmed" size="lg">
              Join the MLT Admin team
            </Text>
          </Stack>
        </Paper>

        {/* Invitation Details */}
        {invitation && (
          <Card withBorder shadow="sm" p="lg">
            <Stack gap="md">
              <Title order={3}>Invitation Details</Title>

              <Group justify="space-between">
                <Group gap="sm">
                  <IconMail size={18} color="var(--mantine-color-blue-6)" />
                  <Text fw={500}>Email:</Text>
                </Group>
                <Text>{invitation.email}</Text>
              </Group>

              <Group justify="space-between">
                <Group gap="sm">
                  <IconUser size={18} color="var(--mantine-color-green-6)" />
                  <Text fw={500}>Name:</Text>
                </Group>
                <Text>{invitation.name}</Text>
              </Group>

              <Group justify="space-between">
                <Group gap="sm">
                  <IconShield size={18} color="var(--mantine-color-orange-6)" />
                  <Text fw={500}>Role:</Text>
                </Group>
                {getRoleBadge(invitation.role)}
              </Group>

              <Group justify="space-between">
                <Group gap="sm">
                  <IconUserPlus size={18} color="var(--mantine-color-purple-6)" />
                  <Text fw={500}>Invited by:</Text>
                </Group>
                <Text>{invitation.inviterName}</Text>
              </Group>

              <Group justify="space-between">
                <Group gap="sm">
                  <IconClock size={18} color="var(--mantine-color-red-6)" />
                  <Text fw={500}>Expires:</Text>
                </Group>
                <Text>{formatDate(invitation.expiresAt)}</Text>
              </Group>
            </Stack>
          </Card>
        )}

        {/* Role Information */}
        <Alert icon={<IconShield size={16} />} title="Your Role & Permissions" color="blue">
          <Text size="sm">
            As a <strong>{invitation?.role}</strong>, you'll have access to specific features within
            MLT Admin. Your permissions can be customized by administrators after you join.
          </Text>
        </Alert>

        {/* Accept Form */}
        <Paper withBorder shadow="md" p="xl" radius="md">
          <Stack gap="lg">
            <div>
              <Title order={3} mb="xs">
                Create Your Account
              </Title>
              <Text size="sm" c="dimmed">
                Set up your password to complete the registration process.
              </Text>
            </div>

            <Stack gap="md">
              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                description="Password must be at least 8 characters long"
              />

              <PasswordInput
                label="Confirm Password"
                placeholder="Confirm your password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={
                  confirmPassword && password !== confirmPassword ? 'Passwords do not match' : ''
                }
              />

              <Button
                onClick={acceptInvitation}
                loading={loading}
                size="lg"
                fullWidth
                leftSection={<IconCheck size={18} />}
              >
                Accept Invitation & Create Account
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Security Note */}
        <Alert icon={<IconShield size={16} />} color="green">
          <Text size="sm">
            <strong>Secure Registration:</strong> Your account will be created with enterprise-grade
            security. You'll be able to access the MLT Admin platform immediately after completing
            this registration.
          </Text>
        </Alert>
      </Stack>
    </Container>
  );
};

export default AcceptInvitation;
