import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HabitService } from '../../services/habit.service';
import { AuthService } from '../../core/auth.service';
import { Habit } from '../../models/habit.model';
import { GoalCategory } from '../../models/user.model';

@Component({
  selector: 'app-habits',
  imports: [FormsModule],
  templateUrl: './habits.html',
  styleUrl: './habits.css',
})
export class Habits implements OnInit {
  habits = signal<Habit[]>([]);
  loading = signal(true);
  showForm = signal(false);
  submitting = signal(false);
  error = signal('');

  categories: GoalCategory[] = ['Coding','Fitness','Reading','Studying','Mindfulness','Nutrition','Other'];
  form: Partial<Habit> = { name: '', description: '', category: 'Other' };

  constructor(private habitService: HabitService, private auth: AuthService) {}

  ngOnInit() {
    this.habitService.getHabits().subscribe({
      next: (res) => { this.habits.set(res.data); this.loading.set(false); },
      error: () => { this.error.set('Failed to load habits'); this.loading.set(false); },
    });
  }

  submit() {
    if (!this.form.name?.trim()) { this.error.set('Name required'); return; }
    this.submitting.set(true);
    this.habitService.createHabit(this.form).subscribe({
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
    const authorName = this.auth.currentUser()?.name || 'Someone';
    this.habitService.updateHabit(habit._id, { completed: !habit.completed, authorName } as any).subscribe({
      next: (res) => this.habits.update(list => list.map(h => h._id === habit._id ? res.data : h)),
    });
  }

  delete(id: string) {
    if (!confirm('Delete this habit?')) return;
    this.habitService.deleteHabit(id).subscribe({
      next: () => this.habits.update(list => list.filter(h => h._id !== id)),
    });
  }

  getCategoryColor(cat: string): string {
    const m: Record<string,string> = { Coding:'#6c63ff', Fitness:'#f59e0b', Reading:'#22c55e', Studying:'#48cae4', Mindfulness:'#ec4899', Nutrition:'#10b981', Other:'#94a3b8' };
    return m[cat] || '#94a3b8';
  }
}
