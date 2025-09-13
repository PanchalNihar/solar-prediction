import { TestBed } from '@angular/core/testing';

import { SolarPredictionService } from './solar-prediction.service';

describe('SolarPredictionService', () => {
  let service: SolarPredictionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SolarPredictionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
