import { Component, OnInit, signal } from '@angular/core';
import { PeopleService } from '../../services/people.service';
import { AppUser, Connection, PendingRequest } from '../../models/app-user.model';

@Component({
  selector: 'app-find-users',
  imports: [],
  templateUrl: './find-users.html',
  styleUrl: './find-users.css',
})
export class FindUsers implements OnInit {
  similarUsers = signal<AppUser[]>([]);
  allUsers = signal<AppUser[]>([]);
  myConnections = signal<Connection[]>([]);
  pendingRequests = signal<PendingRequest[]>([]);
  connectionStatuses = signal<Record<string, string>>({});
  loading = signal(true);
  activeTab = signal<'similar' | 'all' | 'connections' | 'pending'>('similar');

  constructor(public peopleSvc: PeopleService) {}

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    const me = this.peopleSvc.currentProfile()!;
    this.loading.set(true);

    this.peopleSvc.getSimilarUsers(me.goalCategory, me._id).subscribe({
      next: (res) => {
        this.similarUsers.set(res.data);
        this.loadStatuses(res.data);
      },
    });

    this.peopleSvc.getAllUsers(me._id).subscribe({
      next: (res) => { this.allUsers.set(res.data); this.loading.set(false); },
    });

    this.peopleSvc.getMyConnections(me._id).subscribe({
      next: (res) => this.myConnections.set(res.data),
    });

    this.peopleSvc.getPending(me._id).subscribe({
      next: (res) => this.pendingRequests.set(res.data),
    });
  }

  loadStatuses(users: AppUser[]) {
    const me = this.peopleSvc.currentProfile()!;
    users.forEach(u => {
      this.peopleSvc.getConnectionStatus(me._id, u._id).subscribe({
        next: (res) => this.connectionStatuses.update(s => ({ ...s, [u._id]: res.status })),
      });
    });
  }

  connect(user: AppUser) {
    const me = this.peopleSvc.currentProfile()!;
    this.peopleSvc.sendRequest(me._id, user._id).subscribe({
      next: () => this.connectionStatuses.update(s => ({ ...s, [user._id]: 'pending' })),
      error: (err: any) => {
        if (err.error?.status) {
          this.connectionStatuses.update(s => ({ ...s, [user._id]: err.error.status }));
        }
      },
    });
  }

  accept(req: PendingRequest) {
    this.peopleSvc.acceptRequest(req._id).subscribe({
      next: () => {
        this.pendingRequests.update(list => list.filter(r => r._id !== req._id));
        this.loadAll();
      },
    });
  }

  reject(req: PendingRequest) {
    this.peopleSvc.rejectRequest(req._id).subscribe({
      next: () => this.pendingRequests.update(list => list.filter(r => r._id !== req._id)),
    });
  }

  getStatus(userId: string): string {
    return this.connectionStatuses()[userId] || 'none';
  }

  getJoinDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en', { month: 'short', year: 'numeric' });
  }

  getCategoryColor(cat: string): string {
    const m: Record<string, string> = {
      Coding: '#6c63ff', Fitness: '#f59e0b', Reading: '#22c55e',
      Studying: '#48cae4', Mindfulness: '#ec4899', Nutrition: '#10b981', Other: '#94a3b8',
    };
    return m[cat] || '#94a3b8';
  }
}
