import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { EmployeesComponent } from './components/employees/employees.component';
import { ProjectionsComponent } from './components/projections/projections.component';
import { ReportsComponent } from './components/reports/reports.component';
import { RemindersComponent } from './components/reminders/reminders.component';
import { LoginComponent } from './components/login/login.component';
import { UsersComponent } from './components/users/users.component';
import { ProfileComponent } from './components/profile/profile.component';
import { authGuard, adminGuard, guestGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login',       component: LoginComponent,       canActivate: [guestGuard] },

  { path: 'dashboard',   component: DashboardComponent,   canActivate: [authGuard] },
  { path: 'employees',   component: EmployeesComponent,   canActivate: [authGuard] },
  { path: 'projections', component: ProjectionsComponent, canActivate: [authGuard] },
  { path: 'reports',     component: ReportsComponent,     canActivate: [authGuard] },
  { path: 'reminders',   component: RemindersComponent,   canActivate: [authGuard] },
  { path: 'profile',     component: ProfileComponent,     canActivate: [authGuard] },
  { path: 'users',       component: UsersComponent,       canActivate: [authGuard, adminGuard] },

  { path: '**', redirectTo: '/dashboard' },
];
