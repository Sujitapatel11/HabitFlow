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
  levelIcon: string;
  xpForNext: number;
  xpCurrent: number; // XP at start of current level (for progress calc)
  badges: Badge[];
}

export interface LevelUpEvent {
  newLevel: number;
  levelName: string;
  levelIcon: string;
  rankColor: string;
}

export const LEVELS = [
  { min: 0,    name: 'Space Cadet',   icon: '🛸', color: '#6B7DB3' },
  { min: 100,  name: 'Pilot',         icon: '🚀', color: '#00D4FF' },
  { min: 250,  name: 'Commander',     icon: '⚡', color: '#00FF88' },
  { min: 500,  name: 'Admiral',       icon: '🌌', color: '#FFB800' },
  { min: 900,  name: 'Legend',        icon: '💫', color: '#BF5FFF' },
  { min: 1500, name: 'Galactic God',  icon: '🤖', color: '#FF3B5C' },
];

const BADGE_DEFS = [
  { id: 'first_habit', name: 'First Launch',   icon: '🛸', description: 'Complete your first mission' },
  { id: 'streak_3',    name: 'Orbit Locked',   icon: '🔥', description: '3-day reactor streak' },
  { id: 'streak_7',    name: 'Warp Speed',     icon: '⚡', description: '7-day reactor streak' },
  { id: 'streak_30',   name: 'Iron Protocol',  icon: '🤖', description: '30-day reactor streak' },
  { id: 'habits_5',    name: 'System Builder', icon: '🏗️', description: 'Complete 5 missions' },
  { id: 'habits_20',   name: 'Cyber Master',   icon: '💎', description: 'Complete 20 missions' },
  { id: 'social',      name: 'Neural Link',    icon: '🔗', description: 'Make your first connection' },
];

@Injectable({ providedIn: 'root' })
export class GamificationService {
  stats    = signal<PlayerStats>(this.load());
  newBadge = signal<Badge | null>(null);
  levelUp  = signal<LevelUpEvent | null>(null);
  xpPopup  = signal<{ amount: number; show: boolean }>({ amount: 0, show: false });

  addXP(amount: number) {
    const s = { ...this.stats() };
    const prevLevel = s.level;
    s.xp += amount;
    this.updateLevel(s);
    this.stats.set(s);
    this.save(s);
    this.showXPPopup(amount);

    // Fire level-up event if rank changed
    if (s.level > prevLevel) {
      const lvlDef = LEVELS[s.level - 1];
      const evt: LevelUpEvent = {
        newLevel: s.level,
        levelName: lvlDef.name,
        levelIcon: lvlDef.icon,
        rankColor: lvlDef.color,
      };
      this.levelUp.set(evt);
      setTimeout(() => this.levelUp.set(null), 5000);
    }
  }

  checkBadges(completedCount: number, maxStreak: number, hasConnection: boolean) {
    const s = { ...this.stats() };
    let earned: Badge | null = null;

    const check = (id: string, condition: boolean) => {
      const b = s.badges.find(b => b.id === id);
      if (b && !b.earned && condition) { b.earned = true; earned = { ...b }; }
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
      setTimeout(() => this.newBadge.set(null), 4500);
    }
  }

  /** Progress 0–100 within current level band */
  levelProgress(): number {
    const s = this.stats();
    const lvlIdx = s.level - 1;
    const cur  = LEVELS[lvlIdx]?.min ?? 0;
    const next = LEVELS[lvlIdx + 1]?.min ?? cur + 500;
    return Math.min(((s.xp - cur) / (next - cur)) * 100, 100);
  }

  /** Color for current rank */
  rankColor(): string {
    return LEVELS[this.stats().level - 1]?.color ?? '#00D4FF';
  }

  private updateLevel(s: PlayerStats) {
    let lvl = 0;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (s.xp >= LEVELS[i].min) { lvl = i; break; }
    }
    s.level     = lvl + 1;
    s.levelIcon = LEVELS[lvl].icon;
    s.levelName = LEVELS[lvl].name;
    s.xpCurrent = LEVELS[lvl].min;
    const next  = LEVELS[lvl + 1];
    s.xpForNext = next ? next.min : LEVELS[LEVELS.length - 1].min + 500;
  }

  private showXPPopup(amount: number) {
    this.xpPopup.set({ amount, show: true });
    setTimeout(() => this.xpPopup.set({ amount, show: false }), 2000);
  }

  private load(): PlayerStats {
    const saved = localStorage.getItem('hf_gamification');
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.badges = BADGE_DEFS.map(def => {
        const existing = parsed.badges?.find((b: Badge) => b.id === def.id);
        return { ...def, earned: existing?.earned ?? false };
      });
      // ensure new fields exist
      if (!parsed.levelIcon) parsed.levelIcon = '🛸';
      if (!parsed.xpCurrent) parsed.xpCurrent = 0;
      return parsed;
    }
    return {
      xp: 0, level: 1, levelName: 'Space Cadet', levelIcon: '🛸',
      xpForNext: 100, xpCurrent: 0,
      badges: BADGE_DEFS.map(b => ({ ...b, earned: false })),
    };
  }

  private save(s: PlayerStats) {
    localStorage.setItem('hf_gamification', JSON.stringify(s));
  }
}
