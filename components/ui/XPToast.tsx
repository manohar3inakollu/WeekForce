import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { useUIStore } from '@/store/ui';

export function XPToast() {
  const xp = useUIStore((s) => s.xpAnimationPending);
  const clear = useUIStore((s) => s.clearXPAnimation);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (xp <= 0) return;
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]),
      Animated.delay(1200),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 300, useNativeDriver: true }),
      ]),
    ]).start(() => {
      clear();
      translateY.setValue(20);
    });
  }, [xp]);

  if (xp <= 0) return null;

  return (
    <Animated.View
      style={{ opacity, transform: [{ translateY }] }}
      className="absolute top-16 self-center z-50 bg-xp rounded-full px-5 py-2"
      pointerEvents="none"
    >
      <Text className="text-white font-bold text-base">+{xp} XP</Text>
    </Animated.View>
  );
}
