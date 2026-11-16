import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  OnInit,
  WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
// Solo operadores que ya están en el bundle inicial (interval, fromEvent, merge o share sumarían ~6 kB al main,
// porque el barrel de rxjs vive ahí): el refresco usa setInterval y visibilitychange nativos.
import { Observable, Subject, catchError, filter, map, of, switchMap } from 'rxjs';
import { ApiError, esApiError } from '../../../core/models/api-error.model';
import {
  EstadosActivos,
  Kpis,
  LeadTime,
  OrdenTopParam,
  RangoReporte,
  TopProductos,
  VentasPorHora,
} from '../../../core/models/report.model';
import { ReportesService } from '../../../core/services/reportes';
import {
  formatearCLP,
  formatearEntero,
  formatearHora,
  formatearMinutos,
  formatearPorcentaje,
  haceCuanto,
} from '../../../core/utils/formato';
import { EstadosActivosComponent } from './components/estados-activos';
import { LeadTimeChart } from './components/lead-time-chart';
import { SalesChart } from './components/sales-chart';
import { TopProductsChart } from './components/top-products-chart';

/** Estado de un bloque: cada uno carga y falla por separado. */
export interface Bloque<T> {
  datos: T | null;
  error: ApiError | null;
  cargando: boolean;
}

export const INTERVALO_REFRESCO_MS = 30_000;
export const RANGO_POR_DEFECTO: RangoReporte = 'last24h';
export const RANGOS: readonly { valor: RangoReporte; etiqueta: string }[] = [
  { valor: 'today', etiqueta: 'Hoy' },
  { valor: 'last24h', etiqueta: 'Últimas 24 h' },
  { valor: 'last7d', etiqueta: '7 días' },
  { valor: 'last30d', etiqueta: '30 días' },
];
export const MENSAJE_NO_DISPONIBLE = 'La reportería no está disponible en este momento.';

const nuevoBloque = <T>(): Bloque<T> => ({ datos: null, error: null, cargando: true });

/**
 * /dashboard/reportes (solo Admin): panel de KPIs de ms-pedidos360-report (datos por streaming desde Kafka).
 * Rango y orden del top en query params (?rango=last7d&orden=monto). Se refresca solo cada 30 s mientras la
 * pestaña está visible y no está en pausa; deja de hacerlo al salir de la página.
 */
@Component({
  selector: 'app-reportes',
  imports: [SalesChart, LeadTimeChart, TopProductsChart, EstadosActivosComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reportes.html',
})
export class Reportes implements OnInit {
  private readonly reportes = inject(ReportesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly RANGOS = RANGOS;
  protected readonly rango = signal<RangoReporte>(this.leerRango());
  protected readonly orden = signal<OrdenTopParam>(this.route.snapshot.queryParamMap.get('orden') === 'monto' ? 'monto' : 'cantidad');
  protected readonly pausado = signal(false);

  protected readonly kpis = signal<Bloque<Kpis>>(nuevoBloque());
  protected readonly ventas = signal<Bloque<VentasPorHora>>(nuevoBloque());
  protected readonly leadTime = signal<Bloque<LeadTime>>(nuevoBloque());
  protected readonly top = signal<Bloque<TopProductos>>(nuevoBloque());
  protected readonly activos = signal<Bloque<EstadosActivos>>(nuevoBloque());

  /** Última respuesta de KPIs recibida (para "Actualizado hh:mm:ss"). */
  protected readonly actualizadoEn = signal<Date | null>(null);

  /** 'todo' recarga los 5 bloques; 'top' solo el top de productos (al cambiar el orden). */
  private readonly disparo$ = new Subject<'todo' | 'top'>();
  private temporizador: ReturnType<typeof setInterval> | null = null;
  private visible = true;

  protected readonly tarjetas = computed(() => {
    const k = this.kpis().datos;
    if (!k) {
      return [];
    }
    return [
      { titulo: 'Ventas', valor: formatearCLP(k.ventas.monto), ayuda: 'Pedidos aceptados que no se cancelaron' },
      { titulo: 'Pedidos con venta', valor: formatearEntero(k.ventas.cantidadPedidos), ayuda: null },
      { titulo: 'Ticket promedio', valor: formatearCLP(k.ventas.ticketPromedio), ayuda: null },
      { titulo: 'Pedidos creados', valor: formatearEntero(k.pedidosCreados), ayuda: null },
      { titulo: 'Entregados', valor: formatearEntero(k.pedidosEntregados), ayuda: null },
      { titulo: 'Cancelación', valor: formatearPorcentaje(k.tasaCancelacion), ayuda: 'De los pedidos creados en el rango' },
      { titulo: 'Clientes activos', valor: formatearEntero(k.clientesActivos), ayuda: 'Con al menos un pedido creado' },
      { titulo: 'Lead time promedio', valor: formatearMinutos(k.leadTime.promedioMin), ayuda: 'Creado → entregado' },
      { titulo: 'Lead time p90', valor: formatearMinutos(k.leadTime.p90Min), ayuda: `${k.leadTime.muestras} entregas` },
    ];
  });

  protected readonly estadoActualizacion = computed(() => {
    const actualizado = this.actualizadoEn();
    if (!actualizado) {
      return null;
    }
    const ultimo = this.kpis().datos?.ultimoEventoProcesadoEn ?? null;
    const evento = ultimo
      ? `último evento procesado ${haceCuanto(ultimo, actualizado.getTime())}`
      : 'aún no hay eventos procesados';
    return `Actualizado ${formatearHora(actualizado)} · ${evento}`;
  });

  constructor() {
    this.visible = this.document.visibilityState !== 'hidden';
    // Al ocultar la pestaña se detiene el refresco; al volver (sin pausa) se refresca de inmediato.
    const alCambiarVisibilidad = () => {
      const visible = this.document.visibilityState !== 'hidden';
      if (visible === this.visible) {
        return;
      }
      this.visible = visible;
      this.programarRefresco();
      if (visible && !this.pausado()) {
        this.disparo$.next('todo');
      }
    };
    this.document.addEventListener('visibilitychange', alCambiarVisibilidad);
    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      this.detenerRefresco();
    });

    const todo$ = this.disparo$.pipe(filter((d) => d === 'todo'));
    this.conectar(todo$, () => this.reportes.kpis(this.rango()), this.kpis, () => this.actualizadoEn.set(new Date()));
    this.conectar(todo$, () => this.reportes.ventasPorHora(this.rango()), this.ventas);
    this.conectar(todo$, () => this.reportes.leadTime(this.rango()), this.leadTime);
    this.conectar(this.disparo$, () => this.reportes.topProductos(this.rango(), this.orden()), this.top);
    this.conectar(todo$, () => this.reportes.estadosActivos(), this.activos);
  }

  ngOnInit(): void {
    this.programarRefresco();
    this.disparo$.next('todo');
  }

  protected cambiarRango(rango: RangoReporte): void {
    if (rango === this.rango()) {
      return;
    }
    this.rango.set(rango);
    this.actualizarUrl({ rango: rango === RANGO_POR_DEFECTO ? null : rango });
    this.disparo$.next('todo');
  }

  protected cambiarOrden(orden: OrdenTopParam): void {
    if (orden === this.orden()) {
      return;
    }
    this.orden.set(orden);
    this.actualizarUrl({ orden: orden === 'cantidad' ? null : orden });
    this.disparo$.next('top');
  }

  protected alternarPausa(): void {
    this.pausado.update((p) => !p);
    this.programarRefresco();
  }

  protected recargar(): void {
    this.disparo$.next('todo');
  }

  /** Refresco automático cada 30 s, solo con la pestaña visible y sin pausa. */
  private programarRefresco(): void {
    this.detenerRefresco();
    if (!this.pausado() && this.visible) {
      this.temporizador = setInterval(() => this.disparo$.next('todo'), INTERVALO_REFRESCO_MS);
    }
  }

  private detenerRefresco(): void {
    if (this.temporizador !== null) {
      clearInterval(this.temporizador);
      this.temporizador = null;
    }
  }

  protected mensajeError(error: ApiError): string {
    return error.status === 0 || error.status >= 500 ? MENSAJE_NO_DISPONIBLE : error.mensaje;
  }

  /** Cada bloque se pide y se maneja por separado: el error de uno no afecta a los demás. */
  private conectar<T>(
    disparo$: Observable<unknown>,
    peticion: () => Observable<T>,
    estado: WritableSignal<Bloque<T>>,
    alCargar?: (datos: T) => void,
  ): void {
    disparo$
      .pipe(
        switchMap(() => {
          estado.update((b) => ({ ...b, cargando: true }));
          return peticion().pipe(
            map((datos) => ({ datos, error: null })),
            catchError((e: unknown) =>
              of({ datos: null, error: esApiError(e) ? e : { status: 0, mensaje: MENSAJE_NO_DISPONIBLE } }),
            ),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((r) => {
        estado.set({ datos: r.datos, error: r.error, cargando: false });
        if (r.datos !== null) {
          alCargar?.(r.datos);
        }
      });
  }

  private leerRango(): RangoReporte {
    const valor = this.route.snapshot.queryParamMap.get('rango');
    return RANGOS.some((r) => r.valor === valor) ? (valor as RangoReporte) : RANGO_POR_DEFECTO;
  }

  private actualizarUrl(queryParams: Record<string, string | null>): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
