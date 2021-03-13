import { Route } from '@angular/router';
import { FourOhFourComponent } from '@cmp/shared';


export const ROUTES: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule),
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
