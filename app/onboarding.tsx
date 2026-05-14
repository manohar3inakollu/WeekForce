import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Image } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/auth';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { DailyXPTarget, GoalCategory, DayOfWeek, Difficulty, TaskPriority } from '@/types';
import { DAYS_OF_WEEK, DIFFICULTIES } from '@/constants/xp';
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import { getWeekStart, dayIndexToLabel } from '@/lib/utils';
import { DatePicker } from '@/components/ui/DatePicker';
import { TimePicker } from '@/components/ui/TimePicker';

const XP_TARGET_OPTIONS: { value: DailyXPTarget; label: string; desc: string; xp: number; icon: string }[] = [
  { value: 'casual',   label: 'Casual',   desc: 'Light touch, easy wins',       xp: 20,  icon: 'leaf-outline'  },
  { value: 'regular',  label: 'Regular',  desc: 'Steady daily progress',         xp: 50,  icon: 'flash-outline' },
  { value: 'active',   label: 'Active',   desc: 'Push yourself harder',          xp: 100, icon: 'flame-outline' },
  { value: 'hardcore', label: 'Hardcore', desc: 'Full throttle, no excuses',     xp: 200, icon: 'skull-outline' },
];

const RANK_TRACKS = [
  { label: 'Starter',    color: '#6B7280', desc: 'Ranks 1–9'  },
  { label: 'Specialist', color: '#3B82F6', desc: 'Ranks 10–14' },
  { label: 'Leader',     color: '#F59E0B', desc: 'Ranks 15–24' },
  { label: 'Prestige',   color: '#8B5CF6', desc: 'Rank 25'     },
];

const HIERARCHY = [
  { label: 'Milestones', icon: 'trophy-outline',           color: '#5B5EF4', desc: 'Big life objectives', pct: 1.00 },
  { label: 'Goals',      icon: 'flag-outline',             color: '#22C55E', desc: 'Weekly targets',      pct: 0.80 },
  { label: 'Habits',     icon: 'repeat-outline',           color: '#F59E0B', desc: 'Daily routines',      pct: 0.62 },
  { label: 'Tasks',      icon: 'checkmark-circle-outline', color: '#A855F7', desc: 'One-off actions',     pct: 0.44 },
];


const FREQ_OPTIONS = [
  { label: 'Every day', desc: '7 days a week',       icon: 'sunny-outline',    recurrence_type: 'daily'  as const, recurrence_days: null as DayOfWeek[] | null },
  { label: 'Weekdays',  desc: 'Mon – Fri',            icon: 'business-outline', recurrence_type: 'custom' as const, recurrence_days: ['Mon','Tue','Wed','Thu','Fri'] as DayOfWeek[] },
  { label: 'Weekends',  desc: 'Sat & Sun',            icon: 'cafe-outline',     recurrence_type: 'custom' as const, recurrence_days: ['Sat','Sun'] as DayOfWeek[] },
  { label: 'Custom',    desc: 'Pick specific days',   icon: 'options-outline',  recurrence_type: 'custom' as const, recurrence_days: null as DayOfWeek[] | null },
];

const PURPOSE_OPTIONS = [
  { value: 'habits',     label: 'Build better habits',        icon: 'repeat-outline',          desc: 'Daily routines that stick' },
  { value: 'goals',      label: 'Make progress on my goals',  icon: 'flag-outline',            desc: 'Turn ambitions into action' },
  { value: 'structured', label: 'Get more organised',         icon: 'grid-outline',            desc: 'Bring order to the chaos' },
  { value: 'levelup',    label: 'Level up across the board',  icon: 'trending-up-outline',     desc: 'Grow in every area of life' },
];

const FOCUS_AREA_OPTIONS: { value: GoalCategory; label: string; icon: string; color: string }[] = [
  { value: 'health',   label: 'Health & fitness',  icon: 'barbell-outline',   color: '#22C55E' },
  { value: 'work',     label: 'Work & career',     icon: 'briefcase-outline', color: '#3B82F6' },
  { value: 'learning', label: 'Learning & skills', icon: 'book-outline',      color: '#8B5CF6' },
  { value: 'finance',  label: 'Money & finances',  icon: 'wallet-outline',    color: '#10B981' },
  { value: 'personal', label: 'Personal life',     icon: 'heart-outline',     color: '#F59E0B' },
  { value: 'other',    label: 'Other',             icon: 'ellipsis-horizontal-outline', color: '#6B7280' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'high',   label: 'High',   color: '#EF4444' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'low',    label: 'Low',    color: '#22C55E' },
];

// Steps: 0=Welcome, 1=Personal, 2=XP, 3=Milestone, 4=Goal, 5=Task, 6=Habit, 7=Ready
const TOTAL_PROGRESS_STEPS = 6;

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{ color: '#44445A', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
      {children}
    </Text>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <TouchableOpacity onPress={() => Alert.alert('', text)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
      <Ionicons name="information-circle-outline" size={14} color="#55556A" />
    </TouchableOpacity>
  );
}

const CAT_OPTIONS: { value: GoalCategory; label: string; color: string }[] = [
  { value: 'health',   label: 'Health',   color: '#22C55E' },
  { value: 'work',     label: 'Work',     color: '#3B82F6' },
  { value: 'personal', label: 'Personal', color: '#F59E0B' },
  { value: 'learning', label: 'Learning', color: '#8B5CF6' },
  { value: 'finance',  label: 'Finance',  color: '#10B981' },
  { value: 'other',    label: 'Other',    color: '#6B7280' },
];

function CategoryPicker({ value, onChange }: { value: GoalCategory; onChange: (v: GoalCategory) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {CAT_OPTIONS.map((c) => (
        <TouchableOpacity
          key={c.value}
          onPress={() => onChange(c.value)}
          style={{
            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1,
            borderColor: value === c.value ? c.color : '#2A2A32',
            backgroundColor: value === c.value ? c.color + '22' : '#18181C',
          }}
        >
          <Text style={{ color: value === c.value ? c.color : '#8888A0', fontSize: 13, fontWeight: '500' }}>
            {c.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const session      = useAuthStore((s) => s.session);
  const setOnboarded = useAuthStore((s) => s.setOnboarded);

  const [step,   setStep]   = useState(0);
  const [target, setTarget] = useState<DailyXPTarget>('regular');

  // Personal
  const [purpose,    setPurpose]    = useState('');
  const [focusAreas, setFocusAreas] = useState<GoalCategory[]>([]);

  const toggleFocusArea = (v: GoalCategory) =>
    setFocusAreas((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : prev.length < 3 ? [...prev, v] : prev
    );

  // Milestone
  const [msTitle,      setMsTitle]      = useState('');
  const [msCat,        setMsCat]        = useState<GoalCategory>('personal');
  const [msDifficulty, setMsDifficulty] = useState<Difficulty>('medium');
  const [msStartDate,  setMsStartDate]  = useState<string | null>(null);
  const [msEndDate,    setMsEndDate]    = useState<string | null>(null);

  // Goal
  const [goalTitle,      setGoalTitle]      = useState('');
  const [goalDifficulty, setGoalDifficulty] = useState<Difficulty>('medium');
  const [goalStartDate,  setGoalStartDate]  = useState<string | null>(null);
  const [goalDueDate,    setGoalDueDate]    = useState<string | null>(null);

  // Task
  const [taskTitle,      setTaskTitle]      = useState('');
  const [taskDate,       setTaskDate]       = useState<string | null>(format(new Date(), 'yyyy-MM-dd'));
  const [taskTime,       setTaskTime]       = useState<string | null>(null);
  const [taskPriority,   setTaskPriority]   = useState<TaskPriority>('medium');
  const [taskDifficulty, setTaskDifficulty] = useState<Difficulty>('medium');

  // Habit
  const [habitTitle,      setHabitTitle]      = useState('');
  const [habitFreqIdx,    setHabitFreqIdx]    = useState(0);
  const [habitCustomDays, setHabitCustomDays] = useState<DayOfWeek[]>([]);
  const [habitTime,       setHabitTime]       = useState<string | null>(null);
  const [habitEndDate,    setHabitEndDate]    = useState<string | null>(null);
  const [habitDifficulty, setHabitDifficulty] = useState<Difficulty>('easy');
  const [habitPriority,   setHabitPriority]   = useState<TaskPriority>('medium');

  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const weekStart = getWeekStart();
  const XP_BY_PURPOSE: Record<string, DailyXPTarget> = {
    habits:     'regular',
    goals:      'active',
    structured: 'casual',
    levelup:    'active',
  };

  const next = () => {
    setSubmitAttempted(false);
    setStep((s) => {
      if (s === 1) {
        if (focusAreas.length > 0) {
          setMsCat(focusAreas[0]);
        }
        if (purpose && XP_BY_PURPOSE[purpose]) {
          setTarget(XP_BY_PURPOSE[purpose]);
        }
      }
      return s + 1;
    });
  };
  const back = () => setStep((s) => s - 1);

  const handleContinue = () => {
    if (!canContinue()) {
      setSubmitAttempted(true);
      return;
    }
    next();
  };

  const toggleHabitDay = (d: DayOfWeek) => {
    setHabitCustomDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const habitFreqLabel = () => {
    const freq = FREQ_OPTIONS[habitFreqIdx];
    if (habitFreqIdx === 3) {
      return habitCustomDays.length > 0 ? habitCustomDays.join(' · ') : 'Custom';
    }
    return freq.label;
  };

  const handleDone = async () => {
    if (!session) {
      Alert.alert('Session expired', 'Please sign in again.');
      return;
    }

    setLoading(true);

    // Write the onboarded flag locally first — this is the only thing that
    // controls the routing gate, and AsyncStorage is instant (no network).
    // Navigation must never wait on Supabase.
    try { await AsyncStorage.setItem(`onboarded_${session.user.id}`, 'true'); } catch {}
    setOnboarded(true);
    setLoading(false);
    router.replace('/');

    // Persist starter data to Supabase in the background after navigating.
    // The component may unmount — that's fine, no state is touched below.
    const uid = session.user.id;
    (async () => {
      try {
        await supabase.from('users')
          .update({ daily_xp_target: target, onboarded: true })
          .eq('id', uid);
      } catch {}

      let milestoneId: string | null = null;
      if (msTitle.trim()) {
        try {
          const { data } = await supabase.from('milestones').insert({
            user_id: uid, title: msTitle.trim(), category: msCat,
            difficulty: msDifficulty, start_date: msStartDate ?? null,
            due_date: msEndDate ?? null, status: 'active',
          }).select().single();
          milestoneId = data?.id ?? null;
        } catch {}
      }

      let goalId: string | null = null;
      if (goalTitle.trim()) {
        try {
          const { data } = await supabase.from('goals').insert({
            user_id: uid, title: goalTitle.trim(), difficulty: goalDifficulty,
            start_date: goalStartDate ?? null, due_date: goalDueDate ?? null,
            milestone_id: milestoneId, status: 'active', xp_awarded: false,
          }).select().single();
          goalId = data?.id ?? null;
        } catch {}
      }

      if (taskTitle.trim()) {
        try {
          const parsedDate = taskDate ? parseISO(taskDate) : new Date();
          const jsDay = parsedDate.getDay();
          const scheduledDay = dayIndexToLabel(jsDay === 0 ? 6 : jsDay - 1);
          await supabase.from('tasks').insert({
            user_id: uid, title: taskTitle.trim(), scheduled_day: scheduledDay,
            due_date: taskDate, goal_id: goalId, status: 'pending',
            priority: taskPriority, difficulty: taskDifficulty, start_time: taskTime,
            estimated_minutes: 30, recurrence_type: 'none', sort_order: 0,
          });
        } catch {}
      }

      if (habitTitle.trim()) {
        try {
          const freq = FREQ_OPTIONS[habitFreqIdx];
          const recurrenceDays = habitFreqIdx === 3 ? habitCustomDays : freq.recurrence_days;
          await supabase.from('tasks').insert({
            user_id: uid, title: habitTitle.trim(), scheduled_day: 'Mon' as DayOfWeek,
            due_date: habitEndDate, goal_id: null, status: 'pending',
            priority: habitPriority, difficulty: habitDifficulty, estimated_minutes: 15,
            start_time: habitTime, recurrence_type: freq.recurrence_type,
            recurrence_days: recurrenceDays, sort_order: 0,
          });
        } catch {}
      }

      // Refresh home screen data now that all starter items have been written.
      queryClient.invalidateQueries({ queryKey: ['user', uid] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
    })();
  };

  const canContinue = (): boolean => {
    switch (step) {
      case 1: return !!purpose;
      case 2: return true;
      case 3:
        if (!msTitle.trim()) return true; // allow skipping
        return !!msStartDate && !!msEndDate && !isAfter(parseISO(msStartDate), parseISO(msEndDate));
      case 4:
        if (!goalTitle.trim()) return true; // allow skipping
        return !!goalStartDate && !!goalDueDate && !isAfter(parseISO(goalStartDate), parseISO(goalDueDate));
      case 5:
        if (!taskTitle.trim()) return true; // allow skipping
        return !!taskDate;
      case 6:
        if (!habitTitle.trim()) return true; // allow skipping
        return !!habitTime && !!habitEndDate &&
               !isBefore(startOfDay(parseISO(habitEndDate)), startOfDay(new Date())) &&
               (habitFreqIdx !== 3 || habitCustomDays.length > 0);
      default: return true;
    }
  };

  const showProgress = step >= 1 && step <= 6;
  const progressStep = step;
  const xpForTarget  = XP_TARGET_OPTIONS.find((o) => o.value === target)?.xp ?? 50;

  return (
    <View style={{ flex: 1, backgroundColor: '#0b0b14' }}>
      {showProgress ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: 16, gap: 12 }}>
          <TouchableOpacity onPress={back} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={22} color="#8888AA" />
          </TouchableOpacity>
          <View style={{ flex: 1, height: 4, backgroundColor: '#252535', borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ width: `${(progressStep / TOTAL_PROGRESS_STEPS) * 100}%`, height: '100%', backgroundColor: '#5B5EF4', borderRadius: 2 }} />
          </View>
          <Text style={{ color: '#44445A', fontSize: 12, fontWeight: '600', minWidth: 28 }}>
            {progressStep}/{TOTAL_PROGRESS_STEPS}
          </Text>
        </View>
      ) : (
        <View style={{ height: 56 }} />
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>

        {/* ── STEP 0: Welcome ── */}
        {step === 0 && (
          <View style={{ gap: 28, paddingTop: 40 }}>
            <View style={{ alignItems: 'center', gap: 14 }}>
              <Image
                source={require('@/assets/splash-icon.png')}
                style={{ width: 88, height: 88, borderRadius: 24 }}
                resizeMode="cover"
              />
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Text style={{ color: '#E8E8F2', fontSize: 30, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' }}>
                  Welcome to Stride
                </Text>
                <Text style={{ color: '#8888AA', fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
                  Turn what matters to you into a{'\n'}plan you'll actually follow.
                </Text>
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ color: '#44445A', fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>
                How it works
              </Text>
              {HIERARCHY.map((h, i) => (
                <React.Fragment key={h.label}>
                  <View style={{ width: `${h.pct * 100}%`, alignSelf: 'center', borderRadius: 12, backgroundColor: h.color + '18', borderWidth: 1, borderColor: h.color + '44', paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: h.color + '28', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Ionicons name={h.icon as any} size={15} color={h.color} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: h.color, fontSize: 13, fontWeight: '800' }} numberOfLines={1}>{h.label}</Text>
                      <Text style={{ color: h.color + 'AA', fontSize: 10, marginTop: 1 }} numberOfLines={1}>{h.desc}</Text>
                    </View>
                  </View>
                </React.Fragment>
              ))}
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ color: '#44445A', fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' }}>
                Rank progression
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {RANK_TRACKS.map((t) => (
                  <View key={t.label} style={{ flex: 1, alignItems: 'center', gap: 4, backgroundColor: t.color + '12', borderWidth: 1, borderColor: t.color + '33', borderRadius: 12, paddingVertical: 10 }}>
                    <Text style={{ color: t.color, fontSize: 10, fontWeight: '700' }}>{t.label}</Text>
                    <Text style={{ color: t.color + '88', fontSize: 8 }}>{t.desc}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── STEP 1: Personal ── */}
        {step === 1 && (
          <View style={{ gap: 28, paddingTop: 8 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ color: '#E8E8F2', fontSize: 26, fontWeight: '800' }}>A little about you</Text>
              <Text style={{ color: '#8888AA', fontSize: 14, lineHeight: 20 }}>
                Help us tailor the experience to what matters most.
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              <Text style={{ color: '#44445A', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                What brings you here?
              </Text>
              {PURPOSE_OPTIONS.map((opt) => {
                const sel = purpose === opt.value;
                return (
                  <TouchableOpacity key={opt.value} onPress={() => setPurpose(opt.value)} activeOpacity={0.8}
                    style={{ backgroundColor: sel ? '#1e1a3a' : '#13131e', borderWidth: 1.5, borderColor: sel ? '#5B5EF4' : '#252535', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: sel ? '#5B5EF430' : '#1e1e28', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={opt.icon as any} size={19} color={sel ? '#5B5EF4' : '#44445A'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: sel ? '#E8E8F2' : '#C8C8E0', fontWeight: '700', fontSize: 14 }}>{opt.label}</Text>
                      <Text style={{ color: '#55556A', fontSize: 12, marginTop: 2 }}>{opt.desc}</Text>
                    </View>
                    {sel && (
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#5B5EF4', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="checkmark" size={12} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {submitAttempted && !purpose && (
              <Text style={{ color: '#EF4444', fontSize: 12, marginTop: -16 }}>Please select what brings you here.</Text>
            )}

            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: '#44445A', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  Which areas matter most?
                </Text>
                <Text style={{ color: '#44445A', fontSize: 11 }}>Pick up to 3</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {FOCUS_AREA_OPTIONS.map((opt) => {
                  const sel = focusAreas.includes(opt.value);
                  return (
                    <TouchableOpacity key={opt.value} onPress={() => toggleFocusArea(opt.value)} activeOpacity={0.8}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: sel ? opt.color + '20' : '#13131e', borderWidth: 1.5, borderColor: sel ? opt.color : '#252535' }}>
                      <Ionicons name={opt.icon as any} size={15} color={sel ? opt.color : '#44445A'} />
                      <Text style={{ color: sel ? opt.color : '#8888AA', fontWeight: '600', fontSize: 13 }}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* ── STEP 2: XP Target ── */}
        {step === 2 && (
          <View style={{ gap: 24, paddingTop: 8 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ color: '#E8E8F2', fontSize: 26, fontWeight: '800' }}>Choose your pace</Text>
              <Text style={{ color: '#8888AA', fontSize: 14, lineHeight: 20 }}>
                A day counts toward rank promotion only if you hit your daily XP target.
              </Text>
              {purpose && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, backgroundColor: '#13131e', borderWidth: 1, borderColor: '#252535', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' }}>
                  <Ionicons name="sparkles-outline" size={13} color="#5B5EF4" />
                  <Text style={{ color: '#8888AA', fontSize: 12 }}>
                    Based on your choices, we suggest{' '}
                    <Text style={{ color: '#E8E8F2', fontWeight: '700' }}>
                      {XP_TARGET_OPTIONS.find((o) => o.value === XP_BY_PURPOSE[purpose])?.label}
                    </Text>
                  </Text>
                </View>
              )}
            </View>
            <View style={{ gap: 10 }}>
              {XP_TARGET_OPTIONS.map((opt) => {
                const sel = target === opt.value;
                const recommended = purpose ? XP_BY_PURPOSE[purpose] === opt.value : false;
                return (
                  <TouchableOpacity key={opt.value} onPress={() => setTarget(opt.value)} activeOpacity={0.8}
                    style={{ backgroundColor: sel ? '#1e1a3a' : '#13131e', borderWidth: 1.5, borderColor: sel ? '#5B5EF4' : '#252535', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: sel ? '#5B5EF430' : '#1e1e28', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={opt.icon as any} size={20} color={sel ? '#5B5EF4' : '#44445A'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={{ color: sel ? '#E8E8F2' : '#C8C8E0', fontWeight: '700', fontSize: 15 }}>{opt.label}</Text>
                        <View style={{ backgroundColor: '#A855F720', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 }}>
                          <Text style={{ color: '#A855F7', fontSize: 10, fontWeight: '700' }}>{opt.xp} XP/day</Text>
                        </View>
                        {recommended && (
                          <View style={{ backgroundColor: '#22C55E20', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: '#22C55E44' }}>
                            <Text style={{ color: '#22C55E', fontSize: 10, fontWeight: '700' }}>Recommended</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ color: '#8888AA', fontSize: 12, marginTop: 3 }}>{opt.desc}</Text>
                    </View>
                    {sel && (
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#5B5EF4', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="checkmark" size={13} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ backgroundColor: '#13131e', borderWidth: 1, borderColor: '#252535', borderRadius: 14, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <Ionicons name="information-circle-outline" size={18} color="#5B5EF4" style={{ flexShrink: 0, marginTop: 1 }} />
              <Text style={{ color: '#8888AA', fontSize: 12, flex: 1, lineHeight: 18 }}>
                You can change this anytime in Profile settings. Start conservatively — you can always push harder later.
              </Text>
            </View>
          </View>
        )}

        {/* ── STEP 3: First Milestone ── */}
        {step === 3 && (
          <View style={{ gap: 20, paddingTop: 8 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ color: '#E8E8F2', fontSize: 26, fontWeight: '800' }}>Set a big milestone</Text>
              <Text style={{ color: '#8888AA', fontSize: 14, lineHeight: 20 }}>
                Milestones are major life objectives that span months. Goals and tasks ladder up to them.
              </Text>
            </View>

            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <SectionLabel>Title</SectionLabel>
                <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>*</Text>
              </View>
              <TextInput
                value={msTitle}
                onChangeText={setMsTitle}
                placeholder="e.g. Run a marathon"
                placeholderTextColor="#44445A"
                style={{ backgroundColor: '#13131e', borderWidth: 1.5, borderColor: msTitle ? '#5B5EF4' : '#252535', borderRadius: 14, padding: 16, color: '#E8E8F2', fontSize: 15 }}
              />
              {submitAttempted && !msTitle.trim() && (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 2 }}>Title is required.</Text>
              )}
            </View>

            <View style={{ gap: 8 }}>
              <SectionLabel>Category</SectionLabel>
              <CategoryPicker value={msCat} onChange={setMsCat} />
            </View>

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <SectionLabel>Difficulty & XP</SectionLabel>
                <Tip text="How challenging is this milestone? Higher difficulty means more XP when you complete it." />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {DIFFICULTIES.map((d) => {
                  const sel = msDifficulty === d.value;
                  return (
                    <TouchableOpacity key={d.value} onPress={() => setMsDifficulty(d.value as Difficulty)}
                      style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10, borderRadius: 12, backgroundColor: sel ? d.color + '22' : '#13131e', borderWidth: 1, borderColor: sel ? d.color : '#252535' }}>
                      <Text style={{ color: sel ? d.color : '#55556A', fontSize: 12, fontWeight: '600' }}>{d.label}</Text>
                      <Text style={{ color: sel ? d.color : '#44445A', fontSize: 10 }}>+{d.milestoneXp} XP</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <SectionLabel>Dates</SectionLabel>
                <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>*</Text>
                <Tip text="Set a realistic timeframe for this milestone. A progress timeline will appear on your milestone card." />
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <DatePicker value={msStartDate} onChange={setMsStartDate} />
                  <Text style={{ color: '#44445A', fontSize: 10, marginTop: 4, textAlign: 'center' }}>Start</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <DatePicker value={msEndDate} onChange={setMsEndDate} />
                  <Text style={{ color: '#44445A', fontSize: 10, marginTop: 4, textAlign: 'center' }}>Target</Text>
                </View>
              </View>
              {submitAttempted && (!msStartDate || !msEndDate) && (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>Both start and end dates are required.</Text>
              )}
              {submitAttempted && msStartDate && msEndDate && isAfter(parseISO(msStartDate), parseISO(msEndDate)) && (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>End date must be on or after start date.</Text>
              )}
            </View>
          </View>
        )}

        {/* ── STEP 4: First Goal ── */}
        {step === 4 && (
          <View style={{ gap: 20, paddingTop: 8 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ color: '#E8E8F2', fontSize: 26, fontWeight: '800' }}>Set your first goal</Text>
              <Text style={{ color: '#8888AA', fontSize: 14, lineHeight: 20 }}>
                Goals take a week to a few weeks to complete and link up to a milestone.
                {msTitle.trim() ? ` This goal will be linked to "${msTitle.trim()}".` : ' Skip and add goals anytime.'}
              </Text>
            </View>

            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <SectionLabel>Title</SectionLabel>
                <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>*</Text>
              </View>
              <TextInput
                value={goalTitle}
                onChangeText={setGoalTitle}
                placeholder="e.g. Run 3 times this week"
                placeholderTextColor="#44445A"
                style={{ backgroundColor: '#13131e', borderWidth: 1.5, borderColor: goalTitle ? '#5B5EF4' : '#252535', borderRadius: 14, padding: 16, color: '#E8E8F2', fontSize: 15 }}
              />
              {submitAttempted && !goalTitle.trim() && (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 2 }}>Title is required.</Text>
              )}
            </View>

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <SectionLabel>Difficulty & XP</SectionLabel>
                <Tip text="Reflects how hard this goal is to achieve. You'll earn this XP when you mark the goal complete." />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {DIFFICULTIES.map((d) => {
                  const sel = goalDifficulty === d.value;
                  return (
                    <TouchableOpacity key={d.value} onPress={() => setGoalDifficulty(d.value as Difficulty)}
                      style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10, borderRadius: 12, backgroundColor: sel ? d.color + '22' : '#13131e', borderWidth: 1, borderColor: sel ? d.color : '#252535' }}>
                      <Text style={{ color: sel ? d.color : '#55556A', fontSize: 12, fontWeight: '600' }}>{d.label}</Text>
                      <Text style={{ color: sel ? d.color : '#44445A', fontSize: 10 }}>+{d.goalXp} XP</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <SectionLabel>Dates</SectionLabel>
                <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>*</Text>
                <Tip text="Goals work best with a clear deadline. Aim for 1–4 weeks. You can always adjust later." />
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <DatePicker value={goalStartDate} onChange={setGoalStartDate} />
                  <Text style={{ color: '#44445A', fontSize: 10, marginTop: 4, textAlign: 'center' }}>Start</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <DatePicker value={goalDueDate} onChange={setGoalDueDate} />
                  <Text style={{ color: '#44445A', fontSize: 10, marginTop: 4, textAlign: 'center' }}>Due</Text>
                </View>
              </View>
              {submitAttempted && (!goalStartDate || !goalDueDate) && (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>Both start and due dates are required.</Text>
              )}
              {submitAttempted && goalStartDate && goalDueDate && isAfter(parseISO(goalStartDate), parseISO(goalDueDate)) && (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>Due date must be on or after start date.</Text>
              )}
            </View>
          </View>
        )}

        {/* ── STEP 5: First Task ── */}
        {step === 5 && (
          <View style={{ gap: 20, paddingTop: 8 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ color: '#E8E8F2', fontSize: 26, fontWeight: '800' }}>Plan your first task</Text>
              <Text style={{ color: '#8888AA', fontSize: 14, lineHeight: 20 }}>
                Tasks are single-day actions that live in your weekly planner.
                {goalTitle.trim() ? ` This task will be placed under "${goalTitle.trim()}".` : ' They can be assigned to a goal.'}
              </Text>
            </View>

            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <SectionLabel>Title</SectionLabel>
                <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>*</Text>
              </View>
              <TextInput
                value={taskTitle}
                onChangeText={setTaskTitle}
                placeholder="e.g. Morning run — 5 km"
                placeholderTextColor="#44445A"
                style={{ backgroundColor: '#13131e', borderWidth: 1.5, borderColor: taskTitle ? '#5B5EF4' : '#252535', borderRadius: 14, padding: 16, color: '#E8E8F2', fontSize: 15 }}
              />
              {submitAttempted && !taskTitle.trim() && (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 2 }}>Title is required.</Text>
              )}
            </View>

            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <SectionLabel>Due date</SectionLabel>
                <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>*</Text>
                <TouchableOpacity onPress={() => Alert.alert('Due date', 'The specific date this task must be done. Required so it appears on the right day in your planner.')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Ionicons name="information-circle-outline" size={14} color="#55556A" />
                </TouchableOpacity>
              </View>
              <DatePicker value={taskDate} onChange={setTaskDate} />
              {submitAttempted && !taskDate && (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>Due date is required.</Text>
              )}
            </View>

            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <SectionLabel>Start time</SectionLabel>
                <Text style={{ color: '#55556A', fontSize: 10, fontWeight: '600' }}>(optional)</Text>
              </View>
              <TimePicker value={taskTime} onChange={setTaskTime} />
            </View>

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <SectionLabel>Priority</SectionLabel>
                <Tip text="High priority tasks appear first in your day view. Use it to flag what must get done today." />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {PRIORITY_OPTIONS.map((p) => {
                  const sel = taskPriority === p.value;
                  return (
                    <TouchableOpacity key={p.value} onPress={() => setTaskPriority(p.value)}
                      style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: sel ? p.color + '22' : '#13131e', borderWidth: 1, borderColor: sel ? p.color : '#252535' }}>
                      <Text style={{ color: sel ? p.color : '#55556A', fontSize: 12, fontWeight: '600' }}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <SectionLabel>Difficulty & XP</SectionLabel>
                <Tip text="Harder tasks earn more XP when completed. Be honest — it affects your rank progression." />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {DIFFICULTIES.map((d) => {
                  const sel = taskDifficulty === d.value;
                  return (
                    <TouchableOpacity key={d.value} onPress={() => setTaskDifficulty(d.value as Difficulty)}
                      style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10, borderRadius: 12, backgroundColor: sel ? d.color + '22' : '#13131e', borderWidth: 1, borderColor: sel ? d.color : '#252535' }}>
                      <Text style={{ color: sel ? d.color : '#55556A', fontSize: 12, fontWeight: '600' }}>{d.label}</Text>
                      <Text style={{ color: sel ? d.color : '#44445A', fontSize: 10 }}>+{d.xp} XP</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* ── STEP 6: First Habit ── */}
        {step === 6 && (
          <View style={{ gap: 20, paddingTop: 8 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ color: '#E8E8F2', fontSize: 26, fontWeight: '800' }}>Build a habit</Text>
              <Text style={{ color: '#8888AA', fontSize: 14, lineHeight: 20 }}>
                Habits are recurring tasks that repeat on a schedule. Complete them daily to build streaks and earn bonus XP.
              </Text>
            </View>

            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <SectionLabel>Title</SectionLabel>
                <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>*</Text>
              </View>
              <TextInput
                value={habitTitle}
                onChangeText={setHabitTitle}
                placeholder="e.g. 10 min meditation"
                placeholderTextColor="#44445A"
                style={{ backgroundColor: '#13131e', borderWidth: 1.5, borderColor: habitTitle ? '#5B5EF4' : '#252535', borderRadius: 14, padding: 16, color: '#E8E8F2', fontSize: 15 }}
              />
              {submitAttempted && !habitTitle.trim() && (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 2 }}>Title is required.</Text>
              )}
            </View>

            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <SectionLabel>End date</SectionLabel>
                <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>*</Text>
                <TouchableOpacity onPress={() => Alert.alert('End date', 'The last date this habit will repeat. After this date it stops appearing in your planner. Set it far in the future to keep it running indefinitely.')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Ionicons name="information-circle-outline" size={14} color="#55556A" />
                </TouchableOpacity>
              </View>
              <DatePicker value={habitEndDate} onChange={setHabitEndDate} />
              {submitAttempted && !habitEndDate && (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>End date is required.</Text>
              )}
              {submitAttempted && habitEndDate && isBefore(startOfDay(parseISO(habitEndDate)), startOfDay(new Date())) && (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>End date must be in the future.</Text>
              )}
            </View>

            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <SectionLabel>Start time</SectionLabel>
                <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>*</Text>
                <TouchableOpacity onPress={() => Alert.alert('Start time', 'Required for habits so we can send you a reminder at the right time. You\'ll get a notification before each session.')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Ionicons name="information-circle-outline" size={14} color="#55556A" />
                </TouchableOpacity>
              </View>
              <TimePicker value={habitTime} onChange={setHabitTime} />
              {submitAttempted && !habitTime && (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>Start time is required.</Text>
              )}
            </View>

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <SectionLabel>Frequency</SectionLabel>
                <Tip text="How often this habit repeats in your planner. You can change this anytime." />
              </View>
              <View style={{ gap: 8 }}>
                {FREQ_OPTIONS.map((freq, i) => {
                  const sel = habitFreqIdx === i;
                  return (
                    <TouchableOpacity key={freq.label} onPress={() => setHabitFreqIdx(i)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: sel ? '#1e1a3a' : '#13131e', borderWidth: 1.5, borderColor: sel ? '#5B5EF4' : '#252535', borderRadius: 14, padding: 14 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: sel ? '#5B5EF430' : '#1e1e28', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name={freq.icon as any} size={18} color={sel ? '#5B5EF4' : '#44445A'} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: sel ? '#E8E8F2' : '#C8C8E0', fontWeight: '700', fontSize: 14 }}>{freq.label}</Text>
                        <Text style={{ color: '#8888AA', fontSize: 12 }}>{freq.desc}</Text>
                      </View>
                      {sel && (
                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#5B5EF4', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom day toggles */}
              {habitFreqIdx === 3 && (
                <View style={{ gap: 8, paddingTop: 4 }}>
                  <Text style={{ color: '#55556A', fontSize: 12 }}>Repeat on:</Text>
                  <View style={{ flexDirection: 'row', gap: 5 }}>
                    {DAYS_OF_WEEK.map((day) => {
                      const on = habitCustomDays.includes(day);
                      return (
                        <TouchableOpacity key={day} onPress={() => toggleHabitDay(day)}
                          style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: on ? '#5B5EF4' : '#13131e', borderWidth: 1, borderColor: on ? '#5B5EF4' : '#252535' }}>
                          <Text style={{ color: on ? '#fff' : '#55556A', fontSize: 9, fontWeight: '700' }}>{day}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {submitAttempted && habitCustomDays.length === 0 && (
                    <Text style={{ color: '#EF4444', fontSize: 11 }}>Please select at least one day.</Text>
                  )}
                </View>
              )}
            </View>

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <SectionLabel>Priority</SectionLabel>
                <Tip text="High priority habits appear first in your habits list. Use it to flag the ones you must not miss." />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {PRIORITY_OPTIONS.map((p) => {
                  const sel = habitPriority === p.value;
                  return (
                    <TouchableOpacity key={p.value} onPress={() => setHabitPriority(p.value)}
                      style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: sel ? p.color + '22' : '#13131e', borderWidth: 1, borderColor: sel ? p.color : '#252535' }}>
                      <Text style={{ color: sel ? p.color : '#55556A', fontSize: 12, fontWeight: '600' }}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <SectionLabel>Difficulty & XP per completion</SectionLabel>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {DIFFICULTIES.map((d) => {
                  const sel = habitDifficulty === d.value;
                  return (
                    <TouchableOpacity key={d.value} onPress={() => setHabitDifficulty(d.value as Difficulty)}
                      style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10, borderRadius: 12, backgroundColor: sel ? d.color + '22' : '#13131e', borderWidth: 1, borderColor: sel ? d.color : '#252535' }}>
                      <Text style={{ color: sel ? d.color : '#55556A', fontSize: 12, fontWeight: '600' }}>{d.label}</Text>
                      <Text style={{ color: sel ? d.color : '#44445A', fontSize: 10 }}>+{d.xp} XP</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* ── STEP 7: Ready ── */}
        {step === 7 && (
          <View style={{ gap: 24, paddingTop: 32, alignItems: 'center' }}>
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: '#22C55E18', borderWidth: 2, borderColor: '#22C55E44', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
            </View>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={{ color: '#E8E8F2', fontSize: 28, fontWeight: '800', textAlign: 'center' }}>You're all set!</Text>
              <Text style={{ color: '#8888AA', fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
                Your first week starts now. Earn XP, hit your goals, and climb the ranks.
              </Text>
            </View>

            {(msTitle.trim() || goalTitle.trim() || taskTitle.trim() || habitTitle.trim()) && (
              <View style={{ width: '100%', gap: 8 }}>
                <Text style={{ color: '#44445A', fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' }}>
                  Created for you
                </Text>

                {msTitle.trim() ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#13131e', borderWidth: 1, borderColor: '#252535', borderRadius: 14, padding: 14 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: '#5B5EF418', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="trophy-outline" size={16} color="#5B5EF4" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#44445A', fontSize: 10, fontWeight: '700', textTransform: 'capitalize' }}>
                        Milestone · {msCat} · {msDifficulty}
                      </Text>
                      <Text style={{ color: '#E8E8F2', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{msTitle.trim()}</Text>
                    </View>
                  </View>
                ) : null}

                {goalTitle.trim() ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#13131e', borderWidth: 1, borderColor: '#252535', borderRadius: 14, padding: 14 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: '#22C55E18', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="flag-outline" size={16} color="#22C55E" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#44445A', fontSize: 10, fontWeight: '700', textTransform: 'capitalize' }}>
                        goal · {goalDifficulty}{msTitle.trim() ? ' · linked to milestone' : ''}
                      </Text>
                      <Text style={{ color: '#E8E8F2', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{goalTitle.trim()}</Text>
                    </View>
                  </View>
                ) : null}

                {taskTitle.trim() ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#13131e', borderWidth: 1, borderColor: '#252535', borderRadius: 14, padding: 14 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: '#5B5EF418', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#5B5EF4" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#44445A', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
                        Task · {taskDate ? format(parseISO(taskDate), 'MMM d') : '—'}{taskTime ? ` · ${taskTime}` : ''} · {taskPriority} · {taskDifficulty}
                      </Text>
                      <Text style={{ color: '#E8E8F2', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{taskTitle.trim()}</Text>
                    </View>
                  </View>
                ) : null}

                {habitTitle.trim() ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#13131e', borderWidth: 1, borderColor: '#252535', borderRadius: 14, padding: 14 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: '#F59E0B18', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="repeat-outline" size={16} color="#F59E0B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#44445A', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
                        Habit · {habitFreqLabel()}{habitTime ? ` · ${habitTime}` : ''}{habitEndDate ? ` · ends ${format(parseISO(habitEndDate), 'MMM d')}` : ''} · {habitDifficulty}
                      </Text>
                      <Text style={{ color: '#E8E8F2', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{habitTitle.trim()}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            )}

            <View style={{ backgroundColor: '#A855F718', borderWidth: 1, borderColor: '#A855F733', borderRadius: 14, padding: 16, width: '100%', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: '#A855F7', fontWeight: '700', fontSize: 15 }}>XP potential this week</Text>
              <Text style={{ color: '#A855F799', fontSize: 13 }}>
                Up to {xpForTarget * 7} XP if you hit your target every day
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Bottom CTA ── */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#252535' }}>
        {step === 0 && (
          <TouchableOpacity onPress={next} activeOpacity={0.85} style={{ borderRadius: 16, overflow: 'hidden' }}>
            <LinearGradient colors={['#6B6EFF', '#5B5EF4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Get Started</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {(step === 1 || step === 2) && (
          <View style={{ gap: 10 }}>
            <TouchableOpacity onPress={handleContinue} activeOpacity={0.85}
              style={{ borderRadius: 16, overflow: 'hidden' }}>
              <LinearGradient colors={['#6B6EFF', '#5B5EF4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {(step === 3 || step === 4 || step === 5 || step === 6) && (
          <View style={{ gap: 8 }}>
            <TouchableOpacity onPress={handleContinue} activeOpacity={0.85}
              style={{ borderRadius: 16, overflow: 'hidden' }}>
              <LinearGradient colors={['#6B6EFF', '#5B5EF4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={next} activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ color: '#55556A', fontSize: 14, fontWeight: '500' }}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 7 && (
          <TouchableOpacity onPress={handleDone} disabled={loading} activeOpacity={0.85}
            style={{ borderRadius: 16, overflow: 'hidden', opacity: loading ? 0.7 : 1 }}>
            <LinearGradient colors={['#6B6EFF', '#5B5EF4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                {loading ? 'Setting up…' : 'Start My Week'}
              </Text>
              {!loading && <Ionicons name="rocket-outline" size={18} color="#fff" />}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
