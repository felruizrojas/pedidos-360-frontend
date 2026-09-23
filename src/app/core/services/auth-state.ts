import { DestroyRef, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MsalService } from '@azure/msal-angular';
import { AccountInfo } from '@azure/msal-browser';
import { getNombre } from '../utils/user-profile';
import { getUserRoles } from '../utils/user-roles';

/**
 * Estado reactivo (signal) de la cuenta MSAL activa, para que componentes de solo
 * lectura como Navbar/Footer se actualicen solos ante cambios de sesión.
 *
 * Con `cacheLocation: 'localStorage'` (ver app.config.ts) la sesión se comparte entre
 * pestañas del mismo origen: si haces login o logout en una pestaña, MSAL escribe/borra
 * las claves en localStorage y el navegador dispara el evento `storage` en TODAS las
 * demás pestañas abiertas (nunca en la que hizo el cambio, por eso no hace falta excluirla).
 * Sin este listener, una pestaña que ya estaba abierta e inactiva no se entera de ese
 * cambio hasta que el usuario navegue o interactúe ahí (recién ahí Angular vuelve a leer
 * MSAL). Con el listener, el signal se refresca solo y los componentes que lo leen en su
 * template (Navbar, Footer) se re-renderizan automáticamente, sin esperar esa interacción.
 */
@Injectable({ providedIn: 'root' })
export class AuthState {
  private readonly msalService = inject(MsalService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly cuentaActiva = signal<AccountInfo | null>(null);

  readonly estaLogueado = computed(() => this.cuentaActiva() !== null);
  readonly nombre = computed(() => getNombre(this.cuentaActiva()));
  readonly roles = computed(() => getUserRoles(this.cuentaActiva()));

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.refrescar();

    const onStorage = (event: StorageEvent) => {
      // event.key === null ocurre cuando se llama a localStorage.clear(); en ese caso
      // también hay que refrescar. Para el resto, filtramos por las claves que usa MSAL
      // (todas empiezan con el clientId de la SPA) para no recalcular en cada escritura
      // ajena a la sesión.
      if (event.key === null || event.key.includes(this.msalService.instance.getConfiguration().auth.clientId)) {
        this.refrescar();
      }
    };

    window.addEventListener('storage', onStorage);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('storage', onStorage));
  }

  /** Relee la cuenta activa desde MSAL (que a su vez lee de localStorage) y actualiza el signal. */
  refrescar(): void {
    this.cuentaActiva.set(this.msalService.instance.getActiveAccount());
  }
}
