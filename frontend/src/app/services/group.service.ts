import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiResponse } from '../models/habit.model';
import { Group } from '../models/group.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GroupService {
  private readonly api = `${environment.apiUrl}/groups`;
  constructor(private http: HttpClient) {}

  getGroups() { return this.http.get<ApiResponse<Group[]>>(this.api); }
  createGroup(data: Partial<Group>) { return this.http.post<ApiResponse<Group>>(this.api, data); }
  joinGroup(id: string) { return this.http.post<any>(`${this.api}/${id}/join`, {}); }
  leaveGroup(id: string) { return this.http.post<any>(`${this.api}/${id}/leave`, {}); }
}
