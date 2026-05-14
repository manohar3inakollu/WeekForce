import { startOfWeek, format, addDays, parseISO, startOfDay, isValid, isBefore } from 'date-fns';
import { DayOfWeek, Task } from '@/types';

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

export const CAT_COLORS: Record<string, string> = {
  health: '#22C55E',
  work: '#3B82F6',
  personal: '#F59E0B',
  learning: '#8B5CF6',
  finance: '#10B981',
  other: '#6B7280',
};

export const PRIORITY_COLORS: Record<string, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#22C55E',
};

export const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#22C55E',
  medium: '#F59E0B',
  hard: '#EF4444',
  epic: '#A855F7',
};


export function categoryColor(category: string): string {
  return CAT_COLORS[category] ?? '#6B7280';
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function isDateOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr || !isValid(parseISO(dateStr))) return false;
  return isBefore(startOfDay(parseISO(dateStr)), startOfDay(new Date()));
}

export function isTaskOverdue(task: Task, isDone?: boolean): boolean {
  const done = isDone ?? (task.is_completed || task.status === 'done');
  if (done || task.recurrence_type !== 'none') return false;
  if (!task.due_date || !isValid(parseISO(task.due_date))) return false;
  if (task.start_time) {
    const [h, m] = task.start_time.split(':').map(Number);
    const dt = parseISO(task.due_date);
    dt.setHours(h, m, 0, 0);
    return isBefore(dt, new Date());
  }
  return isBefore(startOfDay(parseISO(task.due_date)), startOfDay(new Date()));
}
