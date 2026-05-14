import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, Dimensions, Modal, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore } from '@/store/ui';
import { RANK_NAMES } from '@/constants/xp';

const { width: W, height: H } = Dimensions.get('window');
const COLORS = ['#5B5EF4', '#F59E0B', '#22C55E', '#EF4444', '#A855F7', '#10B981', '#FF6B6B', '#FFD700', '#38BDF8'];

function Particle({ x, color, size, delay, duration, isRect }: {
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
          Animated.timing(opacity, { toValue: 0, duration: duration * 0.5, delay: duration * 0.4, useNativeDriver: true }),
        ]),
        Animated.timing(rotate, { toValue: 3, duration, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const rotateStr = rotate.interpolate({ inputRange: [0, 3], outputRange: ['0deg', '1080deg'] });

  return (
    <Animated.View
      style={{
        position: 'absolute', left: x, top: 0,
        width: isRect ? size * 1.8 : size,
        height: size,
        borderRadius: isRect ? 2 : size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY: y }, { rotate: rotateStr }],
      }}
    />
  );
}

export function RankUpModal() {
  const rankUp = useUIStore((s) => s.rankUpPending);
  const clear = useUIStore((s) => s.clearRankUp);

  const cardScale = useRef(new Animated.Value(0)).current;
  const trophyScale = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const particles = useMemo(() =>
    Array.from({ length: 36 }, (_, i) => ({
      id: i,
      x: (Math.random() * W * 1.1) - W * 0.05,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 8,
      delay: Math.random() * 500,
      duration: 1400 + Math.random() * 1000,
      isRect: Math.random() > 0.5,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rankUp?.to]
  );

  useEffect(() => {
    if (!rankUp) return;
    cardScale.setValue(0);
    trophyScale.setValue(0);
    glow.setValue(0);

    Animated.sequence([
      Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 160 }),
      Animated.delay(120),
      Animated.spring(trophyScale, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 180 }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [rankUp?.to]);

  if (!rankUp) return null;

  const glowOpacity = glow.interpolate({ inputRange: [0.4, 1], outputRange: [0.4, 1] });

  return (
    <Modal transparent visible animationType="fade" onRequestClose={clear}>
      <View style={{ flex: 1, backgroundColor: '#000000CC', alignItems: 'center', justifyContent: 'center' }}>
        {/* Confetti */}
        {particles.map((p) => <Particle key={p.id} {...p} />)}

        {/* Card */}
        <Animated.View style={{
          transform: [{ scale: cardScale }],
          alignItems: 'center', gap: 14, paddingHorizontal: 36, paddingVertical: 36,
          backgroundColor: '#12122A', borderRadius: 28,
          borderWidth: 1.5, borderColor: '#5B5EF4',
          shadowColor: '#5B5EF4', shadowOpacity: 0.5, shadowRadius: 24, elevation: 20,
          maxWidth: 300, width: '80%',
        }}>
          {/* Trophy */}
          <Animated.View style={{ transform: [{ scale: trophyScale }] }}>
            <Animated.View style={{
              width: 96, height: 96, borderRadius: 48,
              backgroundColor: '#FFD70020', borderWidth: 2, borderColor: '#FFD700',
              alignItems: 'center', justifyContent: 'center',
              opacity: glowOpacity,
              shadowColor: '#FFD700', shadowOpacity: 0.8, shadowRadius: 20, elevation: 12,
            }}>
              <Ionicons name="trophy" size={48} color="#FFD700" />
            </Animated.View>
          </Animated.View>

          <Text style={{ color: '#FFD700', fontSize: 28, fontWeight: '900', letterSpacing: 3 }}>
            RANK UP!
          </Text>

          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ color: '#55556A', fontSize: 13 }}>
              {RANK_NAMES[rankUp.from]} → <Text style={{ color: '#E8E8F2', fontWeight: '700' }}>{RANK_NAMES[rankUp.to]}</Text>
            </Text>
            <Text style={{ color: '#5B5EF4', fontSize: 22, fontWeight: '800' }}>
              Rank {rankUp.to}
            </Text>
          </View>

          <TouchableOpacity
            onPress={clear}
            style={{
              marginTop: 6, backgroundColor: '#5B5EF4', borderRadius: 16,
              paddingVertical: 13, paddingHorizontal: 40,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Awesome!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}
