import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContractService } from '../../services/contract.service';
import { HabitService } from '../../services/habit.service';
import { AuthService } from '../../core/auth.service';
import { OptimisticService } from '../../services/optimistic.service';
import { ShakeDirective } from '../../directives/shake.directive';
import { Contract } from '../../models/contract.model';
import { Habit } from '../../models/habit.model';

@Component({
  selector: 'app-contracts',
  imports: [FormsModule, ShakeDirective],
  templateUrl: './contracts.html',
  styleUrl: './contracts.css',
})
export class Contracts implements OnInit {
  tab = signal<'mine' | 'community'>('mine');
  myContracts = signal<Contract[]>([]);
  communityContracts = signal<Contract[]>([]);
  myHabits = signal<Habit[]>([]);
  loading = signal(true);
  showForm = signal(false);
  submitting = signal(false);
  error = signal('');
  checkInNote = signal<Record<string, string>>({});
  checkingIn = signal<string | null>(null);
  votingId   = signal<string | null>(null);
  failedId   = signal<string | null>(null);

  skeletonCount = Array(3);
  form = { habitId: '', durationDays: 30, stakePoints: 100 };

  constructor(
    private contractSvc: ContractService,
    private habitSvc: HabitService,
    private auth: AuthService,
    private optimistic: OptimisticService,
  ) {}

  ngOnInit() {
    this.habitSvc.getHabits().subscribe({
      next: (res) => this.myHabits.set(res.data),
    });
    this.loadContracts();
  }

  loadContracts() {
    const user = this.auth.currentUser()!;
    this.loading.set(true);
    this.contractSvc.getMyContracts(user._id).subscribe({
      next: (res) => { this.myContracts.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.contractSvc.getCommunityFeed(user._id).subscribe({
      next: (res) => this.communityContracts.set(res.data),
    });
  }

  createContract() {
    const user = this.auth.currentUser()!;
    const habit = this.myHabits().find(h => h._id === this.form.habitId);
    if (!habit) { this.error.set('Select a habit'); return; }
    this.submitting.set(true);
    this.contractSvc.createContract({
      habitId: habit._id, habitName: habit.name, category: habit.category,
      durationDays: this.form.durationDays, stakePoints: this.form.stakePoints,
    }).subscribe({
      next: (res) => {
        this.myContracts.update(list => [res.data, ...list]);
        this.showForm.set(false);
        this.submitting.set(false);
        this.form = { habitId: '', durationDays: 30, stakePoints: 100 };
      },
      error: (err) => { this.error.set(err.error?.message || 'Failed'); this.submitting.set(false); },
    });
  }

  doCheckIn(contract: Contract) {
    const note = this.checkInNote()[contract._id] || '';
    this.checkingIn.set(contract._id);

    // Optimistic: increment completedDays immediately
    const rollback = this.optimistic.updateItem(this.myContracts, contract._id, {
      completedDays: contract.completedDays + 1,
    });

    this.contractSvc.checkIn(contract._id, note).subscribe({
      next: (res) => {
        this.myContracts.update(list => list.map(c => c._id === contract._id ? res.data : c));
        this.updateNote(contract._id, '');
        this.checkingIn.set(null);
      },
      error: (err) => {
        rollback();
        this.checkingIn.set(null);
        this.failedId.set(contract._id);
        this.error.set(err.error?.message || 'Check-in failed');
        setTimeout(() => this.failedId.set(null), 800);
      },
    });
  }

  updateNote(contractId: string, value: string) {
    const updated: Record<string, string> = { ...this.checkInNote() };
    updated[contractId] = value;
    this.checkInNote.set(updated);
  }

  vote(contract: Contract, vote: 'legit' | 'doubt') {
    this.votingId.set(contract._id + vote);
    const user = this.auth.currentUser()!;
    this.contractSvc.witnessVote(contract._id, user._id, user.name, vote).subscribe({
      next: (res) => {
        this.communityContracts.update(list => list.map(c => c._id === contract._id ? res.data : c));
        this.votingId.set(null);
      },
      error: (err) => {
        this.votingId.set(null);
        this.error.set(err.error?.message || 'Vote failed');
      },
    });
  }

  breakContract(contract: Contract) {
    if (!confirm(`Break your contract for "${contract.habitName}"? You'll lose ${contract.stakePoints} reputation points.`)) return;
    this.contractSvc.breakContract(contract._id).subscribe({
      next: (res) => this.myContracts.update(list => list.map(c => c._id === contract._id ? res.data : c)),
    });
  }

  hasCheckedInToday(contract: Contract): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return contract.checkIns.some(c => {
      const d = new Date(c.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
  }

  hasVoted(contract: Contract): boolean {
    return contract.witnesses.some(w => w.userId === this.auth.currentUser()?._id);
  }

  progressPct(c: Contract): number {
    return Math.min(Math.round((c.completedDays / c.durationDays) * 100), 100);
  }

  daysLeft(c: Contract): number {
    return Math.max(0, Math.ceil((new Date(c.endDate).getTime() - Date.now()) / 86400000));
  }

  latestCheckIn(c: Contract) {
    return c.checkIns.length ? c.checkIns[c.checkIns.length - 1] : null;
  }

  catColor(cat: string): string {
    const m: Record<string, string> = {
      Coding: '#6c63ff', Fitness: '#f59e0b', Reading: '#22c55e',
      Studying: '#48cae4', Mindfulness: '#ec4899', Nutrition: '#10b981', Other: '#94a3b8',
    };
    return m[cat] || '#94a3b8';
  }
}
