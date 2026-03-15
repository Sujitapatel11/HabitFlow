import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar],
  template: `
    <app-navbar />
    <main class="app-main"><router-outlet /></main>
  `,
  styles: [`.app-main { min-height: calc(100vh - 64px); background: #f7f8fc; }`],
})
export class App {}
