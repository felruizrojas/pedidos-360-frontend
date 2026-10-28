import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { apiErrorInterceptor } from '../../../core/interceptors/api-error.interceptor';
import { Usuario } from '../../../core/models/usuario.model';
import { Usuarios } from './usuarios';

describe('Usuarios (dashboard)', () => {
  const url = `${environment.apiBaseUrl}/api/users`;
  let fixture: ComponentFixture<Usuarios>;
  let http: HttpTestingController;

  const usuario = (parcial: Partial<Usuario>): Usuario => ({
    id: 'u-1', nombre: 'Ana Admin', nombres: 'Ana', apellidos: 'Admin', email: 'ana@contoso.cl',
    usuarioPrincipal: 'ana@contoso.onmicrosoft.com', roles: ['Admin'], cuentaHabilitada: true, tipo: 'Member',
    cargo: null, departamento: null, telefono: null, creadoEn: '2026-09-01T12:00:00Z',
    activo: true, primerAcceso: '2026-10-20T15:00:00Z', ultimoAcceso: '2026-10-26T10:00:00Z',
    ...parcial,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Usuarios],
      providers: [provideHttpClient(withInterceptors([apiErrorInterceptor])), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Usuarios);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const el = () => fixture.nativeElement as HTMLElement;
  const filas = () => [...el().querySelectorAll('tbody tr')] as HTMLElement[];

  it('lista los usuarios con su rol y si están activos o inactivos', () => {
    http.expectOne(url).flush([
      usuario({}),
      usuario({ id: 'u-2', nombre: 'Carla Cliente', roles: ['Cliente'], activo: false, primerAcceso: null, ultimoAcceso: null }),
    ]);
    fixture.detectChanges();

    expect(filas()).toHaveLength(2);
    expect(filas()[0].textContent).toContain('Ana Admin');
    expect(filas()[0].textContent).toContain('Admin');
    expect(filas()[0].textContent).toContain('Activo');
    expect(filas()[1].textContent).toContain('Carla Cliente');
    expect(filas()[1].textContent).toContain('Inactivo');
    expect(filas()[1].textContent).toContain('Nunca inició sesión');
    // La tabla muestra el correo de inicio de sesión, no el de notificaciones.
    expect(filas()[0].textContent).toContain('ana@contoso.onmicrosoft.com');
    expect(filas()[0].textContent).not.toContain('ana@contoso.cl');
    // Solo lectura: fuera de los filtros no hay campos ni botones de edición.
    expect(el().querySelector('input, textarea')).toBeNull();
    expect(el().querySelectorAll('select')).toHaveLength(2);
    expect(el().textContent).not.toMatch(/Editar|Guardar|Eliminar|Desactivar/);
  });

  it('"Ver detalle" muestra toda la información del usuario', () => {
    http.expectOne(url).flush([usuario({})]);
    fixture.detectChanges();

    const boton = el().querySelector<HTMLButtonElement>('[aria-label="Ver detalle de Ana Admin"]')!;
    boton.click();
    fixture.detectChanges();

    expect(boton.getAttribute('aria-expanded')).toBe('true');
    const detalle = el().querySelector('#detalle-u-1')!;
    expect(detalle.textContent).toContain('ana@contoso.onmicrosoft.com');
    expect(detalle.textContent).toContain('ana@contoso.cl');
    expect(detalle.textContent).toContain('Habilitada');
    expect(detalle.textContent).toContain('u-1');
  });

  it('filtra por rol y por estado, y "Limpiar filtros" vuelve a mostrar todos', () => {
    http.expectOne(url).flush([
      usuario({}),
      usuario({ id: 'u-2', nombre: 'Óscar Operador', roles: ['Operador'], activo: true }),
      usuario({ id: 'u-3', nombre: 'Carla Cliente', roles: ['Cliente'], activo: false, primerAcceso: null, ultimoAcceso: null }),
    ]);
    fixture.detectChanges();
    const elegir = (id: string, valor: string) => {
      const select = el().querySelector<HTMLSelectElement>(id)!;
      select.value = valor;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };
    const nombres = () => filas().map((f) => f.querySelector('td')!.textContent!.trim());

    elegir('#filtro-rol', 'Operador');
    expect(nombres()).toEqual(['Óscar Operador']);
    expect(el().querySelector('[role="status"]')?.textContent).toContain('Mostrando 1 de 3');

    elegir('#filtro-rol', '');
    elegir('#filtro-estado', 'inactivo');
    expect(nombres()).toEqual(['Carla Cliente']);

    elegir('#filtro-estado', 'activo');
    expect(nombres()).toEqual(['Ana Admin', 'Óscar Operador']);

    elegir('#filtro-rol', 'Cliente');
    expect(filas()).toHaveLength(0);
    expect(el().textContent).toContain('No hay usuarios que coincidan con los filtros.');

    [...el().querySelectorAll('button')].find((b) => b.textContent!.includes('Limpiar filtros'))!.click();
    fixture.detectChanges();
    expect(filas()).toHaveLength(3);
  });

  it('muestra el error del servicio con reintento', () => {
    http.expectOne(url).flush(null, { status: 503, statusText: 'x' });
    fixture.detectChanges();
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('no está disponible');

    el().querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    http.expectOne(url).flush([]);
    fixture.detectChanges();
    expect(el().textContent).toContain('No hay usuarios con rol asignado');
  });
});
