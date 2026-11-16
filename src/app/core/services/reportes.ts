import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EstadosActivos,
  Kpis,
  LeadTime,
  OrdenTopParam,
  RangoReporte,
  TopProductos,
  VentasPorHora,
} from '../models/report.model';
import { paramsSinVacios } from '../utils/http-params';

/** KPIs de reportería a través del BFF (/api/report, solo Admin). Los cálculos los hace ms-pedidos360-report. */
@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/report`;

  kpis(range: RangoReporte): Observable<Kpis> {
    return this.http.get<Kpis>(`${this.apiUrl}/kpis`, { params: paramsSinVacios({ range }) });
  }

  ventasPorHora(range: RangoReporte): Observable<VentasPorHora> {
    return this.http.get<VentasPorHora>(`${this.apiUrl}/sales-by-hour`, { params: paramsSinVacios({ range }) });
  }

  leadTime(range: RangoReporte): Observable<LeadTime> {
    return this.http.get<LeadTime>(`${this.apiUrl}/lead-time`, { params: paramsSinVacios({ range }) });
  }

  /** limit 1-50 (default de report: 5). */
  topProductos(range: RangoReporte, orden: OrdenTopParam = 'cantidad', limit?: number | null): Observable<TopProductos> {
    return this.http.get<TopProductos>(`${this.apiUrl}/top-products`, {
      params: paramsSinVacios({ range, orden, limit }),
    });
  }

  /** Foto actual: no depende del rango. */
  estadosActivos(): Observable<EstadosActivos> {
    return this.http.get<EstadosActivos>(`${this.apiUrl}/active-states`);
  }
}
