# WeekForce

A productivity planner for Android, iOS, and Web built with Expo. Set weekly goals, schedule daily tasks, build habits, earn XP, and climb through 25 ranks.

---

## Features

- **Weekly Planner** — schedule tasks by day with priority, time estimates, and difficulty
- **Goals** — create weekly goals across six categories: Health, Work, Personal, Learning, Finance, Other
- **Habits** — recurring tasks (daily / weekly / custom days); marks blocked on non-scheduled days
- **XP System** — earn XP per task and goal completion scaled by difficulty
- **Rank Progression** — 25 ranks across four tracks (Starter → Specialist → Leader → Prestige); requires both XP and qualifying days
- **Performance Dashboard** — weekly summary of goals and tasks set vs. completed
- **Notifications** — daily reminder and per-task start-time alerts
- **Onboarding** — first-run flow to pick a daily XP target; re-runnable any time from profile
- **Profile & Settings** — edit name, XP target, notifications; reset progress or delete account

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Expo SDK 54 / React Native 0.81 |
| Router | Expo Router v4 (file-based) |
| Styling | NativeWind v4 (Tailwind CSS) |
| State | Zustand v5 |
| Server state | TanStack Query v5 |
| Backend | Supabase (Postgres + Auth + RLS) |
| Auth | Google OAuth / Apple Sign-In via `expo-web-browser` |

---

## Project Structure

```
app/
  _layout.tsx          # Root layout — auth guard, OAuth deep-link handler
  index.tsx            # Entry redirect (auth → onboarding → tabs)
  onboarding.tsx       # First-run XP target setup
  profile.tsx          # Profile, settings, danger zone
  (auth)/
    sign-in.tsx        # Google/Apple OAuth + email sign-in
    sign-up.tsx        # Email registration
    forgot-password.tsx
  (tabs)/
    index.tsx          # Home — XP bar and today's tasks
    planner.tsx        # Weekly planner
    goals.tsx          # Goals list
    habits.tsx         # Habits screen
    rank.tsx           # Rank ladder & progress
    performance.tsx    # Weekly summary stats
  goal/[id].tsx        # Goal detail
  task/[id].tsx        # Task detail modal

components/
  ui/                  # Button, Input, Card, Badge, TimePicker, DatePicker, WeekNav, XPToast
  goals/               # GoalCard, GoalForm
  tasks/               # TaskForm
  home/                # XPBar
  rank/                # RankBadge

hooks/
  useUser.ts           # User profile, XP events, account management
  useGoals.ts          # Goals CRUD
  useTasks.ts          # Tasks CRUD + recurring completion logic
  useNotifications.ts  # Push notification preferences
  useWeeklySummary.ts  # Weekly stats

store/
  auth.ts              # Session, onboarded flag, user profile

constants/
  ranks.ts             # 25 ranks with XP/qualifying-day thresholds
  xp.ts                # XP awards by difficulty, categories, days

supabase/migrations/   # Run these in order in the Supabase SQL editor
  001_schema.sql       # Base schema + RLS policies + trigger + RPCs
  002_difficulty_recurrence.sql
  003_recurring_completions.sql
  004_fix_schema.sql   # REQUIRED: source_id → TEXT, goal_id nullable
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone <repo-url>
cd WeekForce
npm install
```

### 2. Set environment variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run database migrations

Open the Supabase SQL editor and run each file in `supabase/migrations/` in order (001 → 004). Migration `004_fix_schema.sql` is required — it changes `xp_events.source_id` to `TEXT` (habits use a composite `taskId_date` key, not a UUID) and makes `tasks.goal_id` nullable.

### 4. Configure OAuth (optional)

In the Supabase dashboard under **Authentication → Providers**, enable Google and/or Apple. Add the app's redirect URL under **Authentication → URL Configuration → Redirect URLs**:

```
weekforce://
```

### 5. Start the app

```bash
npm start        # Expo dev server — press a / i / w for Android / iOS / web

npm run android  # Direct Android build
npm run ios      # Direct iOS build
npm run web      # Web only
```

---

## XP System

Tasks and goals award XP based on difficulty when completed:

| Difficulty | Task XP | Goal XP |
|---|---|---|
| Easy | 5 | 50 |
| Medium | 10 | 100 |
| Hard | 25 | 200 |
| Epic | 50 | 400 |

A **qualifying day** is any calendar day on which you hit your chosen daily XP target (Casual 20 / Regular 50 / Active 100 / Hardcore 200). Rank promotion requires both enough total XP and enough qualifying days.

---

## Ranks

25 ranks from **Beginner** to **Immortal** across four tracks:

| Track | Ranks |
|---|---|
| Starter | 1 – 9 (Beginner → Committed) |
| Specialist | 10 – 14 (Sharpener → Veteran) |
| Leader | 15 – 24 (Pioneer → Legend) |
| Prestige | 25 (Immortal) |

---

## Database Schema

All tables are protected by Row Level Security.

| Table | Purpose |
|---|---|
| `users` | Profile, XP total, qualifying days, current rank |
| `goals` | Weekly goals per user |
| `tasks` | Daily/recurring tasks, optionally linked to a goal |
| `xp_events` | Immutable log of every XP award |
| `weekly_summaries` | Aggregated stats per user per week |
| `ranks` | Static rank reference data (25 rows) |

Key RPCs:

- `increment_user_xp(user_id, amount)` — adds XP and auto-promotes rank when thresholds are met
- `record_qualifying_day(user_id)` — increments the qualifying-days counter

A `handle_new_user` trigger auto-creates a `public.users` row whenever a new auth user is created. If the trigger misses an OAuth sign-in, `useUser` detects the missing row and creates it from session metadata automatically.
