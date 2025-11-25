import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  Button,
  Group,
  Stack,
  Card,
  Badge,
  Avatar,
  Box,
  Grid,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUser, IconMail, IconUserCircle, IconCheck } from '@tabler/icons-react';
import { ENV } from '../../../config/environment';
import ChangePassword from './ChangePassword';

interface ProfileData {
  name: string;
  email: string;
  role: string;
  lastLogin?: string;
  createdAt: string;
}

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const API_BASE_URL = ENV.apiUrl;
      const token = localStorage.getItem('mlt-admin-token');

      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setProfile(data.user);
        setFormData({
          name: data.user.name,
          email: data.user.email,
        });
      } else {
        notifications.show({
          title: 'Error',
          message: data.message || 'Failed to load profile',
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const API_BASE_URL = ENV.apiUrl;
      const token = localStorage.getItem('mlt-admin-token');

      const response = await fetch(`${API_BASE_URL}/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        notifications.show({
          title: 'Profile Updated',
          message: 'Your profile has been updated successfully.',
          color: 'green',
          icon: <IconCheck size="1rem" />,
        });

        // Update the user data in localStorage if needed
        const currentUser = JSON.parse(localStorage.getItem('mlt-admin-user') || '{}');
        const updatedUser = { ...currentUser, ...formData };
        localStorage.setItem('mlt-admin-user', JSON.stringify(updatedUser));
      } else {
        notifications.show({
          title: 'Update Failed',
          message: data.message || 'Failed to update profile',
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

  const handleCancelEdit = () => {
    setEditMode(false);
    if (profile) {
      setFormData({
        name: profile.name,
        email: profile.email,
      });
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Container size="md" py="xl">
        <Paper shadow="md" p="xl" radius="lg">
          <Stack align="center" gap="md">
            <Text>Loading profile...</Text>
          </Stack>
        </Paper>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container size="md" py="xl">
        <Paper shadow="md" p="xl" radius="lg">
          <Stack align="center" gap="md">
            <Text>Failed to load profile</Text>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Title order={2}>Profile Settings</Title>

        <Grid>
          <Grid.Col span={12}>
            <Paper shadow="md" p="xl" radius="lg">
              <Stack gap="lg">
                <Group justify="space-between">
                  <Title order={3}>Personal Information</Title>
                  <Button
                    variant={editMode ? 'light' : 'outline'}
                    onClick={() => setEditMode(!editMode)}
                    disabled={loading}
                  >
                    {editMode ? 'Cancel' : 'Edit Profile'}
                  </Button>
                </Group>

                {editMode ? (
                  <form onSubmit={handleUpdateProfile}>
                    <Stack gap="md">
                      <TextInput
                        label="Name"
                        placeholder="Enter your name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        leftSection={<IconUser size={16} />}
                      />
                      <TextInput
                        label="Email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        leftSection={<IconMail size={16} />}
                      />

                      <Group justify="flex-end" mt="lg">
                        <Button variant="light" onClick={handleCancelEdit} disabled={loading}>
                          Cancel
                        </Button>
                        <Button type="submit" loading={loading}>
                          Save Changes
                        </Button>
                      </Group>
                    </Stack>
                  </form>
                ) : (
                  <Stack gap="md">
                    <Group>
                      <Avatar size="xl" color="blue">
                        <IconUserCircle size={32} />
                      </Avatar>
                      <Box>
                        <Text size="xl" fw={600}>
                          {profile.name}
                        </Text>
                        <Text c="dimmed">{profile.email}</Text>
                      </Box>
                    </Group>

                    <Grid>
                      <Grid.Col span={6}>
                        <Text size="sm" fw={500} c="dimmed">
                          Role
                        </Text>
                        <Badge color="blue" size="lg">
                          {profile.role}
                        </Badge>
                      </Grid.Col>
                      <Grid.Col span={6}>
                        <Text size="sm" fw={500} c="dimmed">
                          Last Login
                        </Text>
                        <Text size="lg">{formatDate(profile.lastLogin)}</Text>
                      </Grid.Col>
                    </Grid>
                  </Stack>
                )}
              </Stack>
            </Paper>
          </Grid.Col>

          <Grid.Col span={12}>
            <Paper shadow="md" p="xl" radius="lg">
              <Stack gap="lg">
                <Title order={3}>Account Security</Title>
                <ChangePassword />
              </Stack>
            </Paper>
          </Grid.Col>

          {profile.role === 'Admin' && (
            <Grid.Col span={12}>
              <Card withBorder shadow="sm" p="lg" radius="md">
                <Stack gap="md">
                  <Title order={4}>Permissions</Title>
                  <Text size="sm" c="dimmed">
                    Manage user permissions and access controls
                  </Text>

                  <Grid>{/* Add permission management logic here */}</Grid>
                </Stack>
              </Card>
            </Grid.Col>
          )}
        </Grid>
      </Stack>
    </Container>
  );
};

export default Profile;
