import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AppUser {
  id: string;
  email: string;
  displayName?: string;
}

@Injectable({ providedIn: 'root' })
export class FakeAuthService {
  private readonly _user$ = new BehaviorSubject<AppUser | null>(null);
  readonly user$ = this._user$.asObservable();

  /** Pretend login. Replace with real auth later. */
  login(email: string, _password: string): void {
    this._user$.next({ id: 'demo-user', email, displayName: 'Demo User' });
  }

  register(email: string, _password: string): void {
    this._user$.next({ id: 'demo-user', email, displayName: 'Demo User' });
  }

  forgotPassword(_email: string): void {
    // In real life you'd call a backend. Here we do nothing. Consistent with reality.
  }

  /** Social logins are UI-only stubs for now. */
  loginWithProvider(provider: 'google' | 'facebook' | 'apple'): void {
    this._user$.next({
      id: `demo-${provider}`,
      email: `${provider}@demo.local`,
      displayName: `${provider.toUpperCase()} User`,
    });
  }

  logout(): void {
    this._user$.next(null);
  }
}
