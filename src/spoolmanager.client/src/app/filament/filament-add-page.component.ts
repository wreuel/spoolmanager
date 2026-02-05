import { ChangeDetectionStrategy, Component } from '@angular/core';

import { BreadcrumbItem } from '../shared/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-filament-add-page',
  templateUrl: './filament-add-page.component.html',
  styleUrl: './filament-add-page.component.css',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilamentAddPageComponent {
  protected readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', link: '/', icon: 'home' },
    { label: 'Filamentos', link: '/filaments', icon: 'layers' },
    { label: 'Criar' }
  ];
}
