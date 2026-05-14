import React from 'react';
import { TextInput, Text, View, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  required?: boolean;
  hint?: string;
}

export function Input({ label, error, required, hint, ...props }: InputProps) {
  return (
    <View className="gap-1.5">
      {label && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Text className="text-text-secondary text-sm font-medium">{label}</Text>
          {required && <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700', lineHeight: 16 }}>*</Text>}
          {hint && <Text style={{ color: '#55556A', fontSize: 12 }}>{hint}</Text>}
        </View>
      )}
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
