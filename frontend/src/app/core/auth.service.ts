import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { AppUser } from '../models/app-user.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = `${environment.apiUrl}/auth`;
  currentUser = signal<AppUser | null>(this.loadUser());

  constructor(private http: HttpClient, private router: Router) {}

  register(data: { name: string; email: string; password: string; goalCategory: string; bio?: string }) {
    return this.http.post<{ success: boolean; data: AppUser }>(`${this.api}/register`, data).pipe(
      tap((res) => this.saveSession(res.data))
    );
  }

  login(email: string, password: string) {
    return this.http.post<{ success: boolean; data: AppUser }>(`${this.api}/login`, { email, password }).pipe(
      tap((res) => this.saveSession(res.data))
    );
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

  logout() {
    localStorage.removeItem('hf_user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!this.currentUser();
  }

  private saveSession(user: AppUser) {
    localStorage.setItem('hf_user', JSON.stringify(user));
    this.currentUser.set(user);
  }

  private loadUser(): AppUser | null {
    const u = localStorage.getItem('hf_user');
    return u ? JSON.parse(u) : null;
  }
}
