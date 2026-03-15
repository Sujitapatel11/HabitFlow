import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  mode = signal<'login' | 'register'>('login');

  // Login fields
  email = '';
  password = '';

  // Register fields
  name = '';
  regEmail = '';
  regPassword = '';
  goalCategory = 'Coding';
  bio = '';

  loading = signal(false);
  error = signal('');

  goals = ['Coding', 'Fitness', 'Reading', 'Studying', 'Mindfulness', 'Nutrition', 'Other'];

  constructor(private auth: AuthService, private router: Router) {}

  login() {
    if (!this.email || !this.password) { this.error.set('Email and password are required'); return; }
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => { this.error.set(err.error?.message || 'Login failed'); this.loading.set(false); },
    });
  }

  register() {
    if (!this.name || !this.regEmail || !this.regPassword) { this.error.set('Name, email and password are required'); return; }
    this.loading.set(true);
    this.error.set('');
    this.auth.register({ name: this.name, email: this.regEmail, password: this.regPassword, goalCategory: this.goalCategory, bio: this.bio }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => { this.error.set(err.error?.message || 'Registration failed'); this.loading.set(false); },
    });
  }

  switchMode(m: 'login' | 'register') {
    this.mode.set(m);
    this.error.set('');
  }
}
