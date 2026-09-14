import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { EventMessage, EventType, AuthenticationResult } from '@azure/msal-browser';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit, OnDestroy {
  errorMessage: string = '';
  private isInitialized = false;
  private readonly _destroying$ = new Subject<void>(); // Ayuda a limpiar la memoria al destruir el componente

  constructor(
    private authService: MsalService,
    private msalBroadcastService: MsalBroadcastService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    // 1. Inicialización obligatoria y segura de MSAL v5 para SSR
    if (typeof window !== 'undefined') {
      try {
        await this.authService.instance.initialize();
        this.isInitialized = true;
        
        // Comprobar si ya había una sesión previa guardada en la pestaña
        this.checkExistingAccounts();
      } catch (err) {
        this.errorMessage = 'Error de inicio en el servicio de seguridad.';
        console.error(err);
      }
    }

    // 2. Escuchar la respuesta exitosa de la autenticación de Microsoft
    this.msalBroadcastService.msalSubject$
      .pipe(
        filter((msg: EventMessage) => msg.eventType === EventType.LOGIN_SUCCESS),
        takeUntil(this._destroying$)
      )
      .subscribe((msg: EventMessage) => {
        const payload = msg.payload as AuthenticationResult;
        if (payload && payload.account) {
          // CLAVE: Registramos la cuenta en la sesión activa de Angular
          this.authService.instance.setActiveAccount(payload.account);
          console.log('Sesión aprobada para:', payload.account.username);
          this.router.navigate(['/inicio']); // Redirección limpia a tu página de inicio
        }
      });
  }

  checkExistingAccounts(): void {
    const accounts = this.authService.instance.getAllAccounts();
    if (accounts.length > 0) {
      this.authService.instance.setActiveAccount(accounts[0]);
      this.router.navigate(['/inicio']); // Si ya estaba logueado, lo saca del login
    }
  }

  loginWithMicrosoft(): void {
    if (!this.isInitialized) {
      this.errorMessage = 'El sistema se está sincronizando, presione de nuevo en un segundo.';
      return;
    }

    // Limpia una bandera de interacción "colgada" en sessionStorage (p. ej. por un
    // refresh a mitad del flujo del popup), que de otro modo provoca interaction_in_progress
    if (typeof window !== 'undefined' && sessionStorage.getItem('msal.interaction.status')) {
      sessionStorage.removeItem('msal.interaction.status');
    }

    this.errorMessage = '';
    console.log('Abriendo pasarela de autenticación institucional de Azure...');

    // Pasamos los parámetros exactos del laboratorio de tu profesor (Página 15 del PDF)
    this.authService.loginPopup({
      scopes: [], // Dejamos vacío en esta fase inicial para validar login primero sin token de backend
      prompt: 'select_account' // Obliga a Microsoft a mostrar la ventana de selección de cuenta
    }).subscribe({
      next: (response: AuthenticationResult) => {
        if (response.account) {
          this.authService.instance.setActiveAccount(response.account);
          console.log('Login exitoso vía suscripción:', response.account.username);
          this.router.navigate(['/inicio']);
        }
      },
      error: (err) => {
        this.errorMessage = `Error: ${err.message || err}`;
        console.error(err);
      }
    });
  }

  ngOnDestroy(): void {
    // Evita fugas de memoria en las subscripciones cuando cambies de página
    this._destroying$.next();
    this._destroying$.complete();
  }
}
