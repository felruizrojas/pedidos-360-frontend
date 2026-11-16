import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { AuditoriaDlt } from './components/auditoria-dlt';
import { AuditoriaEventos, FiltrosEventos } from './components/auditoria-eventos';
import { AuditoriaTimeline } from './components/auditoria-timeline';

export type PestanaAuditoria = 'eventos' | 'timeline' | 'dlt';

const PESTANAS: readonly { id: PestanaAuditoria; etiqueta: string }[] = [
  { id: 'eventos', etiqueta: 'Eventos' },
  { id: 'timeline', etiqueta: 'Timeline de pedido' },
  { id: 'dlt', etiqueta: 'Mensajes fallidos (DLT)' },
];

/** Query params que pertenecen a cada pestaña (se limpian al cambiar de una a otra). */
const PARAMS_EVENTOS = ['usuario', 'accion', 'desde', 'hasta', 'numero', 'pagina'];

function leerEntero(params: ParamMap, nombre: string): number {
  const n = Number(params.get(nombre));
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/**
 * /dashboard/auditoria (Admin y Auditor): timeline de ms-pedidos360-audit. Solo lectura. La pestaña y los filtros
 * viven en los query params (?tab=eventos&usuario=…&accion=A&accion=B&desde=…&pagina=2, ?tab=timeline&pedido=42,
 * ?tab=dlt&paginaDlt=2): la URL se puede compartir o recargar.
 */
@Component({
  selector: 'app-auditoria',
  imports: [AuditoriaEventos, AuditoriaTimeline, AuditoriaDlt],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-7xl space-y-6">
      <div class="space-y-1">
        <h1 class="text-3xl font-extrabold tracking-tight text-gray-900">Auditoría</h1>
        <p class="text-gray-600">Quién hizo qué, cuándo y desde dónde. Solo lectura.</p>
      </div>

      <div role="tablist" aria-label="Secciones de auditoría" class="flex flex-wrap gap-1 border-b border-gray-200">
        @for (p of pestanas; track p.id) {
          <button type="button" role="tab" [id]="'tab-' + p.id" [attr.aria-selected]="pestana() === p.id"
            [attr.aria-controls]="'panel-' + p.id" [attr.tabindex]="pestana() === p.id ? 0 : -1"
            (click)="irA(p.id)"
            class="px-4 py-2 -mb-px text-sm font-medium border-b-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-indigo-600"
            [class]="pestana() === p.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-600 hover:text-indigo-700'">
            {{ p.etiqueta }}
          </button>
        }
      </div>

      <div role="tabpanel" [id]="'panel-' + pestana()" [attr.aria-labelledby]="'tab-' + pestana()">
        @switch (pestana()) {
          @case ('eventos') {
            <app-auditoria-eventos [filtros]="filtrosEventos()" (filtrosCambio)="aplicarFiltros($event)"
              (verTimeline)="verTimeline($event)" />
          }
          @case ('timeline') {
            <app-auditoria-timeline [pedido]="pedido()" (pedidoCambio)="verTimeline($event)" (verActor)="verActor($event)" />
          }
          @case ('dlt') {
            <app-auditoria-dlt [pagina]="paginaDlt()" (paginaCambio)="navegar({ paginaDlt: $event > 1 ? $event : null })" />
          }
        }
      </div>
    </div>
  `,
})
export class Auditoria {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  protected readonly pestanas = PESTANAS;
  protected readonly pestana = computed<PestanaAuditoria>(() => {
    const tab = this.params().get('tab');
    return PESTANAS.some((p) => p.id === tab) ? (tab as PestanaAuditoria) : 'eventos';
  });
  protected readonly filtrosEventos = computed<FiltrosEventos>(() => {
    const p = this.params();
    return {
      usuario: p.get('usuario') ?? '',
      acciones: p.getAll('accion'),
      desde: p.get('desde') ?? '',
      hasta: p.get('hasta') ?? '',
      numero: p.get('numero') ?? '',
      pagina: leerEntero(p, 'pagina'),
    };
  });
  protected readonly pedido = computed(() => this.params().get('pedido'));
  protected readonly paginaDlt = computed(() => leerEntero(this.params(), 'paginaDlt'));

  protected irA(pestana: PestanaAuditoria): void {
    if (pestana !== this.pestana()) {
      this.navegar({ tab: pestana === 'eventos' ? null : pestana }, true);
    }
  }

  protected aplicarFiltros(f: FiltrosEventos): void {
    this.navegar({
      usuario: f.usuario || null,
      accion: f.acciones.length ? f.acciones : null,
      desde: f.desde || null,
      hasta: f.hasta || null,
      numero: f.numero || null,
      pagina: f.pagina > 1 ? f.pagina : null,
    });
  }

  protected verTimeline(pedido: string | null): void {
    this.navegar({ tab: 'timeline', pedido: pedido || null }, true);
  }

  /** Desde el timeline: la pestaña Eventos filtrada por ese usuario. */
  protected verActor(actorId: string): void {
    this.navegar({ tab: null, usuario: actorId }, true);
  }

  protected navegar(cambios: Record<string, string | string[] | number | null>, limpiar = false): void {
    // Al cambiar de pestaña se parte de cero: los filtros de una no ensucian la URL de otra.
    const base: Record<string, string | string[] | number | null> = limpiar
      ? Object.fromEntries([...PARAMS_EVENTOS, 'pedido', 'paginaDlt', 'tab'].map((k) => [k, null]))
      : {};
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...base, ...cambios },
      queryParamsHandling: 'merge',
    });
  }
}
