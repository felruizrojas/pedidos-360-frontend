import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  isMenuOpen = false;

  // 1. Añadimos el usuario simulado con su rol
  // Puedes cambiar 'admin' por 'user' para probar cómo se oculta el Dashboard
  currentUser = {
    name: 'Carlos Plaza',
    role: 'user'
  };

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  // 2. Añadimos la función para verificar permisos
  canAccessDashboard(): boolean {
    const allowedRoles = ['superAdmin', 'admin', 'operador'];
    return this.currentUser && allowedRoles.includes(this.currentUser.role);
  }
}
