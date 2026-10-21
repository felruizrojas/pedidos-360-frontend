import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiErrorInterceptor } from '../../../core/interceptors/api-error.interceptor';
import { CatalogoAdmin } from './catalogo-admin';

describe('CatalogoAdmin (eliminar)', () => {
  let fixture: ComponentFixture<CatalogoAdmin>;
  let http: HttpTestingController;
  const url = `${environment.apiBaseUrl}/api/catalog/products`;
  const productos = [
    { id: 1, nombre: 'Taza', descripcion: 'd', precio: 5, stock: 1 },
    { id: 2, nombre: 'Plato', descripcion: 'd', precio: 8, stock: 3 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogoAdmin],
      providers: [provideHttpClient(withInterceptors([apiErrorInterceptor])), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CatalogoAdmin);
    fixture.detectChanges();
    http.expectOne(url).flush(productos);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const root = () => fixture.nativeElement as HTMLElement;
  const texto = () => root().textContent ?? '';
  const boton = (texto: string) =>
    Array.from(root().querySelectorAll('button')).find((b) => b.textContent?.trim() === texto)!;

  function abrirConfirmacion(): void {
    root().querySelector<HTMLButtonElement>('[aria-label="Eliminar Taza"]')!.click();
    fixture.detectChanges();
    expect(texto()).toContain('¿Eliminar Taza?');
  }

  it('confirmar elimina la fila y muestra el mensaje de éxito', () => {
    abrirConfirmacion();
    boton('Confirmar').click();
    fixture.detectChanges();
    expect(texto()).toContain('Eliminando…');

    const req = http.expectOne(`${url}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(texto()).not.toContain('Taza');
    expect(texto()).toContain('Plato');
    expect(root().querySelector('[role="status"]')?.textContent).toContain('Producto eliminado');
  });

  it('cancelar no llama al servicio', () => {
    abrirConfirmacion();
    boton('Cancelar').click();
    fixture.detectChanges();

    http.expectNone(`${url}/1`);
    expect(texto()).not.toContain('¿Eliminar');
    expect(texto()).toContain('Taza');
  });

  it('Escape cancela la confirmación', () => {
    abrirConfirmacion();
    root().querySelector('tr.bg-red-50\\/40')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    http.expectNone(`${url}/1`);
    expect(texto()).not.toContain('¿Eliminar');
  });

  it('un 404 muestra el mensaje y quita la fila', () => {
    abrirConfirmacion();
    boton('Confirmar').click();
    http.expectOne(`${url}/1`).flush({ status: 404, mensaje: 'Producto no encontrado con id 1' },
      { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(root().querySelector('[role="alert"]')?.textContent).toContain('El producto ya no existe. Recarga la lista.');
    expect(texto()).not.toContain('Taza');
  });

  it('un 503 deja la confirmación abierta con el mensaje de servicio', () => {
    abrirConfirmacion();
    boton('Confirmar').click();
    http.expectOne(`${url}/1`).flush(null, { status: 503, statusText: 'x' });
    fixture.detectChanges();

    expect(texto()).toContain('El servicio no está disponible');
    expect(texto()).toContain('¿Eliminar Taza?');
  });
});
