import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AppUser } from '../models/app-user.model';
import { AuthService } from '../core/auth.service';

@Injectable({ providedIn: 'root' })
export class PeopleService {
  private readonly usersApi = `${environment.apiUrl}/app-users`;
  private readonly connApi = `${environment.apiUrl}/connections`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  /** Current logged-in user from AuthService */
  currentProfile() {
    return this.auth.currentUser();
  }

  getAllUsers(excludeId?: string) {
    const params = excludeId ? `?exclude=${excludeId}` : '';
    return this.http.get<{ success: boolean; data: AppUser[] }>(`${this.usersApi}${params}`);
  }

  getSimilarUsers(goalCategory: string, excludeId: string) {
    return this.http.get<{ success: boolean; data: AppUser[] }>(
      `${this.usersApi}/similar?goalCategory=${goalCategory}&exclude=${excludeId}`
    );
  }

  /** senderId is taken from JWT on the backend — only receiverId needed */
  sendRequest(receiverId: string) {
    return this.http.post<any>(`${this.connApi}/request`, { receiverId });
  }

  /** userId is taken from JWT on the backend */
  getPending() {
    return this.http.get<any>(`${this.connApi}/pending`);
  }

  acceptRequest(connectionId: string) {
    return this.http.post<any>(`${this.connApi}/accept`, { connectionId });
  }

  rejectRequest(connectionId: string) {
    return this.http.post<any>(`${this.connApi}/reject`, { connectionId });
  }

  /** userId is taken from JWT on the backend */
  getMyConnections() {
    return this.http.get<any>(`${this.connApi}/my-connections`);
  }

  /** senderId is taken from JWT on the backend — only receiverId needed */
  getConnectionStatus(receiverId: string) {
    return this.http.get<any>(`${this.connApi}/status?receiverId=${receiverId}`);
  }
}
