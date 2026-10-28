import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Notificacion } from '../models/notificacion.model';

/** Avisos en la app del usuario (los guarda orders junto con el mensaje que publica en RabbitMQ). */
@Injectable({
  providedIn: 'root',
})
export class NotificacionesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/orders/notifications`;

  private readonly lista = signal<Notificacion[]>([]);
  readonly notificaciones = this.lista.asReadonly();
  readonly noLeidas = computed(() => this.lista().filter((n) => !n.leida).length);

  /** Si falla (red, 401) se conserva la lista anterior: los avisos no deben romper la navegación. */
  cargar(): void {
    this.http.get<Notificacion[]>(this.apiUrl).subscribe({
      next: (lista) => this.lista.set(lista),
      error: () => undefined,
    });
  }

  marcarLeidas(): void {
    if (this.noLeidas() === 0) return;
    this.http.put<void>(`${this.apiUrl}/read`, null).subscribe({
      next: () => this.lista.update((lista) => lista.map((n) => ({ ...n, leida: true }))),
      error: () => undefined,
    });
  }
}
