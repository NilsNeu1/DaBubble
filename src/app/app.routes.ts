import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { guestGuard } from './core/guards/guest-guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/auth/intro/intro').then((m) => m.Intro),
    canActivate: [guestGuard],
  },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
    canActivate: [authGuard],
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
    canActivate: [guestGuard],
  },
  {
    path: 'choose-avatar',
    loadComponent: () =>
      import('./features/auth/choose-avatar/choose-avatar').then((m) => m.ChooseAvatar),
    canActivate: [authGuard],
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
    canActivate: [guestGuard],
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: 'impressum',
    loadComponent: () => import('./features/legal/imprint/imprint').then((m) => m.Imprint),
  },
  {
    path: 'datenschutz',
    loadComponent: () =>
      import('./features/legal/privacy-policy/privacy-policy').then((m) => m.PrivacyPolicy),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
