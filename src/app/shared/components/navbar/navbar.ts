import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthState } from '../../../core/services/auth-state';
import { CarritoService } from '../../../core/services/carrito';
import { puedeCrearPedidos } from '../../../core/utils/estados-pedido';

@Component({
  selector: 'navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  // Signal-based: se actualiza solo si la sesión cambia en otra pestaña (ver AuthState),
  // sin depender de que el usuario navegue o interactúe en esta para refrescar.
  private readonly authState = inject(AuthState);
  private readonly allowedDashboardRoles = ['Admin', 'Operador'];
  private readonly allowedPedidosRoles = ['Admin', 'Operador', 'Cliente'];
  private readonly carrito = inject(CarritoService);

  isMenuOpen = false;

  readonly canAccessDashboard = computed(() =>
    this.authState.roles().some((role) => this.allowedDashboardRoles.includes(role)),
  );

  readonly canAccessPedidos = computed(() =>
    this.authState.roles().some((role) => this.allowedPedidosRoles.includes(role)),
  );

  /** El carrito solo aplica a quien puede crear pedidos (Cliente y Operador). */
  readonly canUseCarrito = computed(() => puedeCrearPedidos(this.authState.roles()));
  readonly cantidadCarrito = this.carrito.cantidadTotal;

  readonly userName = computed(() => this.authState.nombre() || null);

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }
}
