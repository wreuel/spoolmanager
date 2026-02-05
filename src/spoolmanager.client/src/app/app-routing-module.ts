import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home.component';
import { BrandsPageComponent } from './brand/brands-page.component';
import { BrandAddPageComponent } from './brand/brand-add-page.component';
import { FilamentsPageComponent } from './filament/filaments-page.component';
import { FilamentAddPageComponent } from './filament/filament-add-page.component';
import { SpoolsPageComponent } from './spool/spools-page.component';
import { SpoolAddPageComponent } from './spool/spool-add-page.component';
import { PrintJobsPageComponent } from './print-job/print-jobs-page.component';
import { PrintJobAddPageComponent } from './print-job/print-job-add-page.component';
import { LoginPageComponent } from './auth/login-page.component';
import { AuthGuard } from './auth/auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  {
    path: '',
    canActivateChild: [AuthGuard],
    children: [
      { path: '', component: HomeComponent },
      { path: 'brands/add', component: BrandAddPageComponent },
      { path: 'spools', component: SpoolsPageComponent },
      { path: 'spools/add', component: SpoolAddPageComponent },
      { path: 'print-jobs', component: PrintJobsPageComponent },
      { path: 'print-jobs/add', component: PrintJobAddPageComponent },
      { path: 'brands', component: BrandsPageComponent },
      { path: 'filaments/add', component: FilamentAddPageComponent },
      { path: 'filaments', component: FilamentsPageComponent },
      { path: 'tests', component: FilamentsPageComponent },
      { path: '**', redirectTo: '' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
