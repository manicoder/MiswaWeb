import React from 'react';

// Import custom platform icons
import ShopifyIcon from '../../assets/icons/shopify-store.svg';
import AmazonIcon from '../../assets/icons/amazon-store.svg';
import FlipkartIcon from '../../assets/icons/flipkart-store.svg';

interface PlatformIconProps {
  platform: string;
  size?: number;
  color?: string;
}

const PlatformIcon: React.FC<PlatformIconProps> = ({
  platform,
  size = 20,
  color = 'var(--mantine-color-blue-6)',
}) => {
  const getIconSrc = () => {
    switch (platform.toLowerCase()) {
      case 'shopify':
        return ShopifyIcon;
      case 'amazon':
        return AmazonIcon;
      case 'flipkart':
        return FlipkartIcon;
      default:
        return null;
    }
  };

  const iconSrc = getIconSrc();

  if (iconSrc) {
    return (
      <img
        src={iconSrc}
        alt={`${platform} icon`}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
        }}
      />
    );
  }

  // Fallback to a generic icon if no custom icon is found
  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: '50%',
      }}
    />
  );
};

export default PlatformIcon;
