import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { AppUser } from '../models/app-user.model';
import { environment } from '../../environments/environment';

const TOKEN_KEY   = 'hf_token';
const REFRESH_KEY = 'hf_refresh';
const USER_KEY    = 'hf_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = `${environment.apiUrl}/auth`;

  currentUser = signal<AppUser | null>(this.loadUser());

  constructor(private http: HttpClient, private router: Router) {}

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  private saveToken(token: string) {
    sessionStorage.setItem(TOKEN_KEY, token);
  }

  private saveSession(user: AppUser, accessToken?: string, refreshToken?: string) {
    if (accessToken) sessionStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  // ── Auth endpoints ────────────────────────────────────────────────────────

  register(data: { name: string; email: string; password: string; goalCategory: string; bio?: string }) {
    return this.http.post<{ success: boolean; data: AppUser }>(
      `${this.api}/register`, data
    );
  }

  login(email: string, password: string) {
    return this.http.post<{ success: boolean; data: AppUser; accessToken: string; refreshToken: string }>(
      `${this.api}/login`, { email, password }
    ).pipe(tap(res => this.saveSession(res.data, res.accessToken, res.refreshToken)));
  }

  refreshToken(): Observable<{ success: boolean; data: AppUser; accessToken: string; refreshToken: string }> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearSession();
      return throwError(() => new Error('No refresh token'));
    }
    return this.http.post<{ success: boolean; data: AppUser; accessToken: string; refreshToken: string }>(
      `${this.api}/refresh`, { refreshToken }
    ).pipe(
      tap(res => this.saveSession(res.data, res.accessToken, res.refreshToken)),
      catchError(err => {
        this.clearSession();
        return throwError(() => err);
      })
    );
  }

  logout() {
    const refreshToken = this.getRefreshToken();
    this.http.post(`${this.api}/logout`, { refreshToken }).subscribe();
    this.clearSession();
  }

  forgotPassword(email: string) {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.api}/forgot-password`, { email }
    );
  }

  verifyOtp(email: string, otp: string) {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.api}/verify-otp`, { email, otp }
    );
  }

  resetPassword(email: string, otp: string, newPassword: string) {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.api}/reset-password`, { email, otp, newPassword }
    );
  }

  resendVerification(email: string) {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.api}/resend-verification`, { email }
    );
  }

  uploadAvatar(userId: string, file: File) {
    const form = new FormData();
    form.append('avatar', file);
    form.append('userId', userId);
    return this.http.post<{ success: boolean; avatar: string }>(
      `${environment.apiUrl}/upload/avatar`, form
    ).pipe(tap(res => {
      if (res.success) this.saveSession({ ...this.currentUser()!, avatar: res.avatar });
    }));
  }

  updateProfile(userId: string, data: { name?: string; bio?: string; goalCategory?: string }) {
    return this.http.put<{ success: boolean; data: AppUser }>(
      `${environment.apiUrl}/app-users/${userId}`, data
    ).pipe(tap(res => { if (res.success) this.saveSession(res.data); }));
  }

  isLoggedIn(): boolean { return !!this.currentUser(); }

  hasRefreshToken(): boolean { return !!this.getRefreshToken(); }

  clearSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  private loadUser(): AppUser | null {
    try {
      const u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  }
}
