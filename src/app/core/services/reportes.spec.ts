import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ReportesService } from './reportes';

describe('ReportesService', () => {
  const base = `${environment.apiBaseUrl}/api/report`;
  let service: ReportesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ReportesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide cada endpoint con el range en el query', () => {
    service.kpis('last24h').subscribe();
    service.ventasPorHora('today').subscribe();
    service.leadTime('last7d').subscribe();
    expect(http.expectOne(`${base}/kpis?range=last24h`).request.method).toBe('GET');
    http.expectOne(`${base}/sales-by-hour?range=today`);
    http.expectOne(`${base}/lead-time?range=last7d`);
  });

  it('top-products envía orden y limit, y omite el limit vacío', () => {
    service.topProductos('last7d', 'monto', 10).subscribe();
    http.expectOne(`${base}/top-products?range=last7d&orden=monto&limit=10`);
    service.topProductos('last30d').subscribe();
    http.expectOne(`${base}/top-products?range=last30d&orden=cantidad`);
  });

  it('active-states va sin parámetros (no depende del rango)', () => {
    service.estadosActivos().subscribe();
    const req = http.expectOne(`${base}/active-states`);
    expect(req.request.params.keys()).toEqual([]);
  });
});
