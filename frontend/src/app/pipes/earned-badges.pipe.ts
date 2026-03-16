import { Pipe, PipeTransform } from '@angular/core';
import { Badge } from '../services/gamification.service';

@Pipe({ name: 'earnedBadges', standalone: true })
export class EarnedBadgesPipe implements PipeTransform {
  transform(badges: Badge[]): Badge[] {
    return badges.filter(b => b.earned);
  }
}
