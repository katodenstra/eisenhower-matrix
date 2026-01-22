import { Routes } from '@angular/router';
import { MatrixPageComponent } from './pages/matrix-page/matrix-page.component';
import { LoginPageComponent } from './pages/auth/login-page.component';
import { RegisterPageComponent } from './pages/auth/register-page.component';
import { ForgotPasswordPageComponent } from './pages/auth/forgot-password-page.component';

export const routes: Routes = [
  { path: '', component: MatrixPageComponent },
  { path: 'login', component: LoginPageComponent },
  { path: 'register', component: RegisterPageComponent },
  { path: 'forgot-password', component: ForgotPasswordPageComponent },
  { path: '**', redirectTo: '' },
];
