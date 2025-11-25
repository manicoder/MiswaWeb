import { useState, useEffect } from 'react';
import {
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Anchor,
  Container,
  Group,
  Stack,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ENV } from '../../../config/environment';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'login' | 'forgot' | 'reset'>('login');
  const [resetToken, setResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Try admin login first
      const API_BASE_URL = ENV.apiUrl;

      const adminResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      if (adminResponse.ok) {
        const data = await adminResponse.json();

        // Store the JWT token and user info
        localStorage.setItem('mlt-admin-token', data.token);
        localStorage.setItem('mlt-admin-user', JSON.stringify(data.user));

        notifications.show({
          title: 'Login Successful',
          message: `Welcome back, ${data.user.name}!`,
          color: 'green',
        });

        // Reload to trigger app re-render
        window.location.reload();
        return;
      }

      // If admin login fails, try user login (with OTP)
      const userResponse = await fetch(`${API_BASE_URL}/auth/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      if (userResponse.ok) {
        const data = await userResponse.json();

        if (data.success) {
          notifications.show({
            title: 'OTP Sent',
            message: data.message,
            color: 'blue',
          });

          // Here you would typically redirect to OTP verification page
          // For now, just show a message
          notifications.show({
            title: 'Check Your Email',
            message: 'Enter the OTP code sent to your email to complete login',
            color: 'blue',
          });
        } else {
          throw new Error(data.message || 'Login failed');
        }
      } else {
        const errorData = await userResponse.json();
        throw new Error(errorData.message || 'Invalid credentials');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid credentials';
      notifications.show({
        title: 'Login Failed',
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // Check URL for reset token on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      setResetToken(token);
      setCurrentView('reset');
    }
  }, []);

  if (currentView === 'forgot') {
    return <ForgotPassword onBackToLogin={() => setCurrentView('login')} />;
  }

  if (currentView === 'reset' && resetToken) {
    return (
      <ResetPassword
        token={resetToken}
        onResetSuccess={() => {
          setCurrentView('login');
          setResetToken(null);
          // Clear the token from URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }}
      />
    );
  }

  return (
    <Container size="xs" py={80}>
      <Title ta="center" mb="lg">
        MLT Admin
      </Title>

      <Paper withBorder shadow="md" p={30} radius="md">
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Email"
              placeholder="your@email.com"
              required
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSubmit(e);
                }
              }}
            />

            <PasswordInput
              label="Password"
              placeholder="Your password"
              required
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSubmit(e);
                }
              }}
            />

            <Group justify="flex-end" mt="md">
              <Anchor component="button" size="sm" onClick={() => setCurrentView('forgot')}>
                Forgot Password?
              </Anchor>
            </Group>

            <Button type="submit" fullWidth loading={loading}>
              Sign in
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
};

export default Login;
