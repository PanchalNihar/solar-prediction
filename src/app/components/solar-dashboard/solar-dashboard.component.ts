import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DashboardData, PredictionInput, SolarPredictionService } from '../../service/solar-prediction.service';


@Component({
  selector: 'app-solar-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule
  ],
  templateUrl: './solar-dashboard.component.html',
  styleUrls: ['./solar-dashboard.component.css']
})
export class SolarDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  predictionForm: FormGroup;
  dashboardData: DashboardData = {
    current_prediction: null,
    optimal_config: null,
    historical_data: [],
    loading: false,
    error: null
  };

  constructor(
    private fb: FormBuilder,
    private solarService: SolarPredictionService
  ) {
    this.predictionForm = this.createForm();
  }

  ngOnInit(): void {
    this.subscribeToDataChanges();
    this.loadDefaultLocation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      location: ['', [Validators.minLength(2)]],
      latitude: [null, [Validators.min(-90), Validators.max(90)]],
      longitude: [null, [Validators.min(-180), Validators.max(180)]],
      shortwave_radiation_backwards_sfc: [800, [Validators.required, Validators.min(0), Validators.max(1400)]],
      azimuth: [180, [Validators.required, Validators.min(0), Validators.max(360)]],
      zenith: [45, [Validators.required, Validators.min(0), Validators.max(90)]],
      angle_of_incidence: [30, [Validators.required, Validators.min(0), Validators.max(90)]]
    });
  }

  private subscribeToDataChanges(): void {
    this.solarService.dashboardData$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.dashboardData = data;
      });
  }

  private loadDefaultLocation(): void {
    // Set default to Mumbai coordinates
    this.predictionForm.patchValue({
      location: 'Mumbai, India',
      latitude: 19.0760,
      longitude: 72.8777
    });
  }

  onSubmit(): void {
    if (this.predictionForm.valid) {
      const formValue = this.predictionForm.value;
      const input: PredictionInput = {
        location: formValue.location || undefined,
        latitude: formValue.latitude,
        longitude: formValue.longitude,
        shortwave_radiation_backwards_sfc: formValue.shortwave_radiation_backwards_sfc,
        azimuth: formValue.azimuth,
        zenith: formValue.zenith,
        angle_of_incidence: formValue.angle_of_incidence
      };

      this.solarService.predict(input).subscribe({
        next: (response) => {
          // Calculate optimal configuration
          const optimalConfig = this.solarService.calculateOptimalConfiguration(
            response.latitude
          );
          
          // Generate historical data
          const historicalData = this.solarService.generateHistoricalData(
            response.latitude,
            response.longitude
          );

          // Update service with additional data
          this.solarService['updateDashboardData']({
            optimal_config: optimalConfig,
            historical_data: historicalData
          });
        },
        error: (error) => {
          console.error('Prediction failed:', error);
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.predictionForm.controls).forEach(key => {
      const control = this.predictionForm.get(key);
      control?.markAsTouched();
    });
  }

  useCurrentLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.predictionForm.patchValue({
            latitude: Math.round(position.coords.latitude * 10000) / 10000,
            longitude: Math.round(position.coords.longitude * 10000) / 10000,
            location: '' // Clear location field when using coordinates
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Unable to retrieve location. Please enter coordinates manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  }

  resetForm(): void {
    this.predictionForm.reset();
    this.loadDefaultLocation();
    this.solarService.clearData();
  }

  exportData(format: 'csv' | 'json'): void {
    this.solarService.exportData(format).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `solar-prediction-data.${format}`;
      link.click();
      window.URL.revokeObjectURL(url);
    });
  }

  getFormFieldError(fieldName: string): string {
    const control = this.predictionForm.get(fieldName);
    if (control?.errors && control.touched) {
      const errors = control.errors;
      if (errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
      if (errors['min']) return `${this.getFieldLabel(fieldName)} must be at least ${errors['min'].min}`;
      if (errors['max']) return `${this.getFieldLabel(fieldName)} must be at most ${errors['max'].max}`;
      if (errors['minlength']) return `${this.getFieldLabel(fieldName)} must be at least ${errors['minlength'].requiredLength} characters`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'location': 'Location',
      'latitude': 'Latitude',
      'longitude': 'Longitude',
      'shortwave_radiation_backwards_sfc': 'Solar Irradiance',
      'azimuth': 'Azimuth Angle',
      'zenith': 'Zenith Angle',
      'angle_of_incidence': 'Angle of Incidence'
    };
    return labels[fieldName] || fieldName;
  }

  isFormFieldInvalid(fieldName: string): boolean {
    const control = this.predictionForm.get(fieldName);
    return !!(control?.invalid && control.touched);
  }

  getPredictionSummary(): string {
    const prediction = this.dashboardData.current_prediction;
    if (!prediction) return '';
    
    return `Based on current conditions, your solar panels are expected to generate ${prediction.predicted_generated_kw.toFixed(2)} kW of power.`;
  }

  getOptimalConfigurationText(): string {
    const optimal = this.dashboardData.optimal_config;
    if (!optimal) return '';
    
    return `For optimal performance, set your panels to ${optimal.optimal_tilt}° tilt and ${optimal.optimal_azimuth}° azimuth for up to ${optimal.predicted_increase}% increased efficiency.`;
  }
}
