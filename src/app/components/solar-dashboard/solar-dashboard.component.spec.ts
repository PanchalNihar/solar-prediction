import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolarDashboardComponent } from './solar-dashboard.component';

describe('SolarDashboardComponent', () => {
  let component: SolarDashboardComponent;
  let fixture: ComponentFixture<SolarDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolarDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SolarDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
