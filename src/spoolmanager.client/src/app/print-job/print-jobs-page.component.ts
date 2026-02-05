import { ChangeDetectionStrategy, Component } from '@angular/core';

import { BreadcrumbItem } from '../shared/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-print-jobs-page',
  templateUrl: './print-jobs-page.component.html',
  styleUrl: './print-jobs-page.component.css',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrintJobsPageComponent {
  protected readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', link: '/', icon: 'home' },
    { label: 'Print Jobs', icon: 'printer' }
  ];
}
