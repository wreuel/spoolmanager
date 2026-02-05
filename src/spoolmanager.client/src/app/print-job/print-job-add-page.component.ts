import { ChangeDetectionStrategy, Component } from '@angular/core';

import { BreadcrumbItem } from '../shared/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-print-job-add-page',
  templateUrl: './print-job-add-page.component.html',
  styleUrl: './print-job-add-page.component.css',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrintJobAddPageComponent {
  protected readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', link: '/', icon: 'home' },
    { label: 'Print Jobs', link: '/print-jobs', icon: 'printer' },
    { label: 'New Print' }
  ];
}
