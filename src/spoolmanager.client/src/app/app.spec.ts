import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { App } from './app';

@Component({ template: '' })
class HomeStubComponent {}

@Component({ template: '' })
class BrandsStubComponent {}

describe('App', () => {
  let component: App;
  let fixture: ComponentFixture<App>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [App, HomeStubComponent, BrandsStubComponent],
      imports: [
        RouterTestingModule.withRoutes([
          { path: '', component: HomeStubComponent },
          { path: 'brands', component: BrandsStubComponent }
        ])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should expose the application title', () => {
    expect(component.title).toBe('Spool Manager');
  });

  it('should render navigation links', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('.app-sidebar__nav a');
    expect(links.length).toBe(2);
  });

  it('should toggle the sidebar collapsed state', () => {
    expect(component.sidebarCollapsed()).toBeFalse();
    component.toggleSidebar();
    expect(component.sidebarCollapsed()).toBeTrue();
  });
});
