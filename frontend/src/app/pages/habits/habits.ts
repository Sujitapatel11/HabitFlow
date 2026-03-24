import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HabitService } from '../../services/habit.service';
import { AuthService } from '../../core/auth.service';
import { GamificationService } from '../../services/gamification.service';
import { EarnedBadgesPipe } from '../../pipes/earned-badges.pipe';
import { Habit } from '../../models/habit.model';
import { GoalCategory } from '../../models/user.model';

@Component({
  selector: 'app-habits',
  imports: [FormsModule, EarnedBadgesPipe],
  templateUrl: './habits.html',
  styleUrl: './habits.css',
})
export class Habits implements OnInit {
  habits = signal<Habit[]>([]);
  loading = signal(true);
  showForm = signal(false);
  submitting = signal(false);
  error = signal('');
  completingId = signal<string | null>(null); // for animation

  categories: GoalCategory[] = ['Coding','Fitness','Reading','Studying','Mindfulness','Nutrition','Other'];
  form: Partial<Habit> = { name: '', description: '', category: 'Other' };

  constructor(
    private habitService: HabitService,
    private auth: AuthService,
    public gameSvc: GamificationService,
  ) {}

  ngOnInit() {
    this.habitService.getHabits().subscribe({
      next: (res) => { this.habits.set(res.data); this.loading.set(false); },
      error: () => { this.error.set('Failed to load habits'); this.loading.set(false); },
    });
  }

  submit() {
    if (!this.form.name?.trim()) { this.error.set('Name required'); return; }
    this.submitting.set(true);
    this.habitService.createHabit({
      name: this.form.name,
      description: this.form.description,
      category: this.form.category,
    }).subscribe({
      next: (res) => {
        this.habits.update(list => [res.data, ...list]);
        this.form = { name: '', description: '', category: 'Other' };
        this.showForm.set(false);
        this.submitting.set(false);
      },
      error: (err) => { this.error.set(err.error?.message || 'Failed'); this.submitting.set(false); },
    });
  }

  toggle(habit: Habit) {
    if (!habit.completed) {
      // Complete — server calculates XP and streak
      this.completingId.set(habit._id);
      this.habitService.completeHabit(habit._id).subscribe({
        next: (res) => {
          this.habits.update(list => list.map(h => h._id === habit._id ? res.data : h));
          // Use server-returned XP — never calculate on client
          this.gameSvc.addXP(res.xpGained);
          this.launchConfetti();
          const all = this.habits();
          const completedCount = all.filter(h => h.completed).length;
          const maxStreak = Math.max(...all.map(h => h.streak), 0);
          this.gameSvc.checkBadges(completedCount, maxStreak, false);
          setTimeout(() => this.completingId.set(null), 800);
        },
        error: (err) => { this.error.set(err.error?.message || 'Failed'); this.completingId.set(null); },
      });
    } else {
      this.habitService.undoHabit(habit._id).subscribe({
        next: (res) => this.habits.update(list => list.map(h => h._id === habit._id ? res.data : h)),
        error: (err) => this.error.set(err.error?.message || 'Failed'),
      });
    }
  }

  delete(id: string) {
    if (!confirm('Delete this habit?')) return;
    this.habitService.deleteHabit(id).subscribe({
      next: () => this.habits.update(list => list.filter(h => h._id !== id)),
    });
  }

  launchConfetti() {
    const colors = ['#6c63ff','#22c55e','#f59e0b','#48cae4','#ec4899'];
    for (let i = 0; i < 60; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.cssText = `
        left:${Math.random()*100}vw;
        background:${colors[Math.floor(Math.random()*colors.length)]};
        animation-duration:${0.8 + Math.random()*1.2}s;
        animation-delay:${Math.random()*0.4}s;
        width:${6+Math.random()*6}px;
        height:${6+Math.random()*6}px;
        border-radius:${Math.random()>0.5?'50%':'2px'};
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2000);
    }
  }

  getCategoryColor(cat: string): string {
    const m: Record<string,string> = { Coding:'#6c63ff', Fitness:'#f59e0b', Reading:'#22c55e', Studying:'#48cae4', Mindfulness:'#ec4899', Nutrition:'#10b981', Other:'#94a3b8' };
    return m[cat] || '#94a3b8';
  }

  xpProgress(): number {
    const s = this.gameSvc.stats();
    const levels = [0, 100, 250, 500, 900, 1500];
    const lvlIdx = s.level - 1;
    const current = levels[lvlIdx] || 0;
    const next = levels[lvlIdx + 1] || current + 100;
    return Math.min(((s.xp - current) / (next - current)) * 100, 100);
  }
}
