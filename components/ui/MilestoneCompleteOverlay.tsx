import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, Dimensions, Modal, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore } from '@/store/ui';

const { width: W, height: H } = Dimensions.get('window');
const COLORS = ['#F59E0B', '#22C55E', '#5B5EF4', '#EF4444', '#A855F7', '#38BDF8', '#FFD700', '#FF6B6B', '#10B981'];

function Confetti({ x, color, size, delay, duration, isRect }: {
  x: number; color: string; size: number; delay: number; duration: number; isRect: boolean;
}) {
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(y, { toValue: H * 0.9, duration, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: duration * 0.45, delay: duration * 0.45, useNativeDriver: true }),
        ]),
        Animated.timing(rotate, { toValue: 4, duration, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const rotateStr = rotate.interpolate({ inputRange: [0, 4], outputRange: ['0deg', '1440deg'] });

  return (
    <Animated.View style={{
      position: 'absolute', left: x, top: 0,
      width: isRect ? size * 2 : size, height: size,
      borderRadius: isRect ? 2 : size / 2,
      backgroundColor: color,
      opacity, transform: [{ translateY: y }, { rotate: rotateStr }],
    }} />
  );
}

export function MilestoneCompleteOverlay() {
  const pending = useUIStore((s) => s.milestoneCompletePending);
  const clear = useUIStore((s) => s.clearMilestoneComplete);

  const cardScale = useRef(new Animated.Value(0)).current;
  const medalScale = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const confetti = useMemo(() =>
    Array.from({ length: 44 }, (_, i) => ({
      id: i,
      x: (Math.random() * W * 1.1) - W * 0.05,
      color: COLORS[i % COLORS.length],
      size: 7 + Math.random() * 8,
      delay: Math.random() * 400,
      duration: 1600 + Math.random() * 1000,
      isRect: Math.random() > 0.45,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pending?.xp]
  );

  useEffect(() => {
    if (!pending) return;
    cardScale.setValue(0);
    medalScale.setValue(0);
    glow.setValue(0);

    Animated.sequence([
      Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, damping: 13, stiffness: 150 }),
      Animated.delay(150),
      Animated.spring(medalScale, { toValue: 1, useNativeDriver: true, damping: 9, stiffness: 170 }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.35, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [pending?.xp]);

  if (!pending) return null;

  const glowOpacity = glow.interpolate({ inputRange: [0.35, 1], outputRange: [0.35, 1] });

  return (
    <Modal transparent visible animationType="fade" onRequestClose={clear}>
      <View style={{ flex: 1, backgroundColor: '#000000D0', alignItems: 'center', justifyContent: 'center' }}>
        {confetti.map((c) => <Confetti key={c.id} {...c} />)}

        <Animated.View style={{
          transform: [{ scale: cardScale }],
          backgroundColor: '#0F1028', borderRadius: 28,
          paddingHorizontal: 36, paddingVertical: 36,
          alignItems: 'center', gap: 14,
          borderWidth: 1.5, borderColor: '#F59E0B55',
          shadowColor: '#F59E0B', shadowOpacity: 0.45, shadowRadius: 28, elevation: 22,
          width: '82%', maxWidth: 310,
        }}>
          <Animated.View style={{ transform: [{ scale: medalScale }] }}>
            <Animated.View style={{
              width: 96, height: 96, borderRadius: 48,
              backgroundColor: '#F59E0B18', borderWidth: 2, borderColor: '#F59E0B',
              alignItems: 'center', justifyContent: 'center',
              opacity: glowOpacity,
              shadowColor: '#F59E0B', shadowOpacity: 0.7, shadowRadius: 22, elevation: 14,
            }}>
              <Ionicons name="medal" size={50} color="#F59E0B" />
            </Animated.View>
          </Animated.View>

          <Text style={{ color: '#F59E0B', fontSize: 24, fontWeight: '900', letterSpacing: 2, textAlign: 'center' }}>
            MILESTONE{'\n'}ACHIEVED!
          </Text>

          {pending.xp > 0 && (
            <View style={{ backgroundColor: '#F59E0B18', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 10 }}>
              <Text style={{ color: '#F59E0B', fontWeight: '900', fontSize: 26 }}>+{pending.xp} XP</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={clear}
            style={{
              marginTop: 6, backgroundColor: '#F59E0B', borderRadius: 16,
              paddingVertical: 13, paddingHorizontal: 40,
            }}
          >
            <Text style={{ color: '#000', fontWeight: '900', fontSize: 15 }}>Incredible!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}
