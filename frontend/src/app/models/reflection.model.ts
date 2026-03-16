export interface CategoryStat {
  name: string;
  rate: number;
  streak: number;
}

export interface TimePattern {
  label: string;
  hour: number;
  suggestion: string;
}

export interface Personality {
  type: string;
  icon: string;
  desc: string;
}

export interface ReflectionData {
  empty: boolean;
  message?: string;
  weekNum: number;
  weekStart: string;
  totalHabits: number;
  completedCount: number;
  missedCount: number;
  completionRate: number;
  prevCompletionRate: number;
  trend: string;
  maxStreak: number;
  avgStreak: number;
  strongestHabit: { name: string; streak: number; category: string } | null;
  weakestHabit: { name: string; category: string } | null;
  strongestCategory: CategoryStat | null;
  weakestCategory: CategoryStat | null;
  timePattern: TimePattern | null;
  nightOwl: boolean;
  communityParticipation: number;
  streakConsistency: number;
  disciplineScore: number;
  rank: string;
  personality: Personality;
  suggestions: string[];
  categoryBreakdown: CategoryStat[];
}
