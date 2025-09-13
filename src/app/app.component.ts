import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SolarDashboardComponent } from "./components/solar-dashboard/solar-dashboard.component";

@Component({
  selector: 'app-root',
  imports: [SolarDashboardComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'solar-prediction';
}
