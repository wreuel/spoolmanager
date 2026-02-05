import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type BreadcrumbIcon = 'home' | 'user' | 'layers' | 'plus' | 'printer';

export interface BreadcrumbItem {
  label: string;
  link?: string | readonly string[];
  icon?: BreadcrumbIcon;
}

@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class BreadcrumbComponent {
  @Input({ required: true }) items: BreadcrumbItem[] = [];

  protected iconPath(icon?: BreadcrumbIcon): string | null {
    if (!icon) {
      return null;
    }

    if (icon === 'home') {
      return 'M546.7 158.9L118.3 555.9c-11.3 10.2-4.3 29 10.4 29h76.4V896h221.3V682.7h155.2V896h221.3V584.9h76.4c14.7 0 21.7-18.8 10.4-29L569.3 158.9a16 16 0 00-22.6 0z';
    }

    if (icon === 'user') {
      return 'M858.5 763.6a374 374 0 00-80.6-119.5 375.63 375.63 0 00-119.5-80.6c-.4-.2-.8-.3-1.2-.5C719.5 518 760 444.7 760 362c0-137-111-248-248-248S264 225 264 362c0 82.7 40.5 156 102.8 201.1-.4.2-.8.3-1.2.5-44.8 18.9-85 46-119.5 80.6a375.63 375.63 0 00-80.6 119.5A371.7 371.7 0 00136 901.8a8 8 0 008 8.2h60c4.4 0 7.9-3.5 8-7.8 2-77.2 33-149.5 87.8-204.3 56.7-56.7 132-87.9 212.2-87.9s155.5 31.2 212.2 87.9C779 752.7 810 825 812 902.2c.1 4.4 3.6 7.8 8 7.8h60a8 8 0 008-8.2c-1-47.8-10.9-94.3-29.5-138.2zM512 534c-45.9 0-89.1-17.9-121.6-50.4S340 407.9 340 362c0-45.9 17.9-89.1 50.4-121.6S466.1 190 512 190s89.1 17.9 121.6 50.4S684 316.1 684 362c0 45.9-17.9 89.1-50.4 121.6S557.9 534 512 534z';
    }

    if (icon === 'plus') {
      return 'M544 256h-64v224H256v64h224v224h64V544h224v-64H544z';
    }

    if (icon === 'printer') {
      return 'M192 256v320h64v160h512V576h64V256H192zm512 384v96H320v-96h384zm64-192H256V320h512z';
    }

    return 'M128 384l384-160 384 160v64l-384 160-384-160zm0 256l384 160 384-160v64L512 896 128 704z';
  }
}
