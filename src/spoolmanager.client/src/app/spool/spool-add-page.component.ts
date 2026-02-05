import { ChangeDetectionStrategy, Component } from '@angular/core';

import { BreadcrumbItem } from '../shared/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-spool-add-page',
  templateUrl: './spool-add-page.component.html',
  styleUrl: './spool-add-page.component.css',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpoolAddPageComponent {
  protected readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', link: '/', icon: 'home' },
    { label: 'Spools', link: '/spools', icon: 'layers' },
    { label: 'New Spool', icon: 'plus' }
  ];
}
