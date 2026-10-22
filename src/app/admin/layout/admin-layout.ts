import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthState } from '../../core/services/auth-state';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col md:flex-row md:h-screen md:overflow-hidden">
      <nav aria-label="Administración"
        class="md:w-60 shrink-0 md:h-screen md:sticky md:top-0 md:overflow-y-auto bg-white border-b md:border-b-0 md:border-r border-gray-100 p-4 flex flex-col gap-4 md:justify-between">
        <div>
          <p class="px-3 pb-2 text-lg font-bold text-indigo-600 tracking-tight">Pedidos 360</p>
          <p class="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-600">Administración</p>
          <ul class="flex flex-wrap md:flex-col gap-1">
            <li>
              <a routerLink="/dashboard" [routerLinkActiveOptions]="{ exact: true }"
                routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold" ariaCurrentWhenActive="page"
                class="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-600">
                Inicio
              </a>
            </li>
            <li>
              <a routerLink="/dashboard/catalogo" routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
                ariaCurrentWhenActive="page"
                class="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-600">
                Catálogo
              </a>
            </li>
            <li>
              <a routerLink="/dashboard/pedidos" routerLinkActive="bg-indigo-50 text-indigo-700 font-semibold"
                ariaCurrentWhenActive="page"
                class="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-600">
                Pedidos
              </a>
            </li>
          </ul>
        </div>

        <ul class="flex flex-wrap md:flex-col gap-1 md:pt-4 md:border-t md:border-gray-100">
          <!-- Igual que el botón de la navbar de la tienda: /login con sesión muestra los datos de la cuenta y cerrar sesión. -->
          <li>
            <a routerLink="/login"
              class="block px-3 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
              @if (nombre(); as n) { Hola, {{ n }} } @else { Mi cuenta }
            </a>
          </li>
          <li>
            <a routerLink="/inicio"
              class="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-600">
              Ir a la tienda
            </a>
          </li>
        </ul>
      </nav>

      <main class="flex-1 bg-gray-50 p-4 sm:p-8 md:h-screen md:overflow-y-auto">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AdminLayout {
  protected readonly nombre = inject(AuthState).nombre;
}
