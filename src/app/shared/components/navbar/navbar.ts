import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

@Component({
  selector: 'navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  private readonly msalService = inject(MsalService);
  private readonly allowedDashboardRoles = ['superAdmin', 'admin', 'operador'];

  isMenuOpen = false;

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  canAccessDashboard(): boolean {
    const account = this.msalService.instance.getActiveAccount();
    const roles = (account?.idTokenClaims?.['roles'] as Array<string>) ?? [];
    return roles.some((role) => this.allowedDashboardRoles.includes(role));
  }
}
