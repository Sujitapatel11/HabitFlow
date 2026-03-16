import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiResponse, Habit } from '../models/habit.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HabitService {
  private readonly api = `${environment.apiUrl}/habits`;
  constructor(private http: HttpClient) {}

  getHabits(userId?: string) {
    const url = userId ? `${this.api}?userId=${userId}` : this.api;
    return this.http.get<ApiResponse<Habit[]>>(url);
  }
  createHabit(data: Partial<Habit>) { return this.http.post<ApiResponse<Habit>>(this.api, data); }
  updateHabit(id: string, data: Partial<Habit>) { return this.http.put<ApiResponse<Habit>>(`${this.api}/${id}`, data); }
  deleteHabit(id: string) { return this.http.delete<ApiResponse<null>>(`${this.api}/${id}`); }
}
