import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { AuthenticationResult } from '@azure/msal-browser';
import { firstValueFrom } from 'rxjs';
import { AuthState } from '../../../core/services/auth-state';

@Component({
  selector: 'app-auth-redirect',
  standalone: true,
  imports: [],
  template: `<p style="text-align:center; margin-top: 4rem;">Completando inicio de sesión…</p>`,
  styles: ``
})
export class AuthRedirect implements OnInit {
  private readonly msalService = inject(MsalService);
  private readonly router = inject(Router);
  private readonly authState = inject(AuthState);

  async ngOnInit(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // navigateToLoginRequestUrl: false evita que MSAL vuelva a la página donde se
      // inició el login (ej. /login); así el flujo siempre se resuelve aquí, en /auth-redirect.
      // handleRedirectObservable (en vez de instance.handleRedirectPromise) también
      // resetea el estado "en progreso" que usa MsalGuard para desbloquear rutas protegidas.
      const result = await firstValueFrom(
        this.msalService.handleRedirectObservable({
          navigateToLoginRequestUrl: false,
        }),
      ) as AuthenticationResult | null;

      if (result?.account) {
        this.msalService.instance.setActiveAccount(result.account);
      } else if (!this.msalService.instance.getActiveAccount()) {
        const accounts = this.msalService.instance.getAllAccounts();
        if (accounts.length > 0) {
          this.msalService.instance.setActiveAccount(accounts[0]);
        }
      }
    } catch (err) {
      console.error('Error al procesar la respuesta de Azure:', err);
    } finally {
      // El evento 'storage' del navegador NO dispara en la misma pestaña que hizo el
      // cambio (solo en las demás), así que acá hay que refrescar el estado a mano para
      // que Navbar/Footer reflejen el login recién hecho sin esperar otra navegación.
      this.authState.refrescar();
      this.router.navigate(['/inicio']);
    }
  }
}
