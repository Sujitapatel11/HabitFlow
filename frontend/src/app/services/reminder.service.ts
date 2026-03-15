import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ReminderService {
  private readonly apiUrl = 'http://localhost:3001/api/reminders';

  constructor(private http: HttpClient) {}

  /** Send WhatsApp reminder for all pending habits */
  sendAllReminders(phone: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/whatsapp`, { phone });
  }

  /** Send WhatsApp reminder for a single habit */
  sendSingleReminder(phone: string, habitId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/whatsapp/single`, { phone, habitId });
  }
}
