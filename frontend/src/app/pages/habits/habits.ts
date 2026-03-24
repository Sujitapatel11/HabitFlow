import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HabitService } from '../../services/habit.service';
import { GamificationService } from '../../services/gamification.service';
import { OptimisticService } from '../../services/optimistic.service';
import { ResistanceService } from '../../services/resistance.service';
import { ShakeDirective } from '../../directives/shake.directive';
import { EarnedBadgesPipe } from '../../pipes/earned-badges.pipe';
import { ProgressionComponent } from '../../components/progression/progression';
import { Habit } from '../../models/habit.model';
import { GoalCategory } from '../../models/user.model';

@Component({
  selector: 'app-habits',
  imports: [FormsModule, EarnedBadgesPipe, ShakeDirective, ProgressionComponent],
  templateUrl: './habits.html',
  styleUrl: './habits.css',
})
export class Habits implements OnInit {
  habits     = signal<Habit[]>([]);
  loading    = signal(true);
  showForm   = signal(false);
  submitting = signal(false);
  error      = signal('');
  pendingId  = signal<string | null>(null);
  failedId   = signal<string | null>(null);

  maxStreak  = computed(() => Math.max(...this.habits().map(h => h.streak), 0));

  skeletonCount = Array(4); // 4 skeleton cards while loading

  categories: GoalCategory[] = ['Coding','Fitness','Reading','Studying','Mindfulness','Nutrition','Other'];
  form: Partial<Habit> = { name: '', description: '', category: 'Other' };

  constructor(
    private habitSvc: HabitService,
    public  gameSvc:  GamificationService,
    private optimistic: OptimisticService,
    public  resistance: ResistanceService,
  ) {}

  ngOnInit() {
    this.habitSvc.getHabits().subscribe({
      next:  (res) => { this.habits.set(res.data); this.loading.set(false); },
      error: ()    => { this.error.set('Transmission failed. Check backend.'); this.loading.set(false); },
    });
  }

  submit() {
    if (!this.form.name?.trim()) { this.error.set('Mission name required'); return; }
    this.submitting.set(true);

    // Optimistic: prepend a temporary card immediately
    const tempId = `temp_${Date.now()}`;
    const tempHabit: Habit = {
      _id: tempId, userId: '', name: this.form.name!, description: this.form.description || '',
      category: (this.form.category as GoalCategory) || 'Other',
      completed: false, streak: 0, lastCompletedDate: null, createdAt: new Date().toISOString(),
    };
    const rollback = this.optimistic.prepend(this.habits, tempHabit);

    this.habitSvc.createHabit({
      name: this.form.name, description: this.form.description, category: this.form.category,
    }).subscribe({
      next: (res) => {
        // Replace temp card with real server response
        this.habits.update(list => list.map(h => h._id === tempId ? res.data : h));
        this.form = { name: '', description: '', category: 'Other' };
        this.showForm.set(false);
        this.submitting.set(false);
      },
      error: (err) => {
        rollback();
        this.error.set(err.error?.message || 'Failed to create mission');
        this.submitting.set(false);
      },
    });
  }

  toggle(habit: Habit) {
    if (habit._id.startsWith('temp_')) return;

    if (!habit.completed) {
      // ── Resistance evaluation (client-side signal, invisible) ────────────
      const clientDelay = this.resistance.recordAndEvaluate('complete', habit._id);

      this.pendingId.set(habit._id);
      const rollback = this.optimistic.updateItem(this.habits, habit._id, {
        completed: true,
        streak: habit.streak + 1,
      });

      // Apply client-side resistance delay before showing optimistic state
      // Normal users: 0ms. Suspicious users: feels like natural network latency.
      const doComplete = () => {
        this.habitSvc.completeHabit(habit._id).subscribe({
          next: (res) => {
            this.habits.update(list => list.map(h => h._id === habit._id ? res.data : h));
            this.gameSvc.addXP(res.xpGained);
            this.launchConfetti();
            const all = this.habits();
            this.gameSvc.checkBadges(
              all.filter(h => h.completed).length,
              Math.max(...all.map(h => h.streak), 0),
              false
            );
            this.pendingId.set(null);
          },
          error: (err) => {
            rollback();
            this.pendingId.set(null);
            this.failedId.set(habit._id);
            this.error.set(err.error?.message || 'Check-in failed');
            setTimeout(() => this.failedId.set(null), 800);
          },
        });
      };

      if (clientDelay > 0) {
        setTimeout(doComplete, clientDelay);
      } else {
        doComplete();
      }
    } else {
      // ── Optimistic undo ──────────────────────────────────────────────────
      this.resistance.recordAndEvaluate('undo', habit._id);
      const rollback = this.optimistic.updateItem(this.habits, habit._id, {
        completed: false,
        streak: Math.max(0, habit.streak - 1),
      });

      this.habitSvc.undoHabit(habit._id).subscribe({
        next: (res) => this.habits.update(list => list.map(h => h._id === habit._id ? res.data : h)),
        error: (err) => {
          rollback();
          this.error.set(err.error?.message || 'Undo failed');
        },
      });
    }
  }

  delete(id: string) {
    if (!confirm('Delete this mission?')) return;
    const rollback = this.optimistic.remove(this.habits, id);
    this.habitSvc.deleteHabit(id).subscribe({
      error: () => { rollback(); this.error.set('Delete failed'); },
    });
  }

  launchConfetti() {
    const colors = ['#00D4FF','#00FF88','#FFB800','#BF5FFF','#FF3B5C'];
    for (let i = 0; i < 55; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.cssText = `
        left:${Math.random()*100}vw;
        background:${colors[Math.floor(Math.random()*colors.length)]};
        animation-duration:${0.9+Math.random()*1.1}s;
        animation-delay:${Math.random()*0.35}s;
        width:${5+Math.random()*7}px; height:${5+Math.random()*7}px;
        border-radius:${Math.random()>.5?'50%':'2px'};
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2200);
    }
  }

  getCategoryColor(cat: string): string {
    const m: Record<string,string> = {
      Coding:'#00D4FF', Fitness:'#FFB800', Reading:'#00FF88',
      Studying:'#48cae4', Mindfulness:'#BF5FFF', Nutrition:'#10b981', Other:'#6B7DB3',
    };
    return m[cat] || '#6B7DB3';
  }
}
