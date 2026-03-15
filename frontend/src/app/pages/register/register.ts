import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

type GoalCategory = 'Coding' | 'Fitness' | 'Reading' | 'Studying' | 'Mindfulness' | 'Nutrition' | 'Other';

@Component({
  selector: 'app-register',
  imports: [FormsModule],
  templateUrl: './register.html',
  styleUrl: '../login/login.css',
})
export class Register {
  name = ''; email = ''; password = '';
  goalCategory: GoalCategory = 'Coding';
  allGoals: GoalCategory[] = ['Coding', 'Fitness', 'Reading', 'Studying', 'Mindfulness', 'Nutrition', 'Other'];
  loading = signal(false);
  error = signal('');

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    if (!this.name || !this.email || !this.password) { this.error.set('All fields required'); return; }
    this.loading.set(true); this.error.set('');
    this.auth.register({ name: this.name, email: this.email, password: this.password, goalCategory: this.goalCategory }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err: any) => { this.error.set(err.error?.message || 'Registration failed'); this.loading.set(false); },
    });
  }
}
