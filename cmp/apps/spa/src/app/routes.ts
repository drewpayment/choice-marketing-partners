import { Route } from '@angular/router';
import { FourOhFourComponent } from '@cmp/shared';
import { AuthGuard } from './services/auth.guard';


export const ROUTES: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule),
    canLoad: [AuthGuard],
  },
  {
    path: 'four-oh-four',
    component: FourOhFourComponent,
  },
  {
    path: '**',
    redirectTo: 'four-oh-four',
  }
];
