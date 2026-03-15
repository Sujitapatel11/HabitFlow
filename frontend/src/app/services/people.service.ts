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

  sendRequest(senderId: string, receiverId: string) {
    return this.http.post<any>(`${this.connApi}/request`, { senderId, receiverId });
  }

  getPending(userId: string) {
    return this.http.get<any>(`${this.connApi}/pending?userId=${userId}`);
  }

  acceptRequest(connectionId: string) {
    return this.http.post<any>(`${this.connApi}/accept`, { connectionId });
  }

  rejectRequest(connectionId: string) {
    return this.http.post<any>(`${this.connApi}/reject`, { connectionId });
  }

  getMyConnections(userId: string) {
    return this.http.get<any>(`${this.connApi}/my-connections?userId=${userId}`);
  }

  getConnectionStatus(senderId: string, receiverId: string) {
    return this.http.get<any>(`${this.connApi}/status?senderId=${senderId}&receiverId=${receiverId}`);
  }
}
