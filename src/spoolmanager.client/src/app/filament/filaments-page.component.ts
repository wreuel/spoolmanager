import { ChangeDetectionStrategy, Component } from '@angular/core';

import { BreadcrumbItem } from '../shared/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-filaments-page',
  templateUrl: './filaments-page.component.html',
  styleUrl: './filaments-page.component.css',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilamentsPageComponent {
  protected readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', link: '/', icon: 'home' },
    { label: 'Filamentos', icon: 'layers' }
  ];
}
