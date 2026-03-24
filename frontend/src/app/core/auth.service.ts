import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { AppUser } from '../models/app-user.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = `${environment.apiUrl}/auth`;

  // Non-sensitive user info cached in memory (NOT localStorage)
  // Tokens live in HTTP-only cookies — never accessible to JS
  currentUser = signal<AppUser | null>(this.loadUser());

  constructor(private http: HttpClient, private router: Router) {}

  register(data: { name: string; email: string; password: string; goalCategory: string; bio?: string }) {
    return this.http.post<{ success: boolean; data: AppUser }>(
      `${this.api}/register`, data, { withCredentials: true }
    ).pipe(tap(res => this.saveSession(res.data)));
  }

  login(email: string, password: string) {
    return this.http.post<{ success: boolean; data: AppUser }>(
      `${this.api}/login`, { email, password }, { withCredentials: true }
    ).pipe(tap(res => this.saveSession(res.data)));
  }

  /** Silently refresh access token using the HTTP-only refresh cookie */
  refreshToken(): Observable<{ success: boolean; data: AppUser }> {
    return this.http.post<{ success: boolean; data: AppUser }>(
      `${this.api}/refresh`, {}, { withCredentials: true }
    ).pipe(
      tap(res => this.saveSession(res.data)),
      catchError(err => {
        this.clearSession();
        return throwError(() => err);
      })
    );
  }

  logout() {
    this.http.post(`${this.api}/logout`, {}, { withCredentials: true }).subscribe();
    this.clearSession();
  }

  forgotPassword(email: string) {
    return this.http.post<{ success: boolean; message: string }>(`${this.api}/forgot-password`, { email });
  }

  verifyOtp(email: string, otp: string) {
    return this.http.post<{ success: boolean; message: string }>(`${this.api}/verify-otp`, { email, otp });
  }

  resetPassword(email: string, otp: string, newPassword: string) {
    return this.http.post<{ success: boolean; message: string }>(`${this.api}/reset-password`, { email, otp, newPassword });
  }

  resendVerification(email: string) {
    return this.http.post<{ success: boolean; message: string }>(`${this.api}/resend-verification`, { email });
  }

  uploadAvatar(userId: string, file: File) {
    const form = new FormData();
    form.append('avatar', file);
    form.append('userId', userId);
    return this.http.post<{ success: boolean; avatar: string }>(
      `${environment.apiUrl}/upload/avatar`, form, { withCredentials: true }
    ).pipe(
      tap(res => {
        if (res.success) this.saveSession({ ...this.currentUser()!, avatar: res.avatar });
      })
    );
  }

  updateProfile(userId: string, data: { name?: string; bio?: string; goalCategory?: string }) {
    return this.http.put<{ success: boolean; data: AppUser }>(
      `${environment.apiUrl}/app-users/${userId}`, data, { withCredentials: true }
    ).pipe(tap(res => { if (res.success) this.saveSession(res.data); }));
  }

  isLoggedIn(): boolean { return !!this.currentUser(); }

  private saveSession(user: AppUser) {
    // Store only non-sensitive display info — tokens are in HTTP-only cookies
    localStorage.setItem('hf_user', JSON.stringify(user));
    this.currentUser.set(user);
  }

  clearSession() {
    localStorage.removeItem('hf_user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  private loadUser(): AppUser | null {
    try {
      const u = localStorage.getItem('hf_user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  }
}
