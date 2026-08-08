import { Routes } from '@angular/router';
import { WorkspaceMenu } from './components/workspace-menu/workspace-menu';
import { Messenger } from './pages/messenger/messenger';
import { authGuard } from './core/guards/auth-guard';
import { guestGuard } from './core/guards/guest-guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/intro/intro').then((m) => m.Intro),
    canActivate: [guestGuard],
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then((m) => m.Register),
    canActivate: [guestGuard],
  },
  {
    path: 'choose-avatar',
    loadComponent: () =>
      import('./pages/choose-avatar/choose-avatar').then((m) => m.ChooseAvatar),
    canActivate: [authGuard],
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password').then((m) => m.ForgotPassword),
    canActivate: [guestGuard],
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: 'imprint',
    loadComponent: () => import('./pages/legal/imprint/imprint').then((m) => m.Imprint),
  },
  {
    path: 'privacy-policy',
    loadComponent: () =>
      import('./pages/legal/privacy-policy/privacy-policy').then((m) => m.PrivacyPolicy),
  },
  { path: 'WorkspaceMenu', component: WorkspaceMenu },
  { path: 'messenger', component: Messenger, canActivate: [authGuard] },
  {
    path: '**',
    redirectTo: '',
  },
];
