import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthState } from '../../../core/services/auth-state';

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

  isMenuOpen = false;

  readonly canAccessDashboard = computed(() =>
    this.authState.roles().some((role) => this.allowedDashboardRoles.includes(role)),
  );

  readonly userName = computed(() => this.authState.nombre() || null);

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }
}
