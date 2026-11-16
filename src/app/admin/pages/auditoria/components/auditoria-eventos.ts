import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, filter, map, of, switchMap } from 'rxjs';
import { ApiError } from '../../../../core/models/api-error.model';
import {
  EventoAuditoria,
  EventoAuditoriaDetalle,
  FiltrosAuditoria,
  PaginaAuditoria,
  ResumenAuditoria,
  TipoEvento,
} from '../../../../core/models/audit.model';
import { AuditoriaService } from '../../../../core/services/auditoria';
import { clasesAccion, etiquetaAccion } from '../../../../core/utils/acciones-auditoria';
import { formatearFechaHora } from '../../../../core/utils/formato';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { TAMANO_PAGINA, aApiError, finDelDia, inicioDelDia, mensajeAuditoria } from '../auditoria-util';

/** Filtros de la pestaña tal como van en la URL (fechas "yyyy-MM-dd", página 1-based). */
export interface FiltrosEventos {
  usuario: string;
  acciones: string[];
  desde: string;
  hasta: string;
  /** Nº de pedido (entityId de una entidad PEDIDO). */
  numero: string;
  pagina: number;
}

export const FILTROS_VACIOS: FiltrosEventos = { usuario: '', acciones: [], desde: '', hasta: '', numero: '', pagina: 1 };

interface Estado<T> {
  datos: T | null;
  error: ApiError | null;
  cargando: boolean;
}

/** Filtros de la URL → query de GET /api/audit/events. */
export function aQuery(f: FiltrosEventos): FiltrosAuditoria {
  return {
    usuario: f.usuario.trim() || null,
    accion: f.acciones,
    entityType: f.numero ? 'PEDIDO' : null,
    entityId: f.numero.trim() || null,
    desde: inicioDelDia(f.desde || null),
    hasta: finDelDia(f.hasta || null),
    page: f.pagina - 1,
    size: TAMANO_PAGINA,
  };
}

/** Pestaña "Eventos": filtros del PDF (usuario, tipo de evento, fechas, pedido), resumen, tabla y detalle. */
@Component({
  selector: 'app-auditoria-eventos',
  imports: [ReactiveFormsModule, Pagination],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './auditoria-eventos.html',
})
export class AuditoriaEventos {
  private readonly auditoria = inject(AuditoriaService);

  readonly filtros = input.required<FiltrosEventos>();
  readonly filtrosCambio = output<FiltrosEventos>();
  readonly verTimeline = output<string>();

  protected readonly form = inject(FormBuilder).nonNullable.group({
    usuario: '',
    acciones: [[] as string[]],
    desde: '',
    hasta: '',
    numero: '',
  });

  protected readonly tipos = signal<TipoEvento[]>([]);
  protected readonly eventos = signal<Estado<PaginaAuditoria<EventoAuditoria>>>({ datos: null, error: null, cargando: true });
  protected readonly resumen = signal<ResumenAuditoria | null>(null);
  protected readonly seleccionado = signal<string | null>(null);
  protected readonly detalle = signal<Estado<EventoAuditoriaDetalle>>({ datos: null, error: null, cargando: false });
  protected readonly copiado = signal(false);

  protected readonly tamanoPagina = TAMANO_PAGINA;
  protected readonly fecha = formatearFechaHora;
  protected readonly etiqueta = etiquetaAccion;
  protected readonly clases = clasesAccion;
  protected readonly mensaje = mensajeAuditoria;

  constructor() {
    // El formulario refleja la URL (al llegar con filtros, al usar "atrás" o al venir desde el timeline).
    effect(() => {
      const { pagina: _pagina, ...valores } = this.filtros();
      this.form.setValue(valores, { emitEvent: false });
    });

    const filtros$ = toObservable(this.filtros);
    filtros$
      .pipe(
        switchMap((f) => {
          this.eventos.update((e) => ({ ...e, cargando: true }));
          return this.auditoria.eventos(aQuery(f)).pipe(
            map((datos) => ({ datos, error: null })),
            catchError((e: unknown) => of({ datos: null, error: aApiError(e) })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((r) => this.eventos.set({ ...r, cargando: false }));

    // Resumen del rango filtrado (sin fechas: últimas 24 h); solo se vuelve a pedir si cambia el rango (no al
    // paginar ni al cambiar otros filtros). Si falla, simplemente no se muestra.
    let rangoAnterior: string | null = null;
    filtros$
      .pipe(
        map((f) => `${f.desde}|${f.hasta}`),
        filter((clave) => {
          const cambio = clave !== rangoAnterior;
          rangoAnterior = clave;
          return cambio;
        }),
        switchMap((clave) => {
          const [desde, hasta] = clave.split('|');
          return this.auditoria.resumen(inicioDelDia(desde || null), finDelDia(hasta || null)).pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((r) => this.resumen.set(r));

    this.auditoria
      .tiposEvento()
      .pipe(catchError(() => of([] as TipoEvento[])), takeUntilDestroyed())
      .subscribe((t) => this.tipos.set(t));
  }

  protected alternarAccion(accion: string): void {
    const actuales = this.form.controls.acciones.value;
    this.form.controls.acciones.setValue(
      actuales.includes(accion) ? actuales.filter((a) => a !== accion) : [...actuales, accion],
    );
  }

  protected buscar(): void {
    this.filtrosCambio.emit({ ...this.form.getRawValue(), pagina: 1 });
  }

  protected limpiar(): void {
    this.form.reset();
    this.filtrosCambio.emit(FILTROS_VACIOS);
  }

  protected irAPagina(pagina: number): void {
    this.filtrosCambio.emit({ ...this.filtros(), pagina });
  }

  protected abrir(eventId: string): void {
    if (this.seleccionado() === eventId) {
      this.seleccionado.set(null);
      return;
    }
    this.seleccionado.set(eventId);
    this.copiado.set(false);
    this.detalle.set({ datos: null, error: null, cargando: true });
    this.auditoria.evento(eventId).subscribe({
      next: (datos) => this.detalle.set({ datos, error: null, cargando: false }),
      error: (e: unknown) => this.detalle.set({ datos: null, error: aApiError(e), cargando: false }),
    });
  }

  protected json(payload: unknown): string {
    return typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  }

  protected copiar(texto: string): void {
    navigator.clipboard?.writeText(texto).then(
      () => this.copiado.set(true),
      () => this.copiado.set(false),
    );
  }
}
