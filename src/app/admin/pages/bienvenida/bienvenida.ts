import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { forkJoin } from 'rxjs';
import { ResumenAuditoria } from '../../../core/models/audit.model';
import { EstadoPedido, Pedido } from '../../../core/models/pedido.model';
import { Kpis } from '../../../core/models/report.model';
import { AuditoriaService } from '../../../core/services/auditoria';
import { AuthState } from '../../../core/services/auth-state';
import { PedidosService } from '../../../core/services/pedidos';
import { ReportesService } from '../../../core/services/reportes';
import { etiquetaAccion } from '../../../core/utils/acciones-auditoria';
import { formatearCLP, formatearEntero, formatearFechaHora, formatearMinutos } from '../../../core/utils/formato';
import { getNombre } from '../../../core/utils/user-profile';
import { EstadoPedidoBadge } from '../../../shared/components/estado-pedido-badge/estado-pedido-badge';
import { EntradaMenu, entradasVisibles, rutaDe } from '../../admin-menu';

/** Bloque opcional del inicio: si su servicio falla, la bienvenida se muestra igual con un aviso discreto. */
interface Bloque<T> {
  datos: T | null;
  fallo: boolean;
}

interface GrupoPedidos {
  total: number;
  pedidos: Pedido[];
}

const EN_CURSO: EstadoPedido[] = ['ACEPTADO', 'EN_PREPARACION', 'DESPACHADO'];
const CANTIDAD = 5;

/**
 * Inicio del dashboard ("Dashboard principal" del PDF), según el rol:
 * - Admin: KPIs de hoy (ventas, pedidos activos, clientes activos, lead time) y resumen de auditoría de 24 h.
 * - Operador: pedidos pendientes de aceptar y en curso (los 5 más recientes de cada grupo).
 * - Auditor: resumen de auditoría de 24 h.
 * Además, una tarjeta por cada sección del menú que el rol puede abrir (admin-menu.ts).
 */
@Component({
  selector: 'app-bienvenida',
  imports: [RouterLink, EstadoPedidoBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bienvenida.html',
})
export class Bienvenida implements OnInit {
  private readonly msalService = inject(MsalService);
  private readonly authState = inject(AuthState);
  private readonly reportes = inject(ReportesService);
  private readonly auditoria = inject(AuditoriaService);
  private readonly pedidosService = inject(PedidosService);

  protected readonly nombre = getNombre(this.msalService.instance.getActiveAccount()) || null;
  /** Las secciones visibles para el usuario, sin "Inicio" (es esta página). */
  protected readonly secciones = computed(() =>
    entradasVisibles(this.authState.roles()).filter((e) => e.segmento !== ''),
  );
  protected readonly ruta = (entrada: EntradaMenu) => rutaDe(entrada);

  protected readonly esAdmin = computed(() => this.authState.roles().includes('Admin'));
  protected readonly esOperador = computed(() => this.authState.roles().includes('Operador'));
  protected readonly veAuditoria = computed(() => this.authState.roles().some((r) => r === 'Admin' || r === 'Auditor'));

  protected readonly kpis = signal<Bloque<Kpis> | null>(null);
  protected readonly resumen = signal<Bloque<ResumenAuditoria> | null>(null);
  protected readonly pendientes = signal<Bloque<GrupoPedidos> | null>(null);
  protected readonly enCurso = signal<GrupoPedidos | null>(null);

  protected readonly gruposOperador = computed(() => [
    { id: 'pendientes', titulo: 'Pendientes de aceptar', grupo: this.pendientes()?.datos ?? null },
    { id: 'en-curso', titulo: 'En curso', grupo: this.enCurso() },
  ]);

  protected readonly tarjetasKpi = computed(() => {
    const k = this.kpis()?.datos;
    return k
      ? [
          { titulo: 'Ventas de hoy', valor: formatearCLP(k.ventas.monto) },
          { titulo: 'Pedidos activos', valor: formatearEntero(k.totalActivos) },
          { titulo: 'Clientes activos', valor: formatearEntero(k.clientesActivos) },
          { titulo: 'Lead time promedio', valor: formatearMinutos(k.leadTime.promedioMin) },
        ]
      : [];
  });

  protected readonly fecha = formatearFechaHora;
  protected readonly clp = formatearCLP;
  protected readonly etiquetaAccion = etiquetaAccion;

  async ngOnInit(): Promise<void> {
    // Los roles llegan del access token de forma asíncrona: se espera a tenerlos antes de pedir nada.
    const roles = await this.authState.cargarRoles();
    if (roles.includes('Admin')) {
      this.cargarKpis();
    }
    if (roles.includes('Admin') || roles.includes('Auditor')) {
      this.cargarResumen();
    }
    if (roles.includes('Operador')) {
      this.cargarPedidos();
    }
  }

  private cargarKpis(): void {
    this.reportes.kpis('today').subscribe({
      next: (datos) => this.kpis.set({ datos, fallo: false }),
      error: () => this.kpis.set({ datos: null, fallo: true }),
    });
  }

  private cargarResumen(): void {
    this.auditoria.resumen().subscribe({
      next: (datos) => this.resumen.set({ datos, fallo: false }),
      error: () => this.resumen.set({ datos: null, fallo: true }),
    });
  }

  /** orders filtra por UN estado: una llamada chica por estado, en paralelo. */
  private cargarPedidos(): void {
    forkJoin([
      this.pedidosService.listarPedidos({ estado: 'CREADO', size: CANTIDAD }),
      ...EN_CURSO.map((estado) => this.pedidosService.listarPedidos({ estado, size: CANTIDAD })),
    ]).subscribe({
      next: ([creados, ...enCurso]) => {
        this.pendientes.set({ datos: { total: creados.totalElementos, pedidos: creados.contenido }, fallo: false });
        this.enCurso.set({
          total: enCurso.reduce((s, p) => s + p.totalElementos, 0),
          pedidos: enCurso
            .flatMap((p) => p.contenido)
            .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
            .slice(0, CANTIDAD),
        });
      },
      error: () => this.pendientes.set({ datos: null, fallo: true }),
    });
  }
}
