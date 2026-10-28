import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthState } from '../../../core/services/auth-state';
import { NotificacionesService } from '../../../core/services/notificaciones';

/** Cada cuánto se vuelven a pedir los avisos mientras la pestaña está abierta. */
const REFRESCO_MS = 30_000;

/**
 * Campana de avisos del Cliente (pedido cancelado, modificado o eliminado). Al abrirla, los avisos
 * se marcan como leídos. Se cierra con Escape o con un clic fuera.
 */
@Component({
  selector: 'app-notificaciones',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative',
    '(document:keydown.escape)': 'cerrar()',
    '(document:click)': 'clicFuera($event)',
  },
  template: `
    @if (esCliente()) {
      <button type="button" (click)="alternar()" [attr.aria-expanded]="abierto()" aria-controls="panel-notificaciones"
        [attr.aria-label]="'Notificaciones' + (noLeidas() > 0 ? ': ' + noLeidas() + ' sin leer' : '')"
        class="relative rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        @if (noLeidas() > 0) {
          <span class="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-red-700 px-1.5 text-center text-xs font-semibold text-white"
            aria-hidden="true">{{ noLeidas() }}</span>
        }
      </button>

      @if (abierto()) {
        <div id="panel-notificaciones" role="region" aria-label="Notificaciones"
          class="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white shadow-lg">
          <p class="border-b border-gray-100 px-4 py-2 text-sm font-semibold text-gray-900">Notificaciones</p>
          @if (notificaciones().length === 0) {
            <p class="px-4 py-6 text-center text-sm text-gray-600">No tienes notificaciones.</p>
          } @else {
            <ul class="max-h-96 divide-y divide-gray-100 overflow-y-auto">
              @for (n of notificaciones(); track n.id) {
                <li class="px-4 py-3" [class.bg-indigo-50]="!n.leida">
                  <p class="text-sm font-medium text-gray-900">{{ n.titulo }}</p>
                  <p class="text-sm text-gray-700">{{ n.mensaje }}</p>
                  <p class="mt-1 text-xs text-gray-600">{{ n.fecha | date: 'dd-MM-yyyy HH:mm' }}</p>
                </li>
              }
            </ul>
          }
        </div>
      }
    }
  `,
})
export class Notificaciones {
  private readonly authState = inject(AuthState);
  private readonly service = inject(NotificacionesService);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly esCliente = computed(() => this.authState.roles().includes('Cliente'));
  protected readonly notificaciones = this.service.notificaciones;
  protected readonly noLeidas = this.service.noLeidas;
  protected readonly abierto = signal(false);

  constructor() {
    // Los roles llegan de forma asíncrona (access token): se cargan apenas el usuario resulta ser Cliente.
    effect(() => {
      if (this.esCliente()) untracked(() => this.service.cargar());
    });
    const temporizador = setInterval(() => {
      if (this.esCliente()) this.service.cargar();
    }, REFRESCO_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(temporizador));
  }

  protected alternar(): void {
    const abrir = !this.abierto();
    this.abierto.set(abrir);
    if (abrir) this.service.marcarLeidas();
  }

  protected cerrar(): void {
    this.abierto.set(false);
  }

  protected clicFuera(evento: MouseEvent): void {
    if (this.abierto() && !this.elemento.nativeElement.contains(evento.target as Node)) this.cerrar();
  }
}
