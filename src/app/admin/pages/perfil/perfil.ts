import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { getUserRoles } from '../../../core/utils/user-roles';

@Component({
  selector: 'app-perfil',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-xl space-y-6">
      <h1 class="text-3xl font-extrabold tracking-tight text-gray-900">Mi perfil</h1>

      @if (cuenta) {
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          <dl class="divide-y divide-gray-100 text-sm">
            <div class="py-3 flex justify-between gap-4">
              <dt class="text-gray-600">Nombre</dt>
              <dd class="font-medium text-gray-900 text-right">{{ cuenta.name }}</dd>
            </div>
            <div class="py-3 flex justify-between gap-4">
              <dt class="text-gray-600">Correo</dt>
              <dd class="font-medium text-gray-900 text-right break-all">{{ cuenta.username }}</dd>
            </div>
            <div class="py-3 flex justify-between gap-4">
              <dt class="text-gray-600">Roles</dt>
              <dd class="flex flex-wrap justify-end gap-1.5">
                @for (rol of roles; track rol) {
                  <span class="text-xs font-medium text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">{{ rol }}</span>
                } @empty {
                  <span class="text-gray-600">Sin roles asignados</span>
                }
              </dd>
            </div>
          </dl>

          @if (error()) {
            <p role="alert" class="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">{{ error() }}</p>
          }

          <button type="button" (click)="cerrarSesion()"
            class="w-full bg-white text-red-700 border border-red-200 px-5 py-3 rounded-xl font-medium hover:bg-red-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">
            Cerrar sesión
          </button>
        </div>
      }
    </div>
  `,
})
export class Perfil {
  private readonly msalService = inject(MsalService);

  protected readonly cuenta = this.msalService.instance.getActiveAccount();
  protected readonly roles = getUserRoles(this.cuenta);
  protected readonly error = signal('');

  protected cerrarSesion(): void {
    this.msalService.logoutRedirect({ account: this.cuenta ?? undefined }).subscribe({
      error: (err) => {
        this.error.set(`Error: ${err.message || err}`);
        console.error(err);
      },
    });
  }
}
