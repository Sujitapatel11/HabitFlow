import { Injectable } from '@angular/core';

/**
 * AI Message Service
 * Generates contextual motivational messages based on habit completion data.
 * Uses a rule-based engine with randomized responses for variety.
 */
@Injectable({ providedIn: 'root' })
export class AiMessageService {

  private messages = {
    perfect: [
      "🏆 Perfect day! You've completed every habit. You're unstoppable!",
      "🌟 100% done! Your consistency is building something great.",
      "🔥 All habits crushed! This is what champions look like.",
    ],
    high: [
      "💪 Almost there! Just a few habits left — you've got this.",
      "🚀 Great momentum today! Keep pushing to finish strong.",
      "✨ You're on fire! Don't stop now, the finish line is close.",
    ],
    mid: [
      "😊 Good start! Halfway through — the second half is where winners are made.",
      "🌱 You're building momentum. Every habit completed counts.",
      "⚡ Keep going! Consistency beats perfection every time.",
    ],
    low: [
      "🌅 A fresh start is all you need. Pick one habit and begin.",
      "💡 Small steps lead to big changes. Start with your easiest habit.",
      "🤝 Hey, today isn't over yet. You still have time to make it count.",
    ],
    empty: [
      "👋 Welcome! Add your first habit and start your journey today.",
      "🌟 Every great routine starts with a single habit. Add yours now!",
      "🚀 Ready to build better habits? Let's get started!",
    ],
  };

  private pendingReminders = [
    "⏰ Don't forget: {habit} is waiting for you!",
    "🔔 Reminder: Time to work on '{habit}'.",
    "💬 Hey! '{habit}' isn't going to complete itself 😄",
    "🌟 Quick reminder: '{habit}' is still pending today.",
  ];

  /** Returns a motivational message based on completion rate */
  getMotivationalMessage(total: number, completed: number): string {
    if (total === 0) return this.random(this.messages.empty);

    const rate = completed / total;
    if (rate === 1) return this.random(this.messages.perfect);
    if (rate >= 0.6) return this.random(this.messages.high);
    if (rate >= 0.3) return this.random(this.messages.mid);
    return this.random(this.messages.low);
  }

  /** Returns a reminder message for a specific habit */
  getReminderMessage(habitName: string): string {
    const template = this.random(this.pendingReminders);
    return template.replace('{habit}', habitName);
  }

  private random<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}
