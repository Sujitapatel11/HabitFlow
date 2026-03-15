import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.Login) },
  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard) },
  { path: 'habits', canActivate: [authGuard], loadComponent: () => import('./pages/habits/habits').then(m => m.Habits) },
  { path: 'community', canActivate: [authGuard], loadComponent: () => import('./pages/community/community').then(m => m.Community) },
  { path: 'groups', canActivate: [authGuard], loadComponent: () => import('./pages/groups/groups').then(m => m.Groups) },
  { path: 'leaderboard', canActivate: [authGuard], loadComponent: () => import('./pages/leaderboard/leaderboard').then(m => m.Leaderboard) },
  { path: 'find-users', canActivate: [authGuard], loadComponent: () => import('./pages/find-users/find-users').then(m => m.FindUsers) },
  { path: '**', redirectTo: 'dashboard' },
];
