import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { getNombre } from '../../../core/utils/user-profile';

@Component({
  selector: 'app-bienvenida',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-3xl space-y-6">
      <div class="space-y-2">
        <h1 class="text-3xl font-extrabold tracking-tight text-gray-900">
          Bienvenido@if (nombre) {, {{ nombre }}}
        </h1>
        <p class="text-gray-600">Este es el panel de administración de Pedidos 360.</p>
      </div>

      <a routerLink="/dashboard/catalogo"
        class="block bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow focus-visible:outline-2 focus-visible:outline-indigo-600">
        <h2 class="text-lg font-bold text-gray-900">Catálogo</h2>
        <p class="text-sm text-gray-600">Consulta los productos y agrega nuevos.</p>
      </a>
    </div>
  `,
})
export class Bienvenida {
  private readonly msalService = inject(MsalService);
  protected readonly nombre = getNombre(this.msalService.instance.getActiveAccount()) || null;
}
