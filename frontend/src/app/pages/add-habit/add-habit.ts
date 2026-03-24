import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HabitService } from '../../services/habit.service';
import { Habit } from '../../models/habit.model';

@Component({
  selector: 'app-add-habit',
  imports: [FormsModule, RouterLink],
  templateUrl: './add-habit.html',
  styleUrl: './add-habit.css',
})
export class AddHabit {
  form: Partial<Habit> = {
    name: '',
    description: '',
    category: 'Other',
  };

  categories: Habit['category'][] = ['Coding', 'Fitness', 'Reading', 'Studying', 'Mindfulness', 'Nutrition', 'Other'];
  submitting = signal(false);
  error = signal('');
  success = signal(false);

  constructor(private habitService: HabitService, private router: Router) {}

  onSubmit(): void {
    if (!this.form.name?.trim()) {
      this.error.set('Habit name is required.');
      return;
    }

    this.submitting.set(true);
    this.error.set('');

    this.habitService.createHabit({
      name: this.form.name!,
      description: this.form.description,
      category: this.form.category,
    }).subscribe({
      next: () => {
        this.success.set(true);
        setTimeout(() => this.router.navigate(['/habits']), 1200);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to create habit.');
        this.submitting.set(false);
      },
    });
  }
}
