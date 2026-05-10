import { startOfWeek, format, addDays, parseISO } from 'date-fns';
import { DayOfWeek } from '@/types';

export function getWeekStart(date: Date = new Date()): string {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return format(monday, 'yyyy-MM-dd');
}

export function getWeekDates(weekStart: string): Date[] {
  const start = parseISO(weekStart);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function dayIndexToLabel(index: number): DayOfWeek {
  const days: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days[index] ?? 'Mon';
}

export function todayDayLabel(): DayOfWeek {
  const day = new Date().getDay();
  // Sunday = 0 in JS, but our week starts Monday
  const idx = day === 0 ? 6 : day - 1;
  return dayIndexToLabel(idx);
}

export function formatXP(xp: number): string {
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}k`;
  return String(xp);
}

export function categoryColor(category: string): string {
  const colors: Record<string, string> = {
    health: '#22C55E',
    work: '#3B82F6',
    personal: '#F59E0B',
    learning: '#8B5CF6',
    finance: '#10B981',
    other: '#6B7280',
  };
  return colors[category] ?? '#6B7280';
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
