import React from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps } from '@mui/material';

export interface ButtonProps extends MuiButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'contained' | 'outlined' | 'text';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'contained',
  loading = false,
  disabled,
  children,
  ...props 
}) => {
  const getVariant = (): MuiButtonProps['variant'] => {
    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'danger':
        return 'contained';
      default:
        return variant as MuiButtonProps['variant'];
    }
  };

  const getColor = (): MuiButtonProps['color'] => {
    switch (variant) {
      case 'primary':
        return 'primary';
      case 'secondary':
        return 'secondary';
      case 'danger':
        return 'error';
      default:
        return 'primary';
    }
  };

  return (
    <MuiButton
      {...props}
      variant={getVariant()}
      color={getColor()}
      disabled={disabled || loading}
    >
      {loading ? 'Loading...' : children}
    </MuiButton>
  );
};