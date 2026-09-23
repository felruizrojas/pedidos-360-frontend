import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthState } from '../../../core/services/auth-state';

/**
 * Footer público. Se muestra en todas las vistas excepto en /dashboard
 * (ese layout tiene su propio menú lateral, ver app.html).
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer.html',
})
export class Footer {
  // Signal-based: se actualiza solo si la sesión cambia en otra pestaña (ver AuthState).
  private readonly authState = inject(AuthState);
  private readonly allowedDashboardRoles = ['Admin', 'Operador'];

  protected readonly anioActual = new Date().getFullYear();

  /** El dashboard solo se muestra a quienes tienen rol Admin u Operador. */
  protected readonly puedeAccederDashboard = computed(() =>
    this.authState.roles().some((rol) => this.allowedDashboardRoles.includes(rol)),
  );
}
