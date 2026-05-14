import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore } from '@/store/ui';

export function TaskCompleteToast() {
  const pending = useUIStore((s) => s.taskCompletePending);
  const clear = useUIStore((s) => s.clearTaskComplete);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const scale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (!pending) return;
    opacity.setValue(0);
    translateY.setValue(20);
    scale.setValue(0.7);

    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 220 }),
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 12 }),
      ]),
      Animated.delay(1300),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -12, duration: 200, useNativeDriver: true }),
      ]),
    ]).start(() => clear());
  }, [pending]);

  if (!pending) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', top: 64, alignSelf: 'center', zIndex: 100,
        opacity, transform: [{ translateY }, { scale }],
        backgroundColor: '#16A34A',
        borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9,
        flexDirection: 'row', alignItems: 'center', gap: 7,
        shadowColor: '#22C55E', shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
      }}
    >
      <Ionicons name="checkmark-circle" size={16} color="#fff" />
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Task done</Text>
      {pending.xp > 0 && (
        <View style={{ backgroundColor: '#ffffff22', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>+{pending.xp} XP</Text>
        </View>
      )}
    </Animated.View>
  );
}
