const MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'Diese E-Mail-Adresse wird bereits verwendet.',
  'auth/invalid-email': 'Bitte gib eine gültige E-Mail-Adresse ein.',
  'auth/weak-password': 'Das Passwort muss mindestens 6 Zeichen lang sein.',
  'auth/missing-password': 'Bitte gib ein Passwort ein.',
  'auth/user-not-found': 'E-Mail oder Passwort ist falsch.',
  'auth/wrong-password': 'E-Mail oder Passwort ist falsch.',
  'auth/invalid-credential': 'E-Mail oder Passwort ist falsch.',
  'auth/too-many-requests': 'Zu viele Versuche. Bitte versuche es später erneut.',
  'auth/popup-closed-by-user': 'Die Google-Anmeldung wurde abgebrochen.',
  'auth/expired-action-code': 'Der Link ist abgelaufen. Bitte fordere einen neuen an.',
  'auth/invalid-action-code': 'Der Link ist ungültig oder wurde bereits verwendet.',
  'auth/network-request-failed': 'Keine Verbindung zum Server. Prüfe deine Internetverbindung.',
};

export function mapAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code && MESSAGES[code]) {
    return MESSAGES[code];
  }
  return 'Etwas ist schiefgelaufen. Bitte versuche es erneut.';
}
