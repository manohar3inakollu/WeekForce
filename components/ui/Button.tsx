import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

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
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
        className={`overflow-hidden rounded-xl ${fullWidth ? 'w-full' : ''} ${isDisabled ? 'opacity-50' : ''}`}
      >
        <LinearGradient
          colors={['#6B6EFF', '#5B5EF4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className={`flex-row items-center justify-center ${s.container}`}
        >
          {loading && <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />}
          <Text className={`text-white font-semibold ${s.text}`}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantStyles = {
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

  const v = variantStyles[variant as 'secondary' | 'ghost' | 'danger'];

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
