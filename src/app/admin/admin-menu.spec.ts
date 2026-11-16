import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Route, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { routes } from '../app.routes';
import { authGuard } from '../core/guards/auth-guard';
import { AuthState } from '../core/services/auth-state';
import { MENU_ADMIN, ROLES_DASHBOARD, entradasVisibles, rolesDe } from './admin-menu';
import { adminRoutes } from './admin.routes';
import { AdminLayout } from './layout/admin-layout';

/** El menú lateral, los guards de las rutas y el navbar salen de la misma fuente (admin-menu.ts). */
describe('Menú y rutas del dashboard', () => {
  const hijas = adminRoutes[0].children as Route[];
  const ruta = (path: string) => hijas.find((r) => r.path === path)!;

  function preparar(roles: string[]) {
    const authState = { roles: signal(roles), nombre: signal('Prueba'), cargarRoles: () => Promise.resolve(roles) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthState, useValue: authState },
        { provide: MsalService, useValue: { instance: { getActiveAccount: () => ({ username: 'x' }) } } },
      ],
    });
  }

  async function puedeEntrar(path: string, roles: string[]): Promise<boolean> {
    preparar(roles);
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const snapshot = { data: ruta(path).data ?? {} } as unknown as ActivatedRouteSnapshot;
    const resultado = await TestBed.runInInjectionContext(() =>
      authGuard(snapshot, { url: `/dashboard/${path}` } as RouterStateSnapshot),
    );
    if (!resultado) {
      expect(navegar).toHaveBeenCalledWith(['/dashboard']);
    }
    return resultado as boolean;
  }

  it('las rutas usan los mismos roles que su entrada del menú', () => {
    for (const entrada of MENU_ADMIN.filter((e) => e.segmento)) {
      expect(ruta(entrada.segmento).data?.['roles']).toEqual([...entrada.roles]);
    }
    expect(ruta('pedidos/:id').data?.['roles']).toEqual(rolesDe('pedidos'));
    expect(rolesDe('reportes')).toEqual(['Admin']);
    expect(rolesDe('auditoria')).toEqual(['Admin', 'Auditor']);
  });

  it('/dashboard deja entrar a Admin, Operador y Auditor (no al Cliente)', () => {
    const dashboard = routes.find((r) => r.path === 'dashboard')!;
    expect(dashboard.data?.['roles']).toEqual(['Admin', 'Operador', 'Auditor']);
    expect([...ROLES_DASHBOARD]).not.toContain('Cliente');
  });

  it('Admin entra a /dashboard/reportes; Operador, Auditor y Cliente no (vuelven a /dashboard)', async () => {
    expect(await puedeEntrar('reportes', ['Admin'])).toBe(true);
    TestBed.resetTestingModule();
    expect(await puedeEntrar('reportes', ['Operador'])).toBe(false);
    TestBed.resetTestingModule();
    expect(await puedeEntrar('reportes', ['Auditor'])).toBe(false);
    TestBed.resetTestingModule();
    expect(await puedeEntrar('reportes', ['Cliente'])).toBe(false);
  });

  it('Auditor y Admin entran a /dashboard/auditoria; Operador y Cliente no', async () => {
    expect(await puedeEntrar('auditoria', ['Auditor'])).toBe(true);
    TestBed.resetTestingModule();
    expect(await puedeEntrar('auditoria', ['Admin'])).toBe(true);
    TestBed.resetTestingModule();
    expect(await puedeEntrar('auditoria', ['Operador'])).toBe(false);
    TestBed.resetTestingModule();
    expect(await puedeEntrar('auditoria', ['Cliente'])).toBe(false);
  });

  it('cada rol ve solo sus entradas', () => {
    const etiquetas = (roles: string[]) => entradasVisibles(roles).map((e) => e.etiqueta);
    expect(etiquetas(['Admin'])).toEqual(['Inicio', 'Catálogo', 'Usuarios', 'Reportes', 'Auditoría']);
    expect(etiquetas(['Operador'])).toEqual(['Inicio', 'Pedidos']);
    expect(etiquetas(['Auditor'])).toEqual(['Inicio', 'Auditoría']);
    expect(etiquetas(['Cliente'])).toEqual([]);
  });

  it('el menú lateral del AdminLayout muestra los enlaces del rol', () => {
    preparar(['Admin']);
    const fixture = TestBed.createComponent(AdminLayout);
    fixture.detectChanges();
    const enlaces = [...(fixture.nativeElement as HTMLElement).querySelectorAll('nav[aria-label="Administración"] > div ul a')];
    expect(enlaces.map((a) => a.textContent!.trim())).toEqual(['Inicio', 'Catálogo', 'Usuarios', 'Reportes', 'Auditoría']);
    expect(enlaces[3].getAttribute('href')).toBe('/dashboard/reportes');
  });

  it('un Auditor solo ve Inicio y Auditoría en el menú lateral', () => {
    preparar(['Auditor']);
    const fixture = TestBed.createComponent(AdminLayout);
    fixture.detectChanges();
    const enlaces = [...(fixture.nativeElement as HTMLElement).querySelectorAll('nav[aria-label="Administración"] > div ul a')];
    expect(enlaces.map((a) => a.textContent!.trim())).toEqual(['Inicio', 'Auditoría']);
  });
});
