import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
      <nav aria-label="Administración" class="md:w-60 shrink-0 bg-white border-b md:border-b-0 md:border-r border-gray-100 p-4">
        <p class="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-600">Administración</p>
        <ul class="flex md:flex-col gap-1">
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
        </ul>
      </nav>

      <main class="flex-1 bg-gray-50 p-4 sm:p-8">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AdminLayout {}
