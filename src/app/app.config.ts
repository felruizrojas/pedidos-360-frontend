import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideAppInitializer, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

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
      cacheLocation: 'sessionStorage'
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
    provideClientHydration(withEventReplay()),

    // CORRECCIÓN: Agregamos withFetch() para eliminar la advertencia NG02801 y estabilizar las llamadas
    provideHttpClient(withInterceptorsFromDi(), withInterceptors([apiErrorInterceptor]), withFetch()),

    { provide: HTTP_INTERCEPTORS, useClass: MsalInterceptor, multi: true },
    { provide: MSAL_INSTANCE, useFactory: msalInstanceFactory },
    { provide: MSAL_GUARD_CONFIG, useFactory: msalGuardConfigFactory },
    { provide: MSAL_INTERCEPTOR_CONFIG, useFactory: msalInterceptorConfigFactory },
    MsalService,
    MsalGuard,
    MsalBroadcastService,

    // Inicializa MSAL antes de que arranque la app, solo en el navegador (en SSR este mismo
    // appConfig se reutiliza vía app.config.server.ts y no debe tocar MSAL). Esto asegura que
    // authGuard y MsalInterceptor encuentren una instancia MSAL inicializada al entrar directo
    // o refrescar (F5) en rutas protegidas como /catalogo o /dashboard/catalogo.
    provideAppInitializer(async () => {
      const platformId = inject(PLATFORM_ID);
      if (!isPlatformBrowser(platformId)) {
        return;
      }

      const msalService = inject(MsalService);
      await msalService.instance.initialize();

      // Si no hay cuenta activa pero existe alguna cuenta cacheada en sessionStorage
      // (p. ej. tras un F5), la restauramos como activa.
      if (!msalService.instance.getActiveAccount()) {
        const accounts = msalService.instance.getAllAccounts();
        if (accounts.length > 0) {
          msalService.instance.setActiveAccount(accounts[0]);
        }
      }
    })
  ]
};
