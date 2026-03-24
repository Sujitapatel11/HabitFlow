/**
 * ShakeDirective — appShake
 * Triggers a shake + red-glow animation on the host element.
 * Usage: <div appShake [shakeOn]="errorSignal()">
 * Whenever shakeOn changes to a truthy value, the animation fires.
 */
import { Directive, ElementRef, Input, OnChanges } from '@angular/core';

@Directive({
  selector: '[appShake]',
  standalone: true,
})
export class ShakeDirective implements OnChanges {
  @Input() shakeOn: unknown;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnChanges() {
    if (!this.shakeOn) return;
    const el = this.el.nativeElement;
    el.classList.remove('shake');
    // Force reflow so re-adding the class restarts the animation
    void el.offsetWidth;
    el.classList.add('shake');
    el.style.setProperty('box-shadow', 'var(--glow-red)');
    el.style.setProperty('border-color', 'var(--red)');
    setTimeout(() => {
      el.classList.remove('shake');
      el.style.removeProperty('box-shadow');
      el.style.removeProperty('border-color');
    }, 600);
  }
}
