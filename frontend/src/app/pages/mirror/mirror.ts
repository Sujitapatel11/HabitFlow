import { Component, OnInit, signal } from '@angular/core';
import { ReflectionService } from '../../services/reflection.service';
import { AuthService } from '../../core/auth.service';
import { ReflectionData } from '../../models/reflection.model';
import { PostService } from '../../services/post.service';

@Component({
  selector: 'app-mirror',
  imports: [],
  templateUrl: './mirror.html',
  styleUrl: './mirror.css',
})
export class Mirror implements OnInit {
  data = signal<ReflectionData | null>(null);
  loading = signal(true);
  error = signal('');
  sharing = signal(false);
  shared = signal(false);

  constructor(
    private reflectionSvc: ReflectionService,
    private auth: AuthService,
    private postSvc: PostService,
  ) {}

  ngOnInit() {
    const user = this.auth.currentUser();
    if (!user) return;
    this.reflectionSvc.getReflection(user._id, user.name).subscribe({
      next: (res) => { this.data.set(res.data); this.loading.set(false); },
      error: () => { this.error.set('Failed to load reflection'); this.loading.set(false); },
    });
  }

  scoreColor(score: number): string {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  }

  scoreGradient(score: number): string {
    if (score >= 80) return 'linear-gradient(135deg,#22c55e,#16a34a)';
    if (score >= 60) return 'linear-gradient(135deg,#f59e0b,#d97706)';
    if (score >= 40) return 'linear-gradient(135deg,#f97316,#ea580c)';
    return 'linear-gradient(135deg,#ef4444,#dc2626)';
  }

  catColor(name: string): string {
    const m: Record<string, string> = {
      Coding: '#6c63ff', Fitness: '#f59e0b', Reading: '#22c55e',
      Studying: '#48cae4', Mindfulness: '#ec4899', Nutrition: '#10b981', Other: '#94a3b8',
    };
    return m[name] || '#94a3b8';
  }

  shareToFeed() {
    const d = this.data();
    const user = this.auth.currentUser();
    if (!d || !user) return;

    this.sharing.set(true);
    const msg = `🧠 AI Reflection — Week ${d.weekNum}\n` +
      `Consistency Score: ${d.disciplineScore}/100 (${d.rank})\n` +
      `Strongest: ${d.strongestHabit?.name || d.strongestCategory?.name || '—'} | ` +
      `Risk: ${d.weakestHabit?.name || '—'}\n` +
      `Trend: ${d.trend} | Personality: ${d.personality.icon} ${d.personality.type}`;

    this.postSvc.createPost({
      authorName: user.name,
      habitName: 'AI Reflection',
      category: user.goalCategory || 'Other',
      message: msg,
      type: 'manual',
    } as any).subscribe({
      next: () => { this.sharing.set(false); this.shared.set(true); },
      error: () => { this.sharing.set(false); },
    });
  }

  circumference = 2 * Math.PI * 54; // r=54

  dashOffset(score: number): number {
    return this.circumference - (score / 100) * this.circumference;
  }
}
