import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiErrorInterceptor } from '../../../core/interceptors/api-error.interceptor';
import { CatalogoAdmin } from './catalogo-admin';

describe('CatalogoAdmin (desactivar y reactivar)', () => {
  let fixture: ComponentFixture<CatalogoAdmin>;
  let http: HttpTestingController;
  const url = `${environment.apiBaseUrl}/api/catalog/products`;
  const productos = [
    { id: 1, nombre: 'Taza', descripcion: 'd', precio: 5, stock: 1 },
    { id: 2, nombre: 'Plato', descripcion: 'd', precio: 8, stock: 3 },
  ];
  const eliminados = [{ id: 3, nombre: 'Vaso', descripcion: 'd', precio: 4, stock: 2 }];

  function responderCarga(): void {
    http.expectOne(url).flush(productos);
    http.expectOne(`${url}/eliminados`).flush(eliminados);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogoAdmin],
      providers: [provideHttpClient(withInterceptors([apiErrorInterceptor])), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CatalogoAdmin);
    fixture.detectChanges();
    responderCarga();
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const root = () => fixture.nativeElement as HTMLElement;
  const texto = () => root().textContent ?? '';
  const boton = (texto: string) =>
    Array.from(root().querySelectorAll('button')).find((b) => b.textContent?.trim() === texto)!;

  function abrirConfirmacion(): void {
    root().querySelector<HTMLButtonElement>('[aria-label="Desactivar Taza"]')!.click();
    fixture.detectChanges();
    expect(texto()).toContain('¿Desactivar Taza?');
  }

  it('confirmar deja la fila como eliminada con el botón Reactivar', () => {
    abrirConfirmacion();
    boton('Confirmar').click();
    fixture.detectChanges();
    expect(texto()).toContain('Desactivando…');

    const req = http.expectOne(`${url}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(root().querySelector('[aria-label="Desactivar Taza"]')).toBeNull();
    expect(root().querySelector('[aria-label="Reactivar Taza"]')).not.toBeNull();
    expect(texto()).toContain('Plato');
    expect(root().querySelector('[role="status"]')?.textContent).toContain('Producto desactivado del catálogo');
  });

  it('los eliminados se listan con Reactivar, que los restaura', () => {
    expect(texto()).toContain('Vaso');
    root().querySelector<HTMLButtonElement>('[aria-label="Reactivar Vaso"]')!.click();
    fixture.detectChanges();
    expect(texto()).toContain('Reactivando…');

    const req = http.expectOne(`${url}/3/restaurar`);
    expect(req.request.method).toBe('PUT');
    req.flush(eliminados[0]);
    fixture.detectChanges();

    expect(root().querySelector('[aria-label="Reactivar Vaso"]')).toBeNull();
    expect(root().querySelector('[aria-label="Desactivar Vaso"]')).not.toBeNull();
    expect(root().querySelector('[role="status"]')?.textContent).toContain('Producto reactivado en el catálogo');
  });

  it('si reactivar falla, la fila sigue eliminada y se muestra el error', () => {
    root().querySelector<HTMLButtonElement>('[aria-label="Reactivar Vaso"]')!.click();
    http.expectOne(`${url}/3/restaurar`).flush(null, { status: 503, statusText: 'x' });
    fixture.detectChanges();

    expect(texto()).toContain('El servicio no está disponible');
    expect(root().querySelector('[aria-label="Reactivar Vaso"]')).not.toBeNull();
  });

  it('cancelar no llama al servicio', () => {
    abrirConfirmacion();
    boton('Cancelar').click();
    fixture.detectChanges();

    http.expectNone(`${url}/1`);
    expect(texto()).not.toContain('¿Desactivar');
    expect(texto()).toContain('Taza');
  });

  it('Escape cancela la confirmación', () => {
    abrirConfirmacion();
    root().querySelector('tr.bg-red-50\\/40')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    http.expectNone(`${url}/1`);
    expect(texto()).not.toContain('¿Desactivar');
  });

  it('un 404 muestra el mensaje y recarga la lista', () => {
    abrirConfirmacion();
    boton('Confirmar').click();
    http.expectOne(`${url}/1`).flush({ status: 404, mensaje: 'Producto no encontrado con id 1' },
      { status: 404, statusText: 'Not Found' });
    responderCarga();
    fixture.detectChanges();

    expect(root().querySelector('[role="alert"]')?.textContent).toContain('El producto ya no estaba en el catálogo');
  });

  it('un 503 deja la confirmación abierta con el mensaje de servicio', () => {
    abrirConfirmacion();
    boton('Confirmar').click();
    http.expectOne(`${url}/1`).flush(null, { status: 503, statusText: 'x' });
    fixture.detectChanges();

    expect(texto()).toContain('El servicio no está disponible');
    expect(texto()).toContain('¿Desactivar Taza?');
  });
});
