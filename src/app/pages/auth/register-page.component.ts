import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FakeAuthService } from '../../services/fake-auth.service';

@Component({
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="auth">
      <div class="card">
        <h2>Register</h2>
        <p class="muted">A new account. A new chance to ignore tasks.</p>

        <div class="field">
          <label>Email</label>
          <input [(ngModel)]="email" type="email" placeholder="you@domain.com" />
        </div>

        <div class="field">
          <label>Password</label>
          <input [(ngModel)]="password" type="password" placeholder="••••••••" />
        </div>

        <div class="actions">
          <button (click)="register()" [disabled]="!email || !password">Create account</button>
          <a routerLink="/login" class="link">Back to login</a>
        </div>

        <div class="divider"></div>

        <div class="social">
          <button (click)="social('google')">Continue with Google</button>
          <button (click)="social('facebook')">Continue with Facebook</button>
          <button (click)="social('apple')">Continue with Apple</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .auth {
        display: grid;
        place-items: center;
        min-height: calc(100vh - 120px);
      }
      .card {
        width: min(460px, 100%);
        padding: 18px;
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.04);
      }
      h2 {
        margin: 0 0 6px;
      }
      .muted {
        opacity: 0.75;
        margin: 0 0 14px;
      }
      .field {
        display: grid;
        gap: 6px;
        margin-bottom: 12px;
      }
      label {
        font-size: 12px;
        opacity: 0.78;
      }
      .actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
      }
      .link {
        text-decoration: none;
        opacity: 0.9;
      }
      .divider {
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
        margin: 14px 0;
      }
      .social {
        display: grid;
        gap: 10px;
      }
    `,
  ],
})
export class RegisterPageComponent {
  email = '';
  password = '';

  constructor(
    private auth: FakeAuthService,
    private router: Router,
  ) {}

  register(): void {
    this.auth.register(this.email, this.password);
    this.router.navigateByUrl('/');
  }

  social(provider: 'google' | 'facebook' | 'apple'): void {
    this.auth.loginWithProvider(provider);
    this.router.navigateByUrl('/');
  }
}
