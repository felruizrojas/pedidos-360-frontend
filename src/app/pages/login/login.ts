import { Component, OnInit, signal, computed } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { AccountInfo } from '@azure/msal-browser';
import { getUserRoles } from '../../core/utils/user-roles';
import { getApellido, getNombre } from '../../core/utils/user-profile';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  errorMessage: string = '';
  private isInitialized = false;

  readonly account = signal<AccountInfo | null>(null);
  readonly roles = computed(() => getUserRoles(this.account()));
  readonly nombre = computed(() => getNombre(this.account()));
  readonly apellido = computed(() => getApellido(this.account()));

  constructor(private authService: MsalService) {}

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
      this.account.set(accounts[0]); // Si ya estaba logueado, muestra sus datos en vez de la card de login
    }
  }

  logout(): void {
    this.authService.logoutRedirect({
      account: this.account() ?? undefined
    }).subscribe({
      error: (err) => {
        this.errorMessage = `Error: ${err.message || err}`;
        console.error(err);
      }
    });
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
