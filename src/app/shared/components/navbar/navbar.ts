import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { getUserRoles } from '../../../core/utils/user-roles';

@Component({
  selector: 'navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  private readonly msalService = inject(MsalService);
  private readonly allowedDashboardRoles = ['Admin', 'Operador'];

  isMenuOpen = false;

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  canAccessDashboard(): boolean {
    const account = this.msalService.instance.getActiveAccount();
    const roles = getUserRoles(account);
    return roles.some((role) => this.allowedDashboardRoles.includes(role));
  }

  userName(): string | null {
    const account = this.msalService.instance.getActiveAccount();
    return account?.name?.split(' ')[0] ?? null; // solo el primer nombre
  }
}
