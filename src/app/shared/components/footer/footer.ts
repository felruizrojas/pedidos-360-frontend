import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { getUserRoles } from '../../../core/utils/user-roles';

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
  private readonly msalService = inject(MsalService);
  private readonly allowedDashboardRoles = ['Admin', 'Operador'];

  protected readonly anioActual = new Date().getFullYear();

  /** El catálogo solo tiene sentido enlazarlo si hay sesión activa (la ruta exige login). */
  protected estaLogueado(): boolean {
    return this.msalService.instance.getActiveAccount() !== null;
  }

  /** El dashboard solo se muestra a quienes tienen rol Admin u Operador. */
  protected puedeAccederDashboard(): boolean {
    const account = this.msalService.instance.getActiveAccount();
    const roles = getUserRoles(account);
    return roles.some((rol) => this.allowedDashboardRoles.includes(rol));
  }
}
