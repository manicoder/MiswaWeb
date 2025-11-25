import React from 'react';
import { useTheme } from '../../contexts/useTheme';

// Import SVG files as URLs
import XpressBeesIcon from '../../assets/icons/xpressbees-icon.svg';
import BluedartIcon from '../../assets/icons/bluedart-icon.svg';
import AmazonIcon from '../../assets/icons/amazon-icon.svg';
import DelhiveryIcon from '../../assets/icons/delhivery-icon.svg';
import OthersIcon from '../../assets/icons/others-icon.svg';

interface CourierIconProps {
  courierName: string;
  size?: number;
  className?: string;
}

const CourierIcon: React.FC<CourierIconProps> = ({ courierName, size = 24, className = '' }) => {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const getIconSrc = () => {
    const lowerCourierName = courierName.toLowerCase();

    // Check for XpressBees variants
    if (lowerCourierName.includes('xpressbees')) {
      return XpressBeesIcon;
    }

    // Check for Amazon variants
    if (lowerCourierName.includes('amazon')) {
      return AmazonIcon;
    }

    // Check for Bluedart variants
    if (lowerCourierName.includes('bluedart')) {
      return BluedartIcon;
    }

    // Check for Delhivery variants
    if (lowerCourierName.includes('delhivery')) {
      return DelhiveryIcon;
    }

    // Exact matches for others
    switch (lowerCourierName) {
      case 'others':
        return OthersIcon;
      default:
        return OthersIcon;
    }
  };

  return (
    <img
      src={getIconSrc()}
      alt={`${courierName} icon`}
      width={size}
      height={size}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '4px',
        objectFit: 'contain',
        backgroundColor: isDark ? 'var(--mantine-color-gray-0)' : 'transparent',
        padding: isDark ? '2px' : '0',
        boxShadow: isDark ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
      }}
    />
  );
};

export default CourierIcon;
