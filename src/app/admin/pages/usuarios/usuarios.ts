import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ApiError, esApiError } from '../../../core/models/api-error.model';
import { Usuario } from '../../../core/models/usuario.model';
import { UsuariosService } from '../../../core/services/usuarios';

/**
 * /dashboard/usuarios (solo Admin): usuarios de Entra ID con su rol y si iniciaron sesión. Solo lectura.
 * Los filtros se aplican en el navegador al cambiar (la lista completa ya viene del BFF).
 */
@Component({
  selector: 'app-usuarios',
  imports: [DatePipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './usuarios.html',
})
export class Usuarios implements OnInit {
  private readonly usuariosService = inject(UsuariosService);

  protected readonly ROLES = ['Admin', 'Operador', 'Cliente'];
  protected readonly filtrosForm = inject(FormBuilder).nonNullable.group({ rol: '', estado: '' });
  private readonly filtros = toSignal(this.filtrosForm.valueChanges, { initialValue: this.filtrosForm.getRawValue() });

  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<ApiError | null>(null);
  /** Fila con el detalle abierto (una a la vez). */
  protected readonly abiertoId = signal<string | null>(null);

  protected readonly hayFiltros = computed(() => !!this.filtros().rol || !!this.filtros().estado);
  protected readonly filtrados = computed(() => {
    const { rol, estado } = this.filtros();
    return this.usuarios().filter(
      (u) =>
        (!rol || u.roles.includes(rol)) &&
        (!estado || (estado === 'activo') === u.activo),
    );
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.usuariosService.obtenerUsuarios().subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(esApiError(e) ? e : { status: 0, mensaje: 'No se pudieron cargar los usuarios.' });
        this.cargando.set(false);
      },
    });
  }

  protected limpiarFiltros(): void {
    this.filtrosForm.reset();
  }

  protected alternarDetalle(id: string): void {
    this.abiertoId.update((actual) => (actual === id ? null : id));
  }
}
