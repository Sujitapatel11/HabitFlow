import { Component, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth.service';

type Mode = 'login' | 'register' | 'forgot' | 'verify-otp' | 'reset' | 'verify-sent' | 'verified';

interface PasswordStrength { score: number; label: string; color: string; }

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  mode = signal<Mode>('login');

  // Fields
  email = ''; password = ''; showPassword = false;
  name = ''; regEmail = ''; regPassword = ''; showRegPassword = false;
  goalCategory = 'Coding'; bio = '';
  forgotEmail = ''; otp = ''; newPassword = ''; confirmPassword = '';
  showNewPassword = false;

  // OTP digit inputs
  otpDigits = ['', '', '', '', '', ''];

  loading  = signal(false);
  error    = signal('');
  success  = signal('');
  shake    = signal(false);
  showWelcome = signal(false); // "Welcome, Pilot 🚀" animation

  // Real-time field errors
  emailErr    = signal('');
  passwordErr = signal('');
  nameErr     = signal('');

  readonly goals = ['Coding','Fitness','Reading','Studying','Mindfulness','Nutrition','Other'];

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    // Handle ?verified=1 redirect from backend
    this.route.queryParams.subscribe(p => {
      if (p['verified'] === '1') {
        this.mode.set('verified');
        this.success.set('Email verified! You can now log in.');
      }
    });
  }

  // ── Password strength ──────────────────────────────────────────────────────
  passwordStrength(pw: string): PasswordStrength {
    if (!pw) return { score: 0, label: '', color: 'transparent' };
    let score = 0;
    if (pw.length >= 8)          score++;
    if (/[A-Z]/.test(pw))        score++;
    if (/[a-z]/.test(pw))        score++;
    if (/[0-9]/.test(pw))        score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const map: Record<number, PasswordStrength> = {
      0: { score: 0, label: '',          color: 'transparent' },
      1: { score: 1, label: 'Very weak', color: '#FF3B5C' },
      2: { score: 2, label: 'Weak',      color: '#FF3B5C' },
      3: { score: 3, label: 'Fair',      color: '#FFB800' },
      4: { score: 4, label: 'Strong',    color: '#00FF88' },
      5: { score: 5, label: 'Excellent', color: '#00D4FF' },
    };
    return map[score];
  }

  get regStrength() { return this.passwordStrength(this.regPassword); }
  get newStrength()  { return this.passwordStrength(this.newPassword); }

  // ── Validation ─────────────────────────────────────────────────────────────
  validateEmail(val: string) {
    this.emailErr.set(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ? '' : 'Enter a valid email');
  }
  validatePassword(val: string) {
    if (!val) { this.passwordErr.set(''); return; }
    const errs = [];
    if (val.length < 8)           errs.push('8+ chars');
    if (!/[A-Z]/.test(val))       errs.push('uppercase');
    if (!/[a-z]/.test(val))       errs.push('lowercase');
    if (!/[0-9]/.test(val))       errs.push('number');
    if (!/[^A-Za-z0-9]/.test(val)) errs.push('symbol');
    this.passwordErr.set(errs.length ? `Needs: ${errs.join(', ')}` : '');
  }
  validateName(val: string) {
    this.nameErr.set(val.trim().length >= 2 ? '' : 'At least 2 characters');
  }

  // ── OTP digit input ────────────────────────────────────────────────────────
  get otpValue() { return this.otpDigits.join(''); }

  onOtpInput(i: number, e: Event) {
    const val = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(-1);
    this.otpDigits[i] = val;
    if (val && i < 5) {
      const next = document.getElementById(`otp-${i + 1}`) as HTMLInputElement;
      next?.focus();
    }
  }
  onOtpKeydown(i: number, e: KeyboardEvent) {
    if (e.key === 'Backspace' && !this.otpDigits[i] && i > 0) {
      const prev = document.getElementById(`otp-${i - 1}`) as HTMLInputElement;
      prev?.focus();
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  private triggerShake() {
    this.shake.set(true);
    setTimeout(() => this.shake.set(false), 500);
  }

  login() {
    if (!this.email || !this.password) {
      this.error.set('Email and password required'); this.triggerShake(); return;
    }
    this.loading.set(true); this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/dashboard']); },
      error: (err) => {
        this.error.set(err.error?.message || 'Login failed');
        this.loading.set(false); this.triggerShake();
      },
    });
  }

  register() {
    if (!this.name || !this.regEmail || !this.regPassword) {
      this.error.set('All fields required'); this.triggerShake(); return;
    }
    if (this.regStrength.score < 3) {
      this.error.set('Password too weak'); this.triggerShake(); return;
    }
    this.loading.set(true); this.error.set('');
    this.auth.register({
      name: this.name, email: this.regEmail, password: this.regPassword,
      goalCategory: this.goalCategory, bio: this.bio,
    }).subscribe({
      next: () => { this.loading.set(false); this.mode.set('verify-sent'); },
      error: (err) => {
        this.error.set(err.error?.message || 'Registration failed');
        this.loading.set(false); this.triggerShake();
      },
    });
  }

  sendOtp() {
    if (!this.forgotEmail) { this.error.set('Enter your email'); this.triggerShake(); return; }
    this.loading.set(true); this.error.set('');
    this.auth.forgotPassword(this.forgotEmail).subscribe({
      next: () => { this.loading.set(false); this.mode.set('verify-otp'); this.success.set('OTP sent! Check your inbox.'); },
      error: (err) => { this.error.set(err.error?.message || 'Failed'); this.loading.set(false); this.triggerShake(); },
    });
  }

  verifyOtp() {
    const code = this.otpValue;
    if (code.length < 6) { this.error.set('Enter all 6 digits'); this.triggerShake(); return; }
    this.loading.set(true); this.error.set('');
    this.auth.verifyOtp(this.forgotEmail, code).subscribe({
      next: () => { this.loading.set(false); this.mode.set('reset'); this.success.set('OTP verified. Set your new password.'); },
      error: (err) => { this.error.set(err.error?.message || 'Invalid OTP'); this.loading.set(false); this.triggerShake(); },
    });
  }

  resetPassword() {
    if (!this.newPassword || !this.confirmPassword) { this.error.set('Fill both fields'); this.triggerShake(); return; }
    if (this.newPassword !== this.confirmPassword) { this.error.set('Passwords do not match'); this.triggerShake(); return; }
    if (this.newStrength.score < 3) { this.error.set('Password too weak'); this.triggerShake(); return; }
    this.loading.set(true); this.error.set('');
    this.auth.resetPassword(this.forgotEmail, this.otpValue, this.newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set('Password reset! You can now log in.');
        this.mode.set('login');
        this.newPassword = ''; this.confirmPassword = ''; this.otpDigits = ['','','','','',''];
      },
      error: (err) => { this.error.set(err.error?.message || 'Reset failed'); this.loading.set(false); this.triggerShake(); },
    });
  }

  resendVerification() {
    this.auth.resendVerification(this.regEmail || this.forgotEmail).subscribe({
      next: () => this.success.set('Verification email resent.'),
      error: () => {},
    });
  }

  switchMode(m: Mode) { this.mode.set(m); this.error.set(''); this.success.set(''); }
}
