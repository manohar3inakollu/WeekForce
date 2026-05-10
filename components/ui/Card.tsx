import React from 'react';
import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  variant?: 'default' | 'raised';
  children: React.ReactNode;
}

export function Card({ variant = 'default', children, className, ...props }: CardProps) {
  const bg = variant === 'raised' ? 'bg-surface-raised' : 'bg-surface-overlay';
  return (
    <View className={`${bg} border border-border rounded-2xl p-4 ${className ?? ''}`} {...props}>
      {children}
    </View>
  );
}
