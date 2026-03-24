import { Component } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar],
  template: `
    @if (auth.isLoggedIn()) {
      <app-navbar />
    }
    <main [class.app-main]="auth.isLoggedIn()"><router-outlet /></main>
  `,
  styles: [`.app-main { min-height: calc(100vh - 64px); background: var(--bg, #0a0a1a); }`],
})
export class App {
  constructor(public auth: AuthService) {}
}
