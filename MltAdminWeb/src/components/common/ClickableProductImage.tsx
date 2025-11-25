import React from 'react';
import { Image, Paper, Box } from '@mantine/core';
import { IconPackage } from '@tabler/icons-react';

interface ClickableProductImageProps {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  fallbackIcon?: 'package' | 'cart';
  radius?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  style?: React.CSSProperties;
  fit?: 'contain' | 'cover';
  showCursor?: boolean;
}

const ClickableProductImage: React.FC<ClickableProductImageProps> = ({
  src,
  alt = 'Product image',
  width = 60,
  height = 60,

  radius = 'md',
  onClick,
  style,
  fit = 'contain',
  showCursor = true,
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  if (!src) {
    const iconSize = Math.round(Math.min(width, height) * 0.4);

    return (
      <Paper
        w={width}
        h={height}
        bg="gray.1"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: showCursor && onClick ? 'pointer' : 'default',
          borderRadius: radius === 'md' ? 8 : radius === 'sm' ? 4 : radius === 'lg' ? 12 : 0,
          ...style,
        }}
        onClick={handleClick}
      >
        <IconPackage size={iconSize} color="var(--mantine-color-gray-5)" />
      </Paper>
    );
  }

  return (
    <Box
      style={{
        width,
        height,
        overflow: 'hidden',
        borderRadius: radius === 'md' ? 8 : radius === 'sm' ? 4 : radius === 'lg' ? 12 : 0,
        cursor: showCursor && onClick ? 'pointer' : 'default',
        ...style,
      }}
      onClick={handleClick}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        radius={0} // Remove radius from Image component since container handles it
        fit={fit}
        style={{
          objectFit: fit,
          width: '100%',
          height: '100%',
          display: 'block',
        }}
        fallbackSrc=""
      />
    </Box>
  );
};

export default ClickableProductImage;
