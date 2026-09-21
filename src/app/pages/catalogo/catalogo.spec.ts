import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { apiErrorInterceptor } from '../../core/interceptors/api-error.interceptor';
import { Catalogo } from './catalogo';

describe('Catalogo', () => {
  let fixture: ComponentFixture<Catalogo>;
  let http: HttpTestingController;
  const url = `${environment.apiBaseUrl}/api/catalog/products`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Catalogo],
      providers: [provideHttpClient(withInterceptors([apiErrorInterceptor])), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Catalogo);
    fixture.detectChanges();
  });

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('lista los productos', () => {
    http.expectOne(url).flush([{ id: 1, nombre: 'Taza', descripcion: 'd', precio: 5, stock: 1 }]);
    fixture.detectChanges();
    expect(texto()).toContain('Taza');
  });

  it('muestra estado vacío', () => {
    http.expectOne(url).flush([]);
    fixture.detectChanges();
    expect(texto()).toContain('Aún no hay productos');
  });

  it('muestra error de servicio con reintento', () => {
    http.expectOne(url).flush(null, { status: 503, statusText: 'x' });
    fixture.detectChanges();
    expect(texto()).toContain('no está disponible');
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"] button')).toBeTruthy();
  });

  it('muestra 403', () => {
    http.expectOne(url).flush(null, { status: 403, statusText: 'x' });
    fixture.detectChanges();
    expect(texto()).toContain('No tienes permisos');
  });

  it('redirige a /login en 401', () => {
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    http.expectOne(url).flush(null, { status: 401, statusText: 'x' });
    expect(nav).toHaveBeenCalledWith(['/login']);
  });
});
