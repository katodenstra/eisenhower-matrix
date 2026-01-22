import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { FakeAuthService } from './services/fake-auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, AsyncPipe],
  template: `
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <div class="logo">E</div>
          <div>
            <div class="title">Eisenhower Matrix</div>
            <div class="subtitle">Decide what matters. Then pretend you’ll do it.</div>
          </div>
        </div>

        <div class="actions">
          @if ((auth.user$ | async) === null) {
            <a routerLink="/login" class="link">Login</a>
            <a routerLink="/register" class="link">Register</a>
          } @else {
            <button (click)="auth.logout()">Logout</button>
          }
        </div>
      </header>

      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      .shell {
        min-height: 100%;
        display: flex;
        flex-direction: column;
      }
      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 18px;
        background: rgba(255, 255, 255, 0.04);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        position: sticky;
        top: 0;
        backdrop-filter: blur(12px);
        z-index: 5;
      }
      .brand {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .logo {
        width: 40px;
        height: 40px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        background: rgba(255, 255, 255, 0.1);
        font-weight: 800;
      }
      .title {
        font-weight: 700;
      }
      .subtitle {
        font-size: 12px;
        opacity: 0.75;
        margin-top: 2px;
      }
      .actions {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      .link {
        text-decoration: none;
        padding: 8px 10px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.06);
      }
      .content {
        padding: 18px;
        flex: 1;
      }
    `,
  ],
})
export class AppComponent {
  constructor(public auth: FakeAuthService) {}
}
