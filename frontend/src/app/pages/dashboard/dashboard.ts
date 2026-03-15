import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HabitService } from '../../services/habit.service';
import { AiMessageService } from '../../services/ai-message.service';
import { NotificationService } from '../../services/notification.service';
import { PeopleService } from '../../services/people.service';
import { Habit } from '../../models/habit.model';
import { AppUser, Connection } from '../../models/app-user.model';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  habits = signal<Habit[]>([]);
  loading = signal(true);
  error = signal('');
  aiMessage = signal('');

  similarUsers = signal<AppUser[]>([]);
  myConnections = signal<Connection[]>([]);

  total = computed(() => this.habits().length);
  completed = computed(() => this.habits().filter(h => h.completed).length);
  pending = computed(() => this.habits().filter(h => !h.completed).length);
  rate = computed(() => this.total() > 0 ? Math.round((this.completed() / this.total()) * 100) : 0);
  topStreak = computed(() => this.habits().length ? Math.max(...this.habits().map(h => h.streak)) : 0);
  recent = computed(() => this.habits().slice(0, 5));

  constructor(
    private habitService: HabitService,
    private aiSvc: AiMessageService,
    private notifSvc: NotificationService,
    public peopleSvc: PeopleService,
  ) {}

  ngOnInit() {
    this.habitService.getHabits().subscribe({
      next: (res) => {
        this.habits.set(res.data);
        this.loading.set(false);
        this.aiMessage.set(this.aiSvc.getMotivationalMessage(res.data.length, res.data.filter(h => h.completed).length));
        res.data.filter(h => !h.completed).slice(0, 2).forEach((h, i) => {
          setTimeout(() => this.notifSvc.addNotification(this.aiSvc.getReminderMessage(h.name), 'reminder'), (i + 1) * 3000);
        });
      },
      error: () => { this.error.set('Failed to load. Is the backend running on port 3001?'); this.loading.set(false); },
    });

    const me = this.peopleSvc.currentProfile();
    if (me) {
      this.peopleSvc.getSimilarUsers(me.goalCategory, me._id).subscribe({
        next: (res) => this.similarUsers.set(res.data.slice(0, 4)),
        error: () => {},
      });
      this.peopleSvc.getMyConnections(me._id).subscribe({
        next: (res) => this.myConnections.set(res.data.slice(0, 4)),
        error: () => {},
      });
    }
  }

  getCategoryColor(cat: string): string {
    const m: Record<string, string> = {
      Coding: '#6c63ff', Fitness: '#f59e0b', Reading: '#22c55e',
      Studying: '#48cae4', Mindfulness: '#ec4899', Nutrition: '#10b981', Other: '#94a3b8',
    };
    return m[cat] || '#94a3b8';
  }
}
