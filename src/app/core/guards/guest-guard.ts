import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  await auth.ready;

  return auth.currentUser() ? router.parseUrl('/messenger') : true;
};
