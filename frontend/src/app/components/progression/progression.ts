import { Component, Input, OnChanges, SimpleChanges, inject, effect } from '@angular/core';
import { GamificationService, LEVELS } from '../../services/gamification.service';

@Component({
  selector: 'app-progression',
  standalone: true,
  template: `
    <!-- ── XP Energy Bar ─────────────────────────────────────────────── -->
    <div class="prog-bar-wrap" [style.--rank-color]="gameSvc.rankColor()">
      <div class="prog-rank">
        <span class="rank-icon">{{ gameSvc.stats().levelIcon }}</span>
        <div class="rank-info">
          <span class="rank-name">{{ gameSvc.stats().levelName }}</span>
          <span class="rank-xp">{{ gameSvc.stats().xp }} <em>CE</em></span>
        </div>
      </div>

      <div class="prog-track-wrap">
        <div class="prog-track">
          <div class="prog-fill" [style.width.%]="gameSvc.levelProgress()">
            <div class="prog-particles"></div>
          </div>
        </div>
        <div class="prog-labels">
          <span>{{ gameSvc.stats().xpCurrent }} CE</span>
          <span>{{ gameSvc.stats().xpForNext }} CE</span>
        </div>
      </div>

      <!-- Reactor streak ring -->
      @if (streak > 0) {
        <div class="reactor-wrap" [class.reactor-hot]="streak >= 7" [class.reactor-max]="streak >= 30">
          <svg class="reactor-svg" viewBox="0 0 44 44">
            <circle class="reactor-track" cx="22" cy="22" r="18"/>
            <circle class="reactor-fill" cx="22" cy="22" r="18"
              [style.stroke-dashoffset]="reactorOffset()"
              [style.stroke]="reactorColor()"/>
          </svg>
          <span class="reactor-label">{{ streak }}</span>
          <div class="reactor-glow"></div>
        </div>
      }
    </div>

    <!-- ── XP Energy Particle Popup ──────────────────────────────────── -->
    @if (gameSvc.xpPopup().show) {
      <div class="xp-energy-popup">
        <div class="xp-particles-wrap">
          <span class="xp-orb"></span>
          <span class="xp-orb xp-orb-2"></span>
          <span class="xp-orb xp-orb-3"></span>
        </div>
        +{{ gameSvc.xpPopup().amount }} <em>CE</em>
      </div>
    }

    <!-- ── Level-Up Explosion ─────────────────────────────────────────── -->
    @if (gameSvc.levelUp()) {
      <div class="levelup-overlay">
        <div class="levelup-ring"></div>
        <div class="levelup-ring levelup-ring-2"></div>
        <div class="levelup-card" [style.--rank-color]="gameSvc.levelUp()!.rankColor">
          <div class="levelup-icon">{{ gameSvc.levelUp()!.levelIcon }}</div>
          <div class="levelup-label">RANK UP</div>
          <div class="levelup-name">{{ gameSvc.levelUp()!.levelName }}</div>
          <div class="levelup-sub">Core energy expanding...</div>
        </div>
      </div>
    }

    <!-- ── Badge Hologram ─────────────────────────────────────────────── -->
    @if (gameSvc.newBadge()) {
      <div class="hologram-wrap">
        <div class="hologram-scan"></div>
        <div class="hologram-badge">
          <span class="holo-icon">{{ gameSvc.newBadge()!.icon }}</span>
          <div class="holo-text">
            <span class="holo-label">COMMENDATION UNLOCKED</span>
            <span class="holo-name">{{ gameSvc.newBadge()!.name }}</span>
            <span class="holo-desc">{{ gameSvc.newBadge()!.description }}</span>
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './progression.css',
})
export class ProgressionComponent {
  @Input() streak = 0;

  gameSvc = inject(GamificationService);

  // Reactor ring: circumference = 2π×18 ≈ 113.1
  private readonly CIRC = 113.1;

  reactorOffset(): number {
    const cap = 30; // full ring at 30-day streak
    const pct = Math.min(this.streak / cap, 1);
    return this.CIRC * (1 - pct);
  }

  reactorColor(): string {
    if (this.streak >= 30) return '#FF3B5C';
    if (this.streak >= 7)  return '#FFB800';
    return '#00FF88';
  }
}
