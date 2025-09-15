import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';

export interface PredictionInput {
  location?: string;
  latitude?: number;
  longitude?: number;
  shortwave_radiation_backwards_sfc: number;
  azimuth: number;
  zenith: number;
  angle_of_incidence: number;
}

export interface PredictionResponse {
  latitude: number;
  longitude: number;
  predicted_generated_kw: number;
}

export interface OptimalConfiguration {
  optimal_azimuth: number;
  optimal_tilt: number;
  predicted_increase: number;
}

export interface DashboardData {
  current_prediction: PredictionResponse | null;
  optimal_config: OptimalConfiguration | null;
  historical_data: any[];
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class SolarPredictionService {
  private apiUrl = 'http://127.0.0.1:8000'; // FastAPI backend URL
  private dashboardDataSubject = new BehaviorSubject<DashboardData>({
    current_prediction: null,
    optimal_config: null,
    historical_data: [],
    loading: false,
    error: null,
  });

  public dashboardData$ = this.dashboardDataSubject.asObservable();

  constructor(private http: HttpClient) {}

  private get httpOptions() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }),
    };
  }

  private updateDashboardData(updates: Partial<DashboardData>) {
    const currentData = this.dashboardDataSubject.value;
    this.dashboardDataSubject.next({ ...currentData, ...updates });
  }

  predict(input: PredictionInput): Observable<PredictionResponse> {
    this.updateDashboardData({ loading: true, error: null });

    return this.http
      .post<PredictionResponse>(
        `${this.apiUrl}/predict`,
        input,
        this.httpOptions
      )
      .pipe(
        tap((response) => {
          this.updateDashboardData({
            current_prediction: response,
            loading: false,
          });
        }),
        catchError((error) => {
          this.updateDashboardData({
            loading: false,
            error:
              error.error?.detail || 'Prediction failed. Please try again.',
          });
          return throwError(() => error);
        })
      );
  }

  calculateOptimalConfiguration(
    latitude: number,
    month: number = new Date().getMonth() + 1
  ): OptimalConfiguration {
    // Simplified optimal configuration calculation
    const optimal_tilt = Math.abs(latitude) - 10; // Basic tilt calculation
    const optimal_azimuth = latitude >= 0 ? 180 : 0; // South-facing for Northern hemisphere

    return {
      optimal_azimuth,
      optimal_tilt: Math.max(0, Math.min(60, optimal_tilt)),
      predicted_increase: 15, // Estimated 15% increase with optimal configuration
    };
  }

  exportData(format: 'csv' | 'json'): Observable<Blob> {
    const currentData = this.dashboardDataSubject.value;

    if (format === 'csv') {
      const csvContent = this.convertToCSV(currentData.historical_data);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      return new Observable((observer) => {
        observer.next(blob);
        observer.complete();
      });
    } else {
      const jsonContent = JSON.stringify(currentData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      return new Observable((observer) => {
        observer.next(blob);
        observer.complete();
      });
    }
  }

  private convertToCSV(data: any[]): string {
    if (!data.length) return '';

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((row) => Object.values(row).join(','));
    return [headers, ...rows].join('\n');
  }

  clearData(): void {
    this.dashboardDataSubject.next({
      current_prediction: null,
      optimal_config: null,
      historical_data: [],
      loading: false,
      error: null,
    });
  }
}
