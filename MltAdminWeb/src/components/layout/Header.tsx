import {
  Group,
  Burger,
  TextInput,
  ActionIcon,
  Menu,
  Avatar,
  Text,
  UnstyledButton,
  Image,
  Tooltip,
} from '@mantine/core';
import { IconSearch, IconSun, IconMoon, IconSettings, IconLogout } from '@tabler/icons-react';
import { useTheme } from '../../contexts/useTheme';
import { useMediaQuery } from '@mantine/hooks';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import MLTLogo from '../../assets/icons/mlt-admin-logo.svg';
import { ENV } from '../../config/environment';
import { fetchApiVersion, logout } from '../../services/api';
import {
  getResponsiveGroupGap,
  getResponsiveTextSize,
  getResponsiveActionIconSize,
  getResponsiveIconSize,
} from '../../constants/mobileDesignSystem';
import GlobalCostFetchingProgress from '../common/GlobalCostFetchingProgress';

interface HeaderProps {
  opened: boolean;
  toggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ opened, toggle }) => {
  const { colorScheme, toggleColorScheme } = useTheme();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  const navigate = useNavigate();
  const [apiVersion, setApiVersion] = useState<string>('');

  useEffect(() => {
    const getApiVersion = async () => {
      const version = await fetchApiVersion();
      setApiVersion(version);
    };
    getApiVersion();
  }, []);

  const handleLogout = async () => {
    try {
      // Get current token
      const token = localStorage.getItem('mlt-admin-token');

      if (token) {
        // Call logout API
        const success = await logout();

        if (success) {
          // Clear localStorage
          localStorage.removeItem('mlt-admin-token');
          localStorage.removeItem('mlt-admin-user');

          // Reload the app to trigger authentication check and show login
          window.location.reload();
        } else {
          // Fallback: Clear localStorage and reload anyway
          localStorage.removeItem('mlt-admin-token');
          localStorage.removeItem('mlt-admin-user');
          window.location.reload();
        }
      } else {
        // No token found, just clear localStorage and reload
        localStorage.removeItem('mlt-admin-token');
        localStorage.removeItem('mlt-admin-user');
        window.location.reload();
      }
    } catch {
      // Fallback: Clear localStorage and reload
      localStorage.removeItem('mlt-admin-token');
      localStorage.removeItem('mlt-admin-user');
      window.location.reload();
    }
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  return (
    <Group h="100%" px="md" justify="space-between" wrap="nowrap">
      <Group gap={getResponsiveGroupGap(isMobile)} wrap="nowrap">
        <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" />
        {isMobile ? (
          <Group gap="xs" wrap="nowrap">
            <Image src={MLTLogo} alt="MLT Admin" height={32} fit="contain" />
            <Tooltip label={`Web: ${ENV.version} | API: ${apiVersion || 'Loading...'}`}>
              <Text
                size="xs"
                c="dimmed"
                style={{
                  whiteSpace: 'nowrap',
                  minWidth: 'fit-content',
                }}
              >
                v{ENV.version}
              </Text>
            </Tooltip>
          </Group>
        ) : (
          <Group gap="xs" wrap="nowrap">
            <Text
              size={getResponsiveTextSize(isMobile)}
              fw={600}
              style={{
                whiteSpace: 'nowrap',
                minWidth: 'fit-content',
              }}
            >
              MLT Admin
            </Text>
            <Tooltip label={`Web: ${ENV.version} | API: ${apiVersion || 'Loading...'}`}>
              <Text
                size="xs"
                c="dimmed"
                style={{
                  whiteSpace: 'nowrap',
                  minWidth: 'fit-content',
                }}
              >
                v{ENV.version}
              </Text>
            </Tooltip>
          </Group>
        )}
      </Group>

      <Group gap={getResponsiveGroupGap(isMobile)} wrap="nowrap">
        {/* Global Cost Fetching Progress */}
        <GlobalCostFetchingProgress />

        {/* Search - Hide on very small screens */}
        {!isMobile && (
          <TextInput
            placeholder="Search..."
            leftSection={<IconSearch size={getResponsiveIconSize(isMobile)} />}
            size="sm"
            style={{
              width: isTablet ? 200 : 300,
              minWidth: isTablet ? 150 : 200,
              maxWidth: isTablet ? 250 : 400,
            }}
          />
        )}

        {/* Theme toggle */}
        <ActionIcon
          variant="subtle"
          size={getResponsiveActionIconSize(isMobile)}
          onClick={toggleColorScheme}
          title="Toggle theme"
          aria-label="Toggle color scheme"
        >
          {colorScheme === 'dark' ? (
            <IconSun size={getResponsiveIconSize(isMobile)} />
          ) : (
            <IconMoon size={getResponsiveIconSize(isMobile)} />
          )}
        </ActionIcon>

        {/* User menu */}
        <Menu position="bottom-end" withArrow>
          <Menu.Target>
            <UnstyledButton>
              <Group gap="xs" wrap="nowrap">
                <Avatar size={isMobile ? 'sm' : 'sm'} color="blue">
                  U
                </Avatar>
                {!isMobile && (
                  <Text size="sm" fw={500} style={{ whiteSpace: 'nowrap' }}>
                    Admin User
                  </Text>
                )}
              </Group>
            </UnstyledButton>
          </Menu.Target>

          <Menu.Dropdown>
            {/* Show search in menu on mobile */}
            {isMobile && (
              <>
                <Menu.Item>
                  <TextInput
                    placeholder="Search..."
                    leftSection={<IconSearch size={getResponsiveIconSize(isMobile)} />}
                    size="sm"
                    style={{ width: '100%' }}
                  />
                </Menu.Item>
                <Menu.Divider />
              </>
            )}
            <Menu.Item
              leftSection={<IconSettings size={getResponsiveIconSize(isMobile)} />}
              onClick={handleSettingsClick}
            >
              Settings
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              leftSection={<IconLogout size={getResponsiveIconSize(isMobile)} />}
              onClick={handleLogout}
              color="red"
            >
              Logout
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
};

export default Header;
