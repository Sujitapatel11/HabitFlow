/**
 * OptimisticService
 * Generic helper for optimistic UI updates with automatic rollback on failure.
 *
 * Usage:
 *   const snap = this.optimistic.apply(signal, newValue);
 *   apiCall().subscribe({ error: () => this.optimistic.rollback(signal, snap) });
 */
import { Injectable } from '@angular/core';
import { WritableSignal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OptimisticService {
  /** Apply an optimistic value and return the previous snapshot for rollback. */
  apply<T>(sig: WritableSignal<T>, next: T): T {
    const snap = sig();
    sig.set(next);
    return snap;
  }

  /** Roll back to the snapshot captured before the optimistic update. */
  rollback<T>(sig: WritableSignal<T>, snap: T): void {
    sig.set(snap);
  }

  /**
   * Optimistically update an item inside an array signal by id.
   * Returns a rollback function.
   */
  updateItem<T extends { _id: string }>(
    sig: WritableSignal<T[]>,
    id: string,
    patch: Partial<T>
  ): () => void {
    const snap = sig();
    sig.update(list =>
      list.map(item => item._id === id ? { ...item, ...patch } : item)
    );
    return () => sig.set(snap);
  }

  /**
   * Optimistically prepend an item to an array signal.
   * Returns a rollback function.
   */
  prepend<T extends { _id: string }>(
    sig: WritableSignal<T[]>,
    item: T
  ): () => void {
    const snap = sig();
    sig.update(list => [item, ...list]);
    return () => sig.set(snap);
  }

  /**
   * Optimistically remove an item from an array signal.
   * Returns a rollback function.
   */
  remove<T extends { _id: string }>(
    sig: WritableSignal<T[]>,
    id: string
  ): () => void {
    const snap = sig();
    sig.update(list => list.filter(i => i._id !== id));
    return () => sig.set(snap);
  }
}
