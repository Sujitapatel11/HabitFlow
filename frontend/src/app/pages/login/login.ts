import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

type Mode = 'login' | 'register' | 'forgot' | 'verify-otp' | 'reset';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  mode = signal<Mode>('login');

  // Login
  email = '';
  password = '';

  // Register
  name = '';
  regEmail = '';
  regPassword = '';
  goalCategory = 'Coding';
  bio = '';

  // Forgot / OTP / Reset
  forgotEmail = '';
  otp = '';
  newPassword = '';
  confirmPassword = '';

  loading = signal(false);
  error = signal('');
  success = signal('');

  goals = ['Coding', 'Fitness', 'Reading', 'Studying', 'Mindfulness', 'Nutrition', 'Other'];

  constructor(private auth: AuthService, private router: Router) {}

  login() {
    if (!this.email || !this.password) { this.error.set('Email and password are required'); return; }
    this.loading.set(true); this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => { this.error.set(err.error?.message || 'Login failed'); this.loading.set(false); },
    });
  }

  register() {
    if (!this.name || !this.regEmail || !this.regPassword) { this.error.set('Name, email and password are required'); return; }
    this.loading.set(true); this.error.set('');
    this.auth.register({ name: this.name, email: this.regEmail, password: this.regPassword, goalCategory: this.goalCategory, bio: this.bio }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => { this.error.set(err.error?.message || 'Registration failed'); this.loading.set(false); },
    });
  }

  sendOtp() {
    if (!this.forgotEmail) { this.error.set('Enter your email'); return; }
    this.loading.set(true); this.error.set('');
    this.auth.forgotPassword(this.forgotEmail).subscribe({
      next: () => { this.loading.set(false); this.mode.set('verify-otp'); this.success.set('OTP sent! Check your email.'); },
      error: (err) => { this.error.set(err.error?.message || 'Failed to send OTP'); this.loading.set(false); },
    });
  }

  verifyOtp() {
    if (!this.otp) { this.error.set('Enter the OTP'); return; }
    this.loading.set(true); this.error.set('');
    this.auth.verifyOtp(this.forgotEmail, this.otp).subscribe({
      next: () => { this.loading.set(false); this.mode.set('reset'); this.success.set('OTP verified. Set your new password.'); },
      error: (err) => { this.error.set(err.error?.message || 'Invalid OTP'); this.loading.set(false); },
    });
  }

  resetPassword() {
    if (!this.newPassword || !this.confirmPassword) { this.error.set('Fill in both password fields'); return; }
    if (this.newPassword !== this.confirmPassword) { this.error.set('Passwords do not match'); return; }
    if (this.newPassword.length < 6) { this.error.set('Password must be at least 6 characters'); return; }
    this.loading.set(true); this.error.set('');
    this.auth.resetPassword(this.forgotEmail, this.otp, this.newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set('Password reset! You can now log in.');
        this.mode.set('login');
        this.newPassword = ''; this.confirmPassword = ''; this.otp = '';
      },
      error: (err) => { this.error.set(err.error?.message || 'Reset failed'); this.loading.set(false); },
    });
  }

  switchMode(m: Mode) {
    this.mode.set(m);
    this.error.set('');
    this.success.set('');
  }
}
