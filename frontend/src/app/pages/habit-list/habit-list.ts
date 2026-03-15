import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HabitService } from '../../services/habit.service';
import { ReminderService } from '../../services/reminder.service';
import { NotificationService } from '../../services/notification.service';
import { Habit } from '../../models/habit.model';

@Component({
  selector: 'app-habit-list',
  imports: [RouterLink, FormsModule],
  templateUrl: './habit-list.html',
  styleUrl: './habit-list.css',
})
export class HabitList implements OnInit {
  habits = signal<Habit[]>([]);
  loading = signal(true);
  error = signal('');

  // WhatsApp reminder state
  phone = signal('');
  sendingReminder = signal(false);
  reminderMsg = signal('');
  reminderError = signal('');
  showReminderPanel = signal(false);

  constructor(
    private habitService: HabitService,
    private reminderService: ReminderService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadHabits();
  }

  loadHabits(): void {
    this.loading.set(true);
    this.habitService.getHabits().subscribe({
      next: (res) => {
        this.habits.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load habits.');
        this.loading.set(false);
      },
    });
  }

  toggleComplete(habit: Habit): void {
    this.habitService
      .updateHabit(habit._id, { completed: !habit.completed })
      .subscribe({
        next: (res) => {
          this.habits.update((list) =>
            list.map((h) => (h._id === habit._id ? res.data : h))
          );
        },
      });
  }

  deleteHabit(id: string): void {
    if (!confirm('Delete this habit?')) return;
    this.habitService.deleteHabit(id).subscribe({
      next: () => this.habits.update((list) => list.filter((h) => h._id !== id)),
    });
  }

  /** Send WhatsApp reminder for all pending habits */
  sendWhatsAppReminder(): void {
    if (!this.phone().trim()) {
      this.reminderError.set('Please enter your WhatsApp number.');
      return;
    }

    this.sendingReminder.set(true);
    this.reminderMsg.set('');
    this.reminderError.set('');

    this.reminderService.sendAllReminders(this.phone()).subscribe({
      next: (res) => {
        this.reminderMsg.set(res.message);
        this.sendingReminder.set(false);
        this.notificationService.addNotification(
          `✅ WhatsApp reminder sent to ${this.phone()}`,
          'success'
        );
      },
      error: (err) => {
        this.reminderError.set(err.error?.message || 'Failed to send reminder.');
        this.sendingReminder.set(false);
      },
    });
  }

  /** Send reminder for a single habit */
  sendSingleReminder(habit: Habit): void {
    const phone = prompt('Enter your WhatsApp number (e.g. +919876543210):');
    if (!phone) return;

    this.reminderService.sendSingleReminder(phone, habit._id).subscribe({
      next: (res) => {
        this.notificationService.addNotification(
          `📱 Reminder sent for "${habit.name}"`,
          'success'
        );
        alert(res.message);
      },
      error: (err) => alert(err.error?.message || 'Failed to send reminder.'),
    });
  }

  getCategoryColor(category: string): string {
    const map: Record<string, string> = {
      Health: '#22c55e',
      Fitness: '#f59e0b',
      Learning: '#6c63ff',
      Mindfulness: '#48cae4',
      Productivity: '#ec4899',
      Other: '#94a3b8',
    };
    return map[category] || '#94a3b8';
  }
}
