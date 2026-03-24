import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../core/auth.service';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit {
  menuOpen = signal(false);
  showNotifs = signal(false);

  constructor(
    public notifService: NotificationService,
    public auth: AuthService,
    public chatSvc: ChatService,
  ) {}

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.chatSvc.connect();
      this.chatSvc.loadThreads();
    }
  }

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
