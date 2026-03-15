import { Component, OnInit, signal } from '@angular/core';
import { UserService, LeaderboardEntry } from '../../services/user.service';

@Component({
  selector: 'app-leaderboard',
  imports: [],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.css',
})
export class Leaderboard implements OnInit {
  entries = signal<LeaderboardEntry[]>([]);
  loading = signal(true);

  constructor(private userService: UserService) {}

  ngOnInit() {
    this.userService.getLeaderboard().subscribe({
      next: (res) => { this.entries.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  getMedal(i: number): string {
    return ['🥇','🥈','🥉'][i] || `#${i + 1}`;
  }
}
