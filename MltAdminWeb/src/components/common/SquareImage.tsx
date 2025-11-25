import React from 'react';
import { Image, Center, Skeleton } from '@mantine/core';
import { IconPackage, IconShoppingCart } from '@tabler/icons-react';

interface SquareImageProps {
  src?: string;
  alt?: string;
  size?: number;
  fallbackIcon?: 'package' | 'cart';
  radius?: string;
  isLoading?: boolean;
}

const SquareImage: React.FC<SquareImageProps> = ({
  src,
  alt = 'Product image',
  size = 60,
  fallbackIcon = 'package',
  radius = 'md',
  isLoading = false,
}) => {
  // Show skeleton when loading
  if (isLoading) {
    return <Skeleton height={size} width={size} radius={radius} />;
  }
  if (!src) {
    const Icon = fallbackIcon === 'cart' ? IconShoppingCart : IconPackage;
    const iconSize = Math.round(size * 0.4); // Icon is 40% of container size

    return (
      <Center
        style={{
          width: size,
          height: size,
          backgroundColor: 'var(--mantine-color-gray-1)',
          borderRadius: radius === 'md' ? 8 : radius === 'sm' ? 4 : radius === 'lg' ? 12 : 0,
        }}
      >
        <Icon size={iconSize} color="var(--mantine-color-gray-6)" />
      </Center>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        overflow: 'hidden',
        borderRadius: radius === 'md' ? 8 : radius === 'sm' ? 4 : radius === 'lg' ? 12 : 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        radius={0} // Remove radius from Image component since container handles it
        style={{
          objectFit: 'cover',
          width: '100%',
          height: '100%',
          display: 'block',
        }}
        fallbackSrc=""
      />
    </div>
  );
};

export default SquareImage;
