import { ChangeDetectionStrategy, Component } from '@angular/core';

import { BreadcrumbItem } from '../shared/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-brand-add-page',
  templateUrl: './brand-add-page.component.html',
  styleUrl: './brand-add-page.component.css',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrandAddPageComponent {
  protected readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', link: '/', icon: 'home' },
    { label: 'Brands', link: '/brands', icon: 'user' },
    { label: 'New Brand', icon: 'plus' }
  ];
}
