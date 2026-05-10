import React from 'react';
import { TextInput, Text, View, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, ...props }: InputProps) {
  return (
    <View className="gap-1.5">
      {label && <Text className="text-text-secondary text-sm font-medium">{label}</Text>}
      <TextInput
        className={`bg-surface-raised border ${error ? 'border-danger' : 'border-border'} rounded-xl px-4 py-3 text-text-primary text-base`}
        placeholderTextColor="#55556A"
        selectionColor="#5B5EF4"
        {...props}
      />
      {error && <Text className="text-danger text-xs">{error}</Text>}
    </View>
  );
}
