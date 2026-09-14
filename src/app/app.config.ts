import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

// Importaciones de Angular HTTP con withFetch
import { provideHttpClient, withInterceptorsFromDi, withFetch, HTTP_INTERCEPTORS } from '@angular/common/http';
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
import { environment } from '../environments/environment.development';

export function msalInstanceFactory() {
  return new PublicClientApplication({
    auth: {
      clientId: environment.spaClientId.trim(),
      authority: `https://login.microsoftonline.com/${environment.tenantId.trim()}`,
      // Volvemos a la raíz limpia recomendada por las guías oficiales
      redirectUri: 'http://localhost:4200/auth-redirect',
      postLogoutRedirectUri: 'http://localhost:4200'
    },
    cache: {
      cacheLocation: 'sessionStorage'
    }
  });
}

export function msalInterceptorConfigFactory() {
  const protectedResourceMap = new Map<string, Array<string>>();
  protectedResourceMap.set('http://localhost:8080/api/*', [
    `api://${environment.apiClientId}/access_as_user`
  ]);

  return {
    interactionType: 'popup', 
    protectedResourceMap
  };
}

export function msalGuardConfigFactory() {
  return {
    interactionType: 'popup',
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
    provideHttpClient(withInterceptorsFromDi(), withFetch()), 
    
    { provide: HTTP_INTERCEPTORS, useClass: MsalInterceptor, multi: true },
    { provide: MSAL_INSTANCE, useFactory: msalInstanceFactory },
    { provide: MSAL_GUARD_CONFIG, useFactory: msalGuardConfigFactory },
    { provide: MSAL_INTERCEPTOR_CONFIG, useFactory: msalInterceptorConfigFactory },
    MsalService,
    MsalGuard,
    MsalBroadcastService
  ]
};
