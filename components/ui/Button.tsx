import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

const variantStyles = {
  primary: {
    container: 'bg-accent',
    text: 'text-white font-semibold',
  },
  secondary: {
    container: 'bg-surface-overlay border border-border',
    text: 'text-text-primary font-medium',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-accent font-medium',
  },
  danger: {
    container: 'bg-danger',
    text: 'text-white font-semibold',
  },
};

const sizeStyles = {
  sm: { container: 'px-3 py-1.5 rounded-md', text: 'text-sm' },
  md: { container: 'px-5 py-3 rounded-xl', text: 'text-base' },
  lg: { container: 'px-6 py-4 rounded-xl', text: 'text-lg' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      className={`${v.container} ${s.container} flex-row items-center justify-center ${fullWidth ? 'w-full' : ''} ${isDisabled ? 'opacity-50' : ''}`}
      activeOpacity={0.8}
    >
      {loading && <ActivityIndicator size="small" color="#fff" className="mr-2" />}
      <Text className={`${v.text} ${s.text}`}>{label}</Text>
    </TouchableOpacity>
  );
}
