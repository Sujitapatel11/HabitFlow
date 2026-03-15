import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  menuOpen = signal(false);
  showNotifs = signal(false);

  constructor(public notifService: NotificationService, public auth: AuthService) {}

  toggleNotifs() {
    this.showNotifs.update(v => !v);
    if (this.showNotifs()) this.notifService.markAllRead();
  }

  formatTime(date: Date): string {
    return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(new Date(date));
  }

  getTypeIcon(type: string): string {
    return ({ reminder: '⏰', success: '✅', info: '💡' } as any)[type] || '🔔';
  }
}
