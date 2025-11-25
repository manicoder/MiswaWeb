import React, { useState, useEffect } from 'react';
import {
  NavLink,
  ScrollArea,
  Stack,
  Group,
  Text,
  ThemeIcon,
  Badge,
  Collapse,
  ActionIcon,
  Divider,
  Image,
  Tooltip,
  Menu,
} from '@mantine/core';
import {
  IconDashboard,
  IconPackage,
  IconUsers,
  IconShoppingCart,
  IconClipboardList,
  IconTruck,
  IconBuilding,
  IconPackageExport,
  IconChevronDown,
  IconChevronRight,
  IconSettings,
  IconTool,
  IconChevronsLeft,
  IconChevronsRight,
  IconUserCircle,
  IconDatabase,
  IconCash,
  IconReceipt,
  IconChartBar,
  IconCreditCard,
} from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@mantine/hooks';
import PlatformIcon from '../common/PlatformIcon';
import mltAdminLogo from '../../assets/icons/mlt-admin-logo.svg';
import { getResponsivePadding } from '../../constants/mobileDesignSystem';

// Types for navigation structure (inline to avoid unused type errors)
// These are defined inline with the actual data structure below

interface SidebarProps {
  onNavClick?: () => void;
  onToggle?: () => void;
  isCollapsed?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ onNavClick, onToggle, isCollapsed = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // State for expanded/collapsed groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    DASHBOARD: true, // Common dashboard expanded by default
    SHOPIFY: true, // Shopify expanded by default
    AMAZON: false, // Amazon collapsed by default
    FLIPKART: false, // Flipkart collapsed by default
    SHIPPING: false, // Shipping collapsed by default
    WAREHOUSING: false, // Warehousing collapsed by default
    FINANCE: false, // Finance collapsed by default
    TOOLS: false, // Tools collapsed by default
    SETTINGS: true, // Settings expanded by default
  });

  // Load expanded state from localStorage on component mount
  useEffect(() => {
    const savedState = localStorage.getItem('mlt-sidebar-expanded-groups');
    if (savedState) {
      try {
        setExpandedGroups(JSON.parse(savedState));
      } catch (_error) {
        console.error('Failed to parse saved sidebar state:', _error);
      }
    }
  }, []);

  // Save expanded state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('mlt-sidebar-expanded-groups', JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  const navigationSections = [
    {
      sectionLabel: null, // No section label for dashboard
      groups: [
        {
          group: 'DASHBOARD',
          color: 'blue',
          icon: IconDashboard,
          items: [{ icon: IconDashboard, label: 'Overview', href: '/dashboard' }],
        },
      ],
    },
    {
      sectionLabel: 'E-Commerce',
      groups: [
        {
          group: 'SHOPIFY',
          color: 'green',
          platform: 'Shopify',
          items: [
            {
              icon: IconDashboard,
              label: 'Dashboard',
              href: '/shopify/dashboard',
            },
            {
              icon: IconShoppingCart,
              label: 'Orders',
              href: '/shopify/orders',
            },
            { icon: IconPackage, label: 'Products', href: '/shopify/products' },
            { icon: IconUsers, label: 'Customers', href: '/shopify/customers' },
            {
              icon: IconDatabase,
              label: 'Database Inventory',
              href: '/shopify/database-inventory',
            },
            /*

            { icon: IconClipboardList, label: 'Inventory (Legacy)', href: '/shopify/inventory' },
            { icon: IconSearch, label: 'Smart Search Inventory', href: '/shopify/smart-search-inventory' },
*/
          ],
        },
        {
          group: 'AMAZON',
          color: 'orange',
          platform: 'Amazon',
          items: [{ icon: IconPackage, label: 'Products', href: '/amazon/products' }],
        },
        {
          group: 'FLIPKART',
          color: 'yellow',
          platform: 'Flipkart',
          items: [
            {
              icon: IconPackage,
              label: 'Products',
              href: '/flipkart/products',
            },
          ],
        },
      ],
    },
    {
      sectionLabel: 'Logistics',
      groups: [
        {
          group: 'SHIPPING',
          color: 'blue',
          icon: IconTruck,
          items: [
            {
              icon: IconClipboardList,
              label: 'Job Management',
              href: '/logistics/shipping/jobs',
            },
            {
              icon: IconPackage,
              label: 'Label Management',
              href: '/logistics/shipping/labels',
            },
          ],
        },
        {
          group: 'WAREHOUSING',
          color: 'teal',
          icon: IconBuilding,
          items: [
            {
              icon: IconBuilding,
              label: 'Warehouse Manager',
              href: '/logistics/warehouse-manager',
            },
            {
              icon: IconPackageExport,
              label: 'Warehouse Fulfillment',
              href: '/logistics/warehouse-fulfillment',
            },
          ],
        },
      ],
    },
    {
      sectionLabel: 'Finance',
      groups: [
        {
          group: 'FINANCE',
          color: 'green',
          icon: IconCash,
          items: [
            {
              icon: IconChartBar,
              label: 'Dashboard',
              href: '/finance/dashboard',
            },
            {
              icon: IconReceipt,
              label: 'Expense Management',
              href: '/finance/expense-management',
            },
            {
              icon: IconClipboardList,
              label: 'Purchase Orders',
              href: '/finance/purchase-orders',
            },
            {
              icon: IconReceipt,
              label: 'Purchase Entries',
              href: '/finance/purchase-entries',
            },
            {
              icon: IconCreditCard,
              label: 'Supplier Payments',
              href: '/finance/supplier-payments',
            },
            {
              icon: IconBuilding,
              label: 'Suppliers',
              href: '/finance/add-suppliers',
            },
            {
              icon: IconReceipt,
              label: 'Sales',
              href: '/finance/sales',
            },
            {
              icon: IconDatabase,
              label: 'Accounting System',
              href: '/finance/accounting',
            },
            {
              icon: IconChartBar,
              label: 'Accounting Reports',
              href: '/finance/accounting/reports',
            },
          ],
        },
      ],
    },
    {
      sectionLabel: 'Tools/Utilities',
      groups: [
        {
          group: 'TOOLS',
          color: 'indigo',
          icon: IconTool,
          items: [
            {
              icon: IconTool,
              label: 'PDF Manager',
              href: '/tools/pdf-manager',
            },
          ],
        },
      ],
    },
    {
      sectionLabel: 'System',
      groups: [
        {
          group: 'SETTINGS',
          color: 'blue',
          icon: IconSettings,
          items: [
            { icon: IconUserCircle, label: 'Profile', href: '/profile' },
            { icon: IconUsers, label: 'Team Management', href: '/team' },
            { icon: IconSettings, label: 'Settings', href: '/settings' },
          ],
        },
      ],
    },
  ];

  const handleNavigation = (href: string) => {
    // Navigate to all platform routes
    navigate(href);
    // Close mobile navigation after clicking a link
    if (onNavClick) {
      onNavClick();
    }
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const isRouteActive = (href: string) => {
    return (
      location.pathname === href ||
      (href.includes('/products') && location.pathname.startsWith(href))
    );
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Logo and Toggle Section */}
      <div
        style={{
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1rem',
          borderBottom: '1px solid var(--mantine-color-default-border)',
          backgroundColor: 'var(--mantine-color-default)',
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <Group gap="sm" style={{ flex: 1 }}>
          {!isCollapsed && (
            <Image
              src={mltAdminLogo}
              alt="MLT Admin"
              h={isMobile ? 28 : 36}
              w="auto"
              style={{ flexShrink: 0 }}
              fallbackSrc="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzIyOEJFNiIvPgo8cGF0aCBkPSJNOCAxMkgxMlYyNEg4VjEyWk0xNiAxMkgyMFYyNEgxNlYxMlpNMjQgMTJIMjhWMjRIMjRWMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K"
            />
          )}
        </Group>

        {/* Toggle Button */}
        {!isMobile && onToggle && (
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={onToggle}
            style={{ flexShrink: 0 }}
          >
            {isCollapsed ? <IconChevronsRight size={16} /> : <IconChevronsLeft size={16} />}
          </ActionIcon>
        )}

        {/* Mobile Close Button */}
        {isMobile && onNavClick && (
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={onNavClick}
            style={{ flexShrink: 0 }}
          >
            <IconSettings size={16} />
          </ActionIcon>
        )}
      </div>

      {/* Navigation Content */}
      <ScrollArea
        style={{ flex: 1 }}
        px={isCollapsed ? 'xs' : getResponsivePadding(isMobile)}
        py="lg"
      >
        <Stack gap="lg">
          {navigationSections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {section.sectionLabel && !isCollapsed && (
                <>
                  <Text
                    size="xs"
                    fw={700}
                    c="dimmed"
                    tt="uppercase"
                    px="xs"
                    mb="md"
                    style={{ letterSpacing: '0.5px' }}
                  >
                    {section.sectionLabel}
                  </Text>
                </>
              )}

              <Stack gap="md">
                {section.groups.map((group) => (
                  <div key={group.group}>
                    {isCollapsed ? (
                      <Menu
                        trigger="hover"
                        position="right-start"
                        offset={10}
                        withArrow
                        transitionProps={{
                          transition: 'pop-top-left',
                          duration: 200,
                        }}
                      >
                        <Menu.Target>
                          <Group
                            mb="lg"
                            px="xs"
                            style={{
                              cursor: 'pointer',
                              justifyContent: 'center',
                              minHeight: '44px',
                              borderRadius: '8px',
                              transition: 'background-color 0.2s ease',
                            }}
                            onClick={() => toggleGroup(group.group)}
                            className="sidebar-group-hover"
                          >
                            {'platform' in group ? (
                              <PlatformIcon platform={group.platform} size={24} />
                            ) : 'icon' in group ? (
                              React.createElement(group.icon!, {
                                size: 24,
                                color: `var(--mantine-color-${group.color}-6)`,
                              })
                            ) : null}
                          </Group>
                        </Menu.Target>
                        <Menu.Dropdown
                          style={{
                            minWidth: '200px',
                            backgroundColor: 'var(--mantine-color-default)',
                            border: '1px solid var(--mantine-color-default-border)',
                          }}
                        >
                          <Menu.Label
                            style={{
                              color: `var(--mantine-color-${group.color}-6)`,
                              fontWeight: 600,
                              fontSize: '12px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            {'platform' in group ? (
                              <PlatformIcon platform={group.platform} size={16} />
                            ) : 'icon' in group ? (
                              React.createElement(group.icon!, {
                                size: 16,
                                color: `var(--mantine-color-${group.color}-6)`,
                              })
                            ) : null}
                            {group.group}
                            {group.group === 'SHOPIFY' && (
                              <Badge size="xs" color="green" variant="light">
                                Active
                              </Badge>
                            )}
                            {group.group === 'AMAZON' && (
                              <Badge size="xs" color="orange" variant="light">
                                Beta
                              </Badge>
                            )}
                            {group.group === 'FLIPKART' && (
                              <Badge size="xs" color="yellow" variant="light">
                                Beta
                              </Badge>
                            )}
                            {(group.group === 'SHIPPING' || group.group === 'WAREHOUSING') && (
                              <Badge size="xs" color="gray" variant="light">
                                Soon
                              </Badge>
                            )}
                            {group.group === 'TOOLS' && (
                              <Badge size="xs" color="green" variant="light">
                                New
                              </Badge>
                            )}
                            {group.group === 'FINANCE' && (
                              <Badge size="xs" color="green" variant="light">
                                New
                              </Badge>
                            )}
                          </Menu.Label>
                          {group.items.map((item) => {
                            const isActive = isRouteActive(item.href);

                            return (
                              <Menu.Item
                                key={item.href}
                                onClick={() => handleNavigation(item.href)}
                                className={isActive ? 'menu-item-active' : ''}
                                style={{
                                  fontWeight: isActive ? 600 : 400,
                                }}
                                leftSection={
                                  <ThemeIcon
                                    variant="light"
                                    size="sm"
                                    color={isActive ? 'blue' : 'gray'}
                                  >
                                    <item.icon size={16} />
                                  </ThemeIcon>
                                }
                              >
                                {item.label}
                              </Menu.Item>
                            );
                          })}
                        </Menu.Dropdown>
                      </Menu>
                    ) : (
                      <Group
                        mb="sm"
                        px="xs"
                        style={{
                          cursor: 'pointer',
                          justifyContent: 'flex-start',
                          minHeight: '40px',
                        }}
                        onClick={() => toggleGroup(group.group)}
                      >
                        {'platform' in group ? (
                          <PlatformIcon platform={group.platform} size={isMobile ? 24 : 42} />
                        ) : 'icon' in group ? (
                          React.createElement(group.icon!, {
                            size: isMobile ? 24 : 28,
                            color: `var(--mantine-color-${group.color}-6)`,
                          })
                        ) : null}
                        <Text size="xs" fw={600} c={group.color} tt="uppercase" style={{ flex: 1 }}>
                          {group.group}
                        </Text>
                        {group.group === 'SHOPIFY' && (
                          <Badge size="xs" color="green" variant="light">
                            Active
                          </Badge>
                        )}
                        {group.group === 'AMAZON' && (
                          <Badge size="xs" color="orange" variant="light">
                            Beta
                          </Badge>
                        )}
                        {group.group === 'FLIPKART' && (
                          <Badge size="xs" color="yellow" variant="light">
                            Beta
                          </Badge>
                        )}
                        {(group.group === 'SHIPPING' || group.group === 'WAREHOUSING') && (
                          <Badge size="xs" color="gray" variant="light">
                            Soon
                          </Badge>
                        )}
                        {group.group === 'TOOLS' && (
                          <Badge size="xs" color="green" variant="light">
                            New
                          </Badge>
                        )}
                        {group.group === 'FINANCE' && (
                          <Badge size="xs" color="green" variant="light">
                            New
                          </Badge>
                        )}
                        <ActionIcon variant="subtle" size="sm" color={group.color}>
                          {expandedGroups[group.group] ? (
                            <IconChevronDown size={14} />
                          ) : (
                            <IconChevronRight size={14} />
                          )}
                        </ActionIcon>
                      </Group>
                    )}

                    <Collapse in={expandedGroups[group.group] && !isCollapsed}>
                      <Stack gap={2} pl="sm">
                        {group.items.map((item) => {
                          const isActive = isRouteActive(item.href);

                          const navItem = (
                            <NavLink
                              key={item.href}
                              active={isActive}
                              onClick={() => handleNavigation(item.href)}
                              style={{
                                borderRadius: 8,
                                cursor: 'pointer',
                                justifyContent: isCollapsed ? 'center' : 'flex-start',
                                minHeight: '44px',
                              }}
                              leftSection={
                                <ThemeIcon
                                  variant="light"
                                  size={isCollapsed ? 'md' : 'sm'}
                                  color={isActive ? group.color : 'gray'}
                                >
                                  <item.icon size={isCollapsed ? 20 : 16} />
                                </ThemeIcon>
                              }
                              label={
                                !isCollapsed ? (
                                  <Text size="sm" fw={isActive ? 600 : 400}>
                                    {item.label}
                                  </Text>
                                ) : null
                              }
                            />
                          );

                          return isCollapsed ? (
                            <Tooltip
                              key={item.href}
                              label={item.label}
                              position="right"
                              offset={10}
                              withArrow
                            >
                              {navItem}
                            </Tooltip>
                          ) : (
                            navItem
                          );
                        })}
                      </Stack>
                    </Collapse>
                  </div>
                ))}
              </Stack>

              {section.sectionLabel &&
                !isCollapsed &&
                sectionIndex < navigationSections.length - 1 && <Divider my="lg" />}
            </div>
          ))}
        </Stack>
      </ScrollArea>
    </div>
  );
};

export default Sidebar;
