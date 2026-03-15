import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiResponse } from '../models/habit.model';
import { environment } from '../../environments/environment';

export interface LeaderboardEntry {
  userId: string;
  name: string;
  maxStreak: number;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = `${environment.apiUrl}/users`;
  constructor(private http: HttpClient) {}

  getLeaderboard() {
    return this.http.get<ApiResponse<LeaderboardEntry[]>>(`${this.api}/leaderboard`);
  }
}

