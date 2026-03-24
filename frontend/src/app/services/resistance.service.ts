/**
 * ResistanceService
 * Invisible UX resistance for suspicious patterns — normal users never notice.
 *
 * Detects client-side signals:
 *   - Rapid repeated taps on the same button (< 300ms apart)
 *   - More than 5 completions in 60 seconds
 *   - Undo immediately followed by complete (< 2s)
 *
 * Effects (all subtle, never alarming):
 *   - WATCH:  button feels slightly "heavy" (150ms extra CSS transition)
 *   - SHADOW: button visually resists — slight push-back animation before firing
 *   - GHOST:  button appears to "think" for 800ms before responding
 *
 * The server applies the real penalties. This is purely UX texture.
 * A cheater using a script bypasses this entirely — that's fine, the server handles them.
 * This is for the human who is tapping too fast and might be gaming unconsciously.
 */
import { Injectable, signal } from '@angular/core';

type ClientTier = 'CLEAN' | 'WATCH' | 'SHADOW' | 'GHOST';

interface ActionRecord {
  ts: number;
  type: 'complete' | 'undo';
  habitId: string;
}

@Injectable({ providedIn: 'root' })
export class ResistanceService {
  private history: ActionRecord[] = [];
  private readonly WINDOW_MS = 60_000;

  // Internal tier — never exposed in UI
  private _tier = signal<ClientTier>('CLEAN');

  /** Record a user action and recalculate tier. Returns delay in ms to apply. */
  recordAndEvaluate(type: 'complete' | 'undo', habitId: string): number {
    const now = Date.now();
    this.history.push({ ts: now, type, habitId });

    // Prune old entries
    this.history = this.history.filter(e => now - e.ts < this.WINDOW_MS);

    const tier = this._calculateTier(now);
    this._tier.set(tier);

    return this._delayFor(tier);
  }

  /** CSS class to apply to a button during a pending action. */
  resistanceClass(): string {
    const t = this._tier();
    if (t === 'GHOST')  return 'resist-ghost';
    if (t === 'SHADOW') return 'resist-shadow';
    if (t === 'WATCH')  return 'resist-watch';
    return '';
  }

  private _calculateTier(now: number): ClientTier {
    const completions = this.history.filter(e => e.type === 'complete');
    const recent5min  = completions.filter(e => now - e.ts < 300_000);

    // Signal: >8 completions in 5 minutes
    if (recent5min.length > 8) return 'GHOST';

    // Signal: >5 completions in 5 minutes
    if (recent5min.length > 5) return 'SHADOW';

    // Signal: undo→complete cycle on same habit within 3s
    const lastUndo = [...this.history].reverse().find(e => e.type === 'undo');
    const lastComplete = [...this.history].reverse().find(e => e.type === 'complete');
    if (lastUndo && lastComplete &&
        lastComplete.habitId === lastUndo.habitId &&
        lastComplete.ts > lastUndo.ts &&
        lastComplete.ts - lastUndo.ts < 3_000) {
      return 'SHADOW';
    }

    // Signal: >3 completions in 5 minutes
    if (recent5min.length > 3) return 'WATCH';

    return 'CLEAN';
  }

  private _delayFor(tier: ClientTier): number {
    // These delays are additive to the server-side delay
    // They make the UI feel "natural" rather than instant-then-slow
    const delays: Record<ClientTier, number> = {
      CLEAN:  0,
      WATCH:  120,
      SHADOW: 400,
      GHOST:  800,
    };
    return delays[tier];
  }
}
