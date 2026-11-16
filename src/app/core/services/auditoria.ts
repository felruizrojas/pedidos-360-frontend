import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EventoAuditoria,
  EventoAuditoriaDetalle,
  FiltrosAuditoria,
  FiltrosMensajesFallidos,
  MensajeFallido,
  MensajeFallidoDetalle,
  PaginaAuditoria,
  ResumenAuditoria,
  TipoEvento,
} from '../models/audit.model';
import { paramsSinVacios } from '../utils/http-params';

/** Timeline de auditoría a través del BFF (/api/audit, Admin o Auditor). Solo lectura. */
@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/audit`;

  eventos(filtros: FiltrosAuditoria = {}): Observable<PaginaAuditoria<EventoAuditoria>> {
    return this.http.get<PaginaAuditoria<EventoAuditoria>>(`${this.apiUrl}/events`, {
      params: paramsSinVacios({ ...filtros }),
    });
  }

  evento(eventId: string): Observable<EventoAuditoriaDetalle> {
    return this.http.get<EventoAuditoriaDetalle>(`${this.apiUrl}/events/${encodeURIComponent(eventId)}`);
  }

  /** Más antiguo primero; 404 si el pedido no tiene eventos. */
  timelinePedido(pedidoId: number | string): Observable<EventoAuditoria[]> {
    return this.http.get<EventoAuditoria[]>(`${this.apiUrl}/orders/${encodeURIComponent(pedidoId)}/timeline`);
  }

  timelineActor(
    actorId: string,
    filtros: Pick<FiltrosAuditoria, 'desde' | 'hasta' | 'page' | 'size'> = {},
  ): Observable<PaginaAuditoria<EventoAuditoria>> {
    return this.http.get<PaginaAuditoria<EventoAuditoria>>(
      `${this.apiUrl}/actors/${encodeURIComponent(actorId)}/timeline`,
      { params: paramsSinVacios({ ...filtros }) },
    );
  }

  tiposEvento(): Observable<TipoEvento[]> {
    return this.http.get<TipoEvento[]>(`${this.apiUrl}/event-types`);
  }

  /** Sin rango: últimas 24 h (lo decide audit). */
  resumen(desde?: string | null, hasta?: string | null): Observable<ResumenAuditoria> {
    return this.http.get<ResumenAuditoria>(`${this.apiUrl}/summary`, { params: paramsSinVacios({ desde, hasta }) });
  }

  mensajesFallidos(filtros: FiltrosMensajesFallidos = {}): Observable<PaginaAuditoria<MensajeFallido>> {
    return this.http.get<PaginaAuditoria<MensajeFallido>>(`${this.apiUrl}/dead-letters`, {
      params: paramsSinVacios({ ...filtros }),
    });
  }

  mensajeFallido(id: number): Observable<MensajeFallidoDetalle> {
    return this.http.get<MensajeFallidoDetalle>(`${this.apiUrl}/dead-letters/${id}`);
  }
}
