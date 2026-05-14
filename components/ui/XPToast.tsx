import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity } from 'react-native';
import { useUIStore } from '@/store/ui';

export function XPToast() {
  const xp = useUIStore((s) => s.xpAnimationPending);
  const clear = useUIStore((s) => s.clearXPAnimation);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (xp <= 0) return;
    opacity.setValue(0);
    translateY.setValue(24);
    scale.setValue(0.6);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 12, stiffness: 180 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 200 }),
      ]),
      Animated.delay(2800),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -16, duration: 250, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.8, duration: 250, useNativeDriver: true }),
      ]),
    ]).start(() => clear());
  }, [xp]);

  if (xp <= 0) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute', top: 64, alignSelf: 'center', zIndex: 100,
        opacity, transform: [{ translateY }, { scale }],
      }}
    >
      <TouchableOpacity
        onPress={() => clear()}
        activeOpacity={0.8}
        style={{
          backgroundColor: '#F59E0B',
          borderRadius: 999, paddingHorizontal: 22, paddingVertical: 10,
          shadowColor: '#F59E0B', shadowOpacity: 0.6, shadowRadius: 14, elevation: 10,
          flexDirection: 'row', alignItems: 'center', gap: 6,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>+{xp} XP</Text>
        <Text style={{ fontSize: 14 }}>⚡</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
