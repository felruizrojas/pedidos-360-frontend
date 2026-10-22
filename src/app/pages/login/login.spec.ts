import { MsalService } from '@azure/msal-angular';
import { AccountInfo } from '@azure/msal-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [{
        provide: MsalService,
        useValue: { instance: { getActiveAccount: () => null, getAllAccounts: () => [], initialize: () => Promise.resolve() } },
      }],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /** Valor (dd) de la fila cuya etiqueta (dt) es `etiqueta`. */
  const valor = (etiqueta: string) => {
    const filas = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('dl > div'));
    const fila = filas.find((f) => f.querySelector('dt')?.textContent?.trim() === etiqueta);
    return fila?.querySelector('dd')?.textContent?.trim();
  };

  function conSesion(claims: Record<string, unknown>): void {
    component.account.set({ username: 'usuario3@contoso.onmicrosoft.com', name: 'Ana Pérez', idTokenClaims: claims } as unknown as AccountInfo);
    fixture.detectChanges();
  }

  it('con sesión muestra nombre, apellido, correo, notificaciones y roles', () => {
    conSesion({ given_name: 'Ana', family_name: 'Pérez', email: 'ana@correo.cl' });

    expect(valor('Nombre')).toBe('Ana');
    expect(valor('Apellido')).toBe('Pérez');
    expect(valor('Correo')).toBe('usuario3@contoso.onmicrosoft.com');
    expect(valor('Notificaciones')).toBe('ana@correo.cl');
    expect(valor('Roles')).toBe('Sin roles asignados');
  });

  it('sin el claim email, Notificaciones queda vacío (no repite el correo de inicio de sesión)', () => {
    conSesion({ given_name: 'Ana', family_name: 'Pérez' });

    expect(valor('Notificaciones')).toBe('');
  });
});
