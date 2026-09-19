import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { environment } from '../../../environments/environment.development';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  errorMessage: string = '';
  private isInitialized = false;

  constructor(
    private authService: MsalService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    // Inicialización obligatoria y segura de MSAL v5 para SSR
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
    console.log('Redirigiendo a la pasarela de autenticación institucional de Azure...');

    // Usamos redirect de página completa en vez de popup: evita el timeout que
    // ocurre al bootstrapear la app Angular (SSR + hidratación) dentro de un popup.
    // AuthRedirect procesa la respuesta cuando Azure devuelve al usuario a /auth-redirect.
    this.authService.loginRedirect({
      scopes: [`api://${environment.apiClientId}/access_as_user`],
      prompt: 'select_account'
    }).subscribe({
      error: (err) => {
        this.errorMessage = `Error: ${err.message || err}`;
        console.error(err);
      }
    });
  }
}
