/**
 * MLT Admin Mobile Design System
 * Standardized mobile responsive design patterns
 */

export const MOBILE_DESIGN_SYSTEM = {
  // Container padding/margins
  CONTAINER: {
    padding: {
      mobile: 'sm', // 12px - Standard mobile container padding
      desktop: 'lg', // 24px - Standard desktop container padding
    },
    margin: {
      mobile: 'sm', // 12px - Standard mobile container margin
      desktop: 'lg', // 24px - Standard desktop container margin
    },
  },

  // Typography
  TYPOGRAPHY: {
    title: {
      size: {
        mobile: '1.375rem', // 22px - Mobile title size (readable but not too large)
        desktop: undefined, // Use default Mantine size
      },
      order: {
        mobile: 2, // h2 for mobile (better hierarchy)
        desktop: 1, // h1 for desktop
      },
    },
    text: {
      size: {
        mobile: 'sm', // 14px - Standard mobile text
        desktop: 'md', // 16px - Standard desktop text
      },
    },
    caption: {
      size: {
        mobile: 'xs', // 12px - Small text on mobile
        desktop: 'sm', // 14px - Small text on desktop
      },
    },
  },

  // Spacing
  SPACING: {
    stack: {
      gap: {
        mobile: 'sm', // 12px - Standard stack gap
        desktop: 'md', // 16px - Standard desktop stack gap
      },
    },
    group: {
      gap: {
        mobile: 'xs', // 8px - Tighter group spacing
        desktop: 'sm', // 12px - Standard desktop group spacing
      },
    },
    section: {
      margin: {
        mobile: 'md', // 16px - Section margins
        desktop: 'xl', // 32px - Larger desktop section margins
      },
    },
  },

  // Components
  BUTTON: {
    size: {
      mobile: 'md', // 44px min-height (touch-friendly)
      desktop: 'md', // Same size for consistency
    },
  },

  ACTION_ICON: {
    size: {
      mobile: 'lg', // 48px min-height (touch-friendly)
      desktop: 'lg', // Consistent size
    },
  },

  // Icons
  ICON: {
    title: {
      size: {
        mobile: 24, // Smaller for mobile titles
        desktop: 32, // Larger for desktop titles
      },
    },
    standard: {
      size: {
        mobile: 16, // Standard mobile icon size
        desktop: 20, // Standard desktop icon size
      },
    },
    small: {
      size: {
        mobile: 14, // Small mobile icons
        desktop: 16, // Small desktop icons
      },
    },
  },

  // Cards
  CARD: {
    padding: {
      mobile: 'md', // 16px - Good mobile touch targets
      desktop: 'lg', // 24px - More spacious desktop
    },
  },

  // Tables
  TABLE: {
    cell: {
      padding: {
        mobile: 'xs', // 8px - Compact mobile tables
        desktop: 'sm', // 12px - More spacious desktop
      },
    },
  },

  // Layout
  LAYOUT: {
    header: {
      height: {
        mobile: 60, // Standard mobile header height
        desktop: 70, // Standard desktop header height
      },
    },
  },
} as const;

/**
 * Helper functions for responsive values
 */
export const getMobileResponsive = <T>(values: { mobile: T; desktop: T }, isMobile: boolean): T => {
  return isMobile ? values.mobile : values.desktop;
};

export const getResponsivePadding = (isMobile: boolean): string =>
  getMobileResponsive<string>(MOBILE_DESIGN_SYSTEM.CONTAINER.padding, isMobile);

export const getResponsiveMargin = (isMobile: boolean): string =>
  getMobileResponsive<string>(MOBILE_DESIGN_SYSTEM.CONTAINER.margin, isMobile);

export const getResponsiveTitleSize = (isMobile: boolean): string | undefined =>
  getMobileResponsive<string | undefined>(MOBILE_DESIGN_SYSTEM.TYPOGRAPHY.title.size, isMobile);

export const getResponsiveTitleOrder = (isMobile: boolean): 1 | 2 | 3 | 4 | 5 | 6 =>
  getMobileResponsive<1 | 2 | 3 | 4 | 5 | 6>(MOBILE_DESIGN_SYSTEM.TYPOGRAPHY.title.order, isMobile);

export const getResponsiveTextSize = (isMobile: boolean): string =>
  getMobileResponsive<string>(MOBILE_DESIGN_SYSTEM.TYPOGRAPHY.text.size, isMobile);

export const getResponsiveCaptionSize = (isMobile: boolean): string =>
  getMobileResponsive<string>(MOBILE_DESIGN_SYSTEM.TYPOGRAPHY.caption.size, isMobile);

export const getResponsiveStackGap = (isMobile: boolean): string =>
  getMobileResponsive<string>(MOBILE_DESIGN_SYSTEM.SPACING.stack.gap, isMobile);

export const getResponsiveGroupGap = (isMobile: boolean): string =>
  getMobileResponsive<string>(MOBILE_DESIGN_SYSTEM.SPACING.group.gap, isMobile);

export const getResponsiveSectionMargin = (isMobile: boolean): string =>
  getMobileResponsive<string>(MOBILE_DESIGN_SYSTEM.SPACING.section.margin, isMobile);

export const getResponsiveButtonSize = (isMobile: boolean): string =>
  getMobileResponsive<string>(MOBILE_DESIGN_SYSTEM.BUTTON.size, isMobile);

export const getResponsiveActionIconSize = (isMobile: boolean): string =>
  getMobileResponsive<string>(MOBILE_DESIGN_SYSTEM.ACTION_ICON.size, isMobile);

export const getResponsiveTitleIconSize = (isMobile: boolean): number =>
  getMobileResponsive<number>(MOBILE_DESIGN_SYSTEM.ICON.title.size, isMobile);

export const getResponsiveIconSize = (isMobile: boolean): number =>
  getMobileResponsive<number>(MOBILE_DESIGN_SYSTEM.ICON.standard.size, isMobile);

export const getResponsiveSmallIconSize = (isMobile: boolean): number =>
  getMobileResponsive<number>(MOBILE_DESIGN_SYSTEM.ICON.small.size, isMobile);

export const getResponsiveCardPadding = (isMobile: boolean): string =>
  getMobileResponsive<string>(MOBILE_DESIGN_SYSTEM.CARD.padding, isMobile);
