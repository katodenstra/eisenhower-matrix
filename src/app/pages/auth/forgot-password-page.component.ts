import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FakeAuthService } from '../../services/fake-auth.service';

@Component({
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="auth">
      <div class="card">
        <h2>Reset password</h2>
        <p class="muted">We’ll “send” you a reset link. (We won’t. Not yet.)</p>

        <div class="field">
          <label>Email</label>
          <input [(ngModel)]="email" type="email" placeholder="you@domain.com" />
        </div>

        <div class="actions">
          <button (click)="reset()" [disabled]="!email">Send reset</button>
          <a routerLink="/login" class="link">Back</a>
        </div>

        @if (sent) {
          <div class="notice">Reset requested. Check your email in the imaginary inbox.</div>
        }
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
      .notice {
        margin-top: 12px;
        padding: 10px 12px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
    `,
  ],
})
export class ForgotPasswordPageComponent {
  email = '';
  sent = false;

  constructor(private auth: FakeAuthService) {}

  reset(): void {
    this.auth.forgotPassword(this.email);
    this.sent = true;
  }
}
