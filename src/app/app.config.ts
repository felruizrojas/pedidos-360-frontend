import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideAppInitializer, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

// Importaciones de Angular HTTP con withFetch
import { provideHttpClient, withInterceptorsFromDi, withInterceptors, withFetch, HTTP_INTERCEPTORS } from '@angular/common/http';
import { PublicClientApplication } from '@azure/msal-browser';
import { 
  MSAL_INSTANCE, 
  MSAL_INTERCEPTOR_CONFIG, 
  MSAL_GUARD_CONFIG, 
  MsalInterceptor, 
  MsalService, 
  MsalGuard, 
  MsalBroadcastService 
} from '@azure/msal-angular';
import { apiErrorInterceptor } from './core/interceptors/api-error.interceptor';
import { environment } from '../environments/environment';

export function msalInstanceFactory() {
  return new PublicClientApplication({
    auth: {
      clientId: environment.spaClientId.trim(),
      authority: `https://login.microsoftonline.com/${environment.tenantId.trim()}`,
      // Volvemos a la raíz limpia recomendada por las guías oficiales
      redirectUri: environment.redirectUri,
      postLogoutRedirectUri: environment.postLogoutRedirectUri
    },
    cache: {
      // localStorage (no sessionStorage) para que la sesión se comparta entre pestañas del
      // mismo origen: loguearte en una pestaña deja logueadas también las que ya estaban
      // abiertas y las nuevas que se abran después. El logout también se sincroniza entre
      // pestañas vía el evento 'storage' (ver MsalBroadcastService más abajo).
      cacheLocation: 'localStorage'
    }
  });
}

export function msalInterceptorConfigFactory() {
  const protectedResourceMap = new Map<string, Array<string>>();
  // El front solo habla con el BFF / API Gateway, nunca con los microservicios directamente.
  protectedResourceMap.set(`${environment.apiBaseUrl}/api/*`, [
    `api://${environment.apiClientId}/access_as_user`
  ]);

  return {
    interactionType: 'redirect',
    protectedResourceMap
  };
}

export function msalGuardConfigFactory() {
  return {
    interactionType: 'redirect',
    authRequest: {
      scopes: [`api://${environment.apiClientId}/access_as_user`]
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),

    // CORRECCIÓN: Agregamos withFetch() para eliminar la advertencia NG02801 y estabilizar las llamadas
    provideHttpClient(withInterceptorsFromDi(), withInterceptors([apiErrorInterceptor]), withFetch()),

    { provide: HTTP_INTERCEPTORS, useClass: MsalInterceptor, multi: true },
    { provide: MSAL_INSTANCE, useFactory: msalInstanceFactory },
    { provide: MSAL_GUARD_CONFIG, useFactory: msalGuardConfigFactory },
    { provide: MSAL_INTERCEPTOR_CONFIG, useFactory: msalInterceptorConfigFactory },
    MsalService,
    MsalGuard,
    MsalBroadcastService,

    // Inicializa MSAL antes de que arranque la app. Esto asegura que
    // authGuard y MsalInterceptor encuentren una instancia MSAL inicializada al entrar directo
    // o refrescar (F5) en rutas protegidas como /catalogo o /dashboard/catalogo.
    provideAppInitializer(async () => {
      const msalService = inject(MsalService);
      await msalService.instance.initialize();

      // Si no hay cuenta activa pero existe alguna cuenta cacheada en localStorage
      // (p. ej. tras un F5, o en una pestaña nueva con sesión ya iniciada en otra), la
      // restauramos como activa.
      if (!msalService.instance.getActiveAccount()) {
        const accounts = msalService.instance.getAllAccounts();
        if (accounts.length > 0) {
          msalService.instance.setActiveAccount(accounts[0]);
        }
      }
    })
  ]
};
