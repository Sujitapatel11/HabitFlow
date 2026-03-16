import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ReflectionData } from '../models/reflection.model';

@Injectable({ providedIn: 'root' })
export class ReflectionService {
  private api = `${environment.apiUrl}/reflection`;

  constructor(private http: HttpClient) {}

  getReflection(userId: string, userName: string) {
    return this.http.get<{ success: boolean; data: ReflectionData }>(
      `${this.api}?userId=${userId}&userName=${encodeURIComponent(userName)}`
    );
  }
}
