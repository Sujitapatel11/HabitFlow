import { Injectable, signal } from '@angular/core';

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  earned: boolean;
}

export interface PlayerStats {
  xp: number;
  level: number;
  levelName: string;
  xpForNext: number;
  badges: Badge[];
}

const LEVELS = [
  { min: 0,   name: 'Beginner',   icon: '🌱' },
  { min: 100, name: 'Explorer',   icon: '🚀' },
  { min: 250, name: 'Achiever',   icon: '⚡' },
  { min: 500, name: 'Pro',        icon: '🔥' },
  { min: 900, name: 'Master',     icon: '💎' },
  { min: 1500,name: 'Legend',     icon: '👑' },
];

const BADGE_DEFS = [
  { id: 'first_habit',   name: 'First Step',    icon: '🎯', description: 'Complete your first habit' },
  { id: 'streak_3',      name: 'On a Roll',     icon: '🔥', description: '3-day streak' },
  { id: 'streak_7',      name: 'Week Warrior',  icon: '⚔️', description: '7-day streak' },
  { id: 'streak_30',     name: 'Iron Will',     icon: '💪', description: '30-day streak' },
  { id: 'habits_5',      name: 'Habit Builder', icon: '🏗️', description: 'Complete 5 habits' },
  { id: 'habits_20',     name: 'Habit Master',  icon: '🏆', description: 'Complete 20 habits' },
  { id: 'social',        name: 'Social Butterfly', icon: '🦋', description: 'Make your first connection' },
];

@Injectable({ providedIn: 'root' })
export class GamificationService {
  stats = signal<PlayerStats>(this.load());
  newBadge = signal<Badge | null>(null);
  xpPopup = signal<{ amount: number; show: boolean }>({ amount: 0, show: false });

  addXP(amount: number) {
    const s = { ...this.stats() };
    s.xp += amount;
    this.updateLevel(s);
    this.stats.set(s);
    this.save(s);
    this.showXPPopup(amount);
  }

  checkBadges(completedCount: number, maxStreak: number, hasConnection: boolean) {
    const s = { ...this.stats() };
    let earned: Badge | null = null;

    const check = (id: string, condition: boolean) => {
      const b = s.badges.find(b => b.id === id);
      if (b && !b.earned && condition) {
        b.earned = true;
        earned = { ...b };
      }
    };

    check('first_habit', completedCount >= 1);
    check('streak_3',    maxStreak >= 3);
    check('streak_7',    maxStreak >= 7);
    check('streak_30',   maxStreak >= 30);
    check('habits_5',    completedCount >= 5);
    check('habits_20',   completedCount >= 20);
    check('social',      hasConnection);

    this.stats.set(s);
    this.save(s);

    if (earned) {
      this.newBadge.set(earned);
      setTimeout(() => this.newBadge.set(null), 4000);
    }
  }

  private updateLevel(s: PlayerStats) {
    let lvl = 0;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (s.xp >= LEVELS[i].min) { lvl = i; break; }
    }
    s.level = lvl + 1;
    s.levelName = `${LEVELS[lvl].icon} ${LEVELS[lvl].name}`;
    const next = LEVELS[lvl + 1];
    s.xpForNext = next ? next.min : LEVELS[LEVELS.length - 1].min;
  }

  private showXPPopup(amount: number) {
    this.xpPopup.set({ amount, show: true });
    setTimeout(() => this.xpPopup.set({ amount, show: false }), 1800);
  }

  private load(): PlayerStats {
    const saved = localStorage.getItem('hf_gamification');
    if (saved) return JSON.parse(saved);
    const s: PlayerStats = {
      xp: 0, level: 1, levelName: '🌱 Beginner', xpForNext: 100,
      badges: BADGE_DEFS.map(b => ({ ...b, earned: false })),
    };
    return s;
  }

  private save(s: PlayerStats) {
    localStorage.setItem('hf_gamification', JSON.stringify(s));
  }
}
