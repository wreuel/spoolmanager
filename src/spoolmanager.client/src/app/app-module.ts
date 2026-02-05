import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { BrandCreateComponent } from './brand/brand-create.component';
import { BrandListComponent } from './brand/brand-list.component';
import { BrandsPageComponent } from './brand/brands-page.component';
import { BrandAddPageComponent } from './brand/brand-add-page.component';
import { BreadcrumbComponent } from './shared/breadcrumb/breadcrumb.component';
import { FilamentListComponent } from './filament/filament-list.component';
import { FilamentCreateComponent } from './filament/filament-create.component';
import { FilamentsPageComponent } from './filament/filaments-page.component';
import { FilamentAddPageComponent } from './filament/filament-add-page.component';
import { SpoolListComponent } from './spool/spool-list.component';
import { SpoolCreateComponent } from './spool/spool-create.component';
import { SpoolsPageComponent } from './spool/spools-page.component';
import { SpoolAddPageComponent } from './spool/spool-add-page.component';
import { PrintJobListComponent } from './print-job/print-job-list.component';
import { PrintJobCreateComponent } from './print-job/print-job-create.component';
import { PrintJobsPageComponent } from './print-job/print-jobs-page.component';
import { PrintJobAddPageComponent } from './print-job/print-job-add-page.component';
import { API_BASE_URL } from './core/tokens/api-base-url.token';
import { HomeComponent } from './pages/home/home.component';
import { AuthInterceptor } from './auth/auth.interceptor';
import { LoginPageComponent } from './auth/login-page.component';

export function apiBaseUrlFactory(): string {
  const baseElementHref = document.getElementsByTagName('base')[0]?.href;
  const baseFromDocument = baseElementHref && baseElementHref.length > 0 ? baseElementHref : null;
  const origin = window?.location?.origin ?? null;
  const resolvedBase = baseFromDocument ?? origin ?? '/';
  console.log('Base element href:', (resolvedBase.endsWith('/') ? resolvedBase : `${resolvedBase}/`)+'api/');
console.log('Resolved API base URL:', resolvedBase.endsWith('/') ? resolvedBase : `${resolvedBase}/`);
  return (resolvedBase.endsWith('/') ? resolvedBase : `${resolvedBase}/`)+'api/';
}

@NgModule({
  declarations: [
    App,
    BrandCreateComponent,
    BrandListComponent,
    BrandsPageComponent,
    BrandAddPageComponent,
    BreadcrumbComponent,
    FilamentListComponent,
    FilamentCreateComponent,
    FilamentsPageComponent,
    FilamentAddPageComponent,
    SpoolListComponent,
    SpoolCreateComponent,
    SpoolsPageComponent,
    SpoolAddPageComponent,
    PrintJobListComponent,
    PrintJobCreateComponent,
    PrintJobsPageComponent,
    PrintJobAddPageComponent,
    HomeComponent
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    AppRoutingModule,
    LoginPageComponent
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: API_BASE_URL, useFactory: apiBaseUrlFactory }
  ],
  bootstrap: [App]
})
export class AppModule { }
