# WeekForce

A gamified productivity planner for iOS, Android, and Web. Turn your goals into weekly missions, earn XP for completing tasks, and climb through 25 ranks.

## Features

- **Weekly planner** — schedule tasks by day, filter by priority, toggle completion
- **Goals & milestones** — track long-term goals with category, difficulty, and due dates
- **Habits** — recurring daily/weekly tasks with streak tracking
- **XP system** — earn XP per task/goal/milestone completion based on difficulty
- **Rank progression** — 25 ranks from Beginner to Immortal, gated by total XP and qualifying days
- **Performance tab** — weekly summary, XP history, and qualifying day streaks
- **Auth** — email/password sign-in via Supabase

## XP values

| Difficulty | Task | Goal | Milestone |
|------------|------|------|-----------|
| Easy       | 5    | 50   | 500       |
| Medium     | 10   | 100  | 1 000     |
| Hard       | 25   | 200  | 2 000     |
| Epic       | 50   | 400  | 5 000     |

## Tech stack

| Layer      | Library |
|------------|---------|
| Framework  | Expo SDK 54, React Native 0.81.5 |
| Navigation | Expo Router 4 |
| Styling    | NativeWind v4 (Tailwind) |
| State      | Zustand 5 |
| Data       | TanStack Query 5 |
| Backend    | Supabase (Postgres + Auth + RLS + Edge Functions) |

## Getting started

### 1. Clone and install

```bash
git clone <repo-url>
cd WeekForce
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Create `.env` from the example:

```bash
cp .env.example .env
```

Fill in `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run database migrations

Open the Supabase SQL editor and run each migration in order:

```
supabase/migrations/001_schema.sql
supabase/migrations/002_difficulty_recurrence.sql
...
supabase/migrations/013_fixes.sql
```

### 4. Start the app

```bash
npm start
```

| Key | Target |
|-----|--------|
| `a` | Android emulator / connected device |
| `i` | iOS simulator |
| `w` | Web browser |
| Scan QR | Expo Go on a physical device |

To run a full native build (requires Android Studio / Xcode):

```bash
npm run android
npm run ios
```

## Project structure

```
app/
  (auth)/          # Sign-in, sign-up, forgot-password
  (tabs)/          # Home, Planner, Goals, Habits, Performance, Rank
  goal/[id].tsx    # Goal detail
  task/[id].tsx    # Task detail
  milestone/[id].tsx
  onboarding.tsx
  profile.tsx
components/
  goals/           # GoalCard, GoalForm, MilestoneCard, MilestoneForm
  tasks/           # TaskCard, TaskForm
  ui/              # Shared UI primitives
constants/
  xp.ts            # XP values, difficulty config, rank names
hooks/             # useGoals, useTasks, useMilestones, useUser, ...
lib/
  supabase.ts      # Supabase client
  utils.ts
store/
  auth.ts          # Zustand auth store
  ui.ts            # Selected week, XP animation state
supabase/
  migrations/      # SQL migrations 001–013
types/
  index.ts
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
