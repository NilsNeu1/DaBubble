import { Routes } from '@angular/router';
import { WorkspaceMenu } from './components/workspace-menu/workspace-menu';
import { ChatPanel } from './components/chat-panel/chat-panel';
import { Imprint } from './pages/legal/imprint/imprint';
import { PrivacyPolicy } from './pages/legal/privacy-policy/privacy-policy';

export const routes: Routes = [
    { path: 'WorkspaceMenu', component: WorkspaceMenu },
    { path: 'imprint', component: Imprint },
    { path: 'privacy-policy', component: PrivacyPolicy },
];
