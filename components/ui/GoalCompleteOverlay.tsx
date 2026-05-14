import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore } from '@/store/ui';

const STAR_COLORS = ['#22C55E', '#F59E0B', '#5B5EF4', '#A855F7', '#38BDF8', '#EF4444', '#10B981', '#FFD700'];
const STAR_ANGLES = Array.from({ length: 8 }, (_, i) => (i * 45 * Math.PI) / 180);

function StarParticle({ angle, color }: { angle: number; color: string }) {
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const dist = 70;
    Animated.parallel([
      Animated.timing(tx, { toValue: Math.cos(angle) * dist, duration: 550, useNativeDriver: true }),
      Animated.timing(ty, { toValue: Math.sin(angle) * dist, duration: 550, useNativeDriver: true }),
      Animated.sequence([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 8, stiffness: 200 }),
        Animated.timing(scale, { toValue: 0, duration: 280, delay: 300, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute', width: 11, height: 11, borderRadius: 3,
        backgroundColor: color,
        transform: [{ translateX: tx }, { translateY: ty }, { scale }, { rotate: '45deg' }],
        opacity,
      }}
    />
  );
}

export function GoalCompleteOverlay() {
  const pending = useUIStore((s) => s.goalCompletePending);
  const clear = useUIStore((s) => s.clearGoalComplete);

  const cardScale = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const [showParticles, setShowParticles] = React.useState(false);

  useEffect(() => {
    if (!pending) return;
    cardScale.setValue(0);
    cardOpacity.setValue(0);
    iconScale.setValue(0);
    setShowParticles(false);

    Animated.sequence([
      Animated.parallel([
        Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 160 }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.spring(iconScale, { toValue: 1, useNativeDriver: true, damping: 8, stiffness: 180 }),
    ]).start(() => setShowParticles(true));

    // Auto-dismiss after 2.8s
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(cardScale, { toValue: 0.8, duration: 300, useNativeDriver: true }),
      ]).start(() => clear());
    }, 2800);
    return () => clearTimeout(timer);
  }, [pending]);

  if (!pending) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={clear}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center' }}
        activeOpacity={1}
        onPress={clear}
      >
        <Animated.View style={{
          transform: [{ scale: cardScale }], opacity: cardOpacity,
          backgroundColor: '#12122A', borderRadius: 28, padding: 36,
          alignItems: 'center', gap: 14,
          borderWidth: 1.5, borderColor: '#22C55E55',
          shadowColor: '#22C55E', shadowOpacity: 0.4, shadowRadius: 24, elevation: 18,
          width: 280,
        }}>
          {/* Icon with star burst */}
          <View style={{ alignItems: 'center', justifyContent: 'center', width: 90, height: 90 }}>
            {showParticles && STAR_ANGLES.map((angle, i) => (
              <StarParticle key={i} angle={angle} color={STAR_COLORS[i]} />
            ))}
            <Animated.View style={{
              transform: [{ scale: iconScale }],
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: '#22C55E18', borderWidth: 2, borderColor: '#22C55E66',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="flag" size={38} color="#22C55E" />
            </Animated.View>
          </View>

          <Text style={{ color: '#22C55E', fontSize: 22, fontWeight: '900', letterSpacing: 1.5 }}>
            Goal Complete!
          </Text>
          {pending.xp > 0 && (
            <View style={{ backgroundColor: '#22C55E18', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 8 }}>
              <Text style={{ color: '#22C55E', fontWeight: '800', fontSize: 22 }}>+{pending.xp} XP</Text>
            </View>
          )}
          <Text style={{ color: '#44445A', fontSize: 12, marginTop: 4 }}>Tap anywhere to continue</Text>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}
