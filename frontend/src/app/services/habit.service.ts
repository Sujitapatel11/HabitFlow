import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiResponse, Habit } from '../models/habit.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HabitService {
  private readonly api = `${environment.apiUrl}/habits`;
  constructor(private http: HttpClient) {}

  // userId no longer needed — backend reads it from JWT
  getHabits() {
    return this.http.get<ApiResponse<Habit[]>>(this.api);
  }

  createHabit(data: { name: string; description?: string; category?: string; frequency?: string }) {
    return this.http.post<ApiResponse<Habit>>(this.api, data);
  }

  // Server-authoritative completion — returns xpGained + newStreak
  completeHabit(id: string) {
    return this.http.post<ApiResponse<Habit> & { xpGained: number; newStreak: number }>(
      `${this.api}/${id}/complete`, {}
    );
  }

  undoHabit(id: string) {
    return this.http.post<ApiResponse<Habit>>(`${this.api}/${id}/undo`, {});
  }

  updateHabit(id: string, data: { name?: string; description?: string; category?: string }) {
    return this.http.put<ApiResponse<Habit>>(`${this.api}/${id}`, data);
  }

  deleteHabit(id: string) {
    return this.http.delete<ApiResponse<null>>(`${this.api}/${id}`);
  }
}
