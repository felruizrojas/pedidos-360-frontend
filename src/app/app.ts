import { Component, afterNextRender, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MsalService } from '@azure/msal-angular';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Navbar } from './shared/components/navbar/navbar';
import { Footer } from './shared/components/footer/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navbar, Footer], // Limpio y 100% Standalone
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly router = inject(Router);
  private readonly msalService = inject(MsalService);

  private readonly rutasProtegidas = ['/dashboard', '/catalogo'];

  constructor() {
    // Al volver con "Atrás" el navegador puede restaurar la página congelada (bfcache) sin volver a
    // ejecutar los guards. Si eso pasa sin sesión activa (p. ej. tras cerrar sesión), se expulsa al login.
    afterNextRender(() => {
      window.addEventListener('pageshow', (event) => {
        const sinSesion = !this.msalService.instance.getActiveAccount();
        const enRutaProtegida = this.rutasProtegidas.some((ruta) => this.router.url.startsWith(ruta));
        if (event.persisted && sinSesion && enRutaProtegida) {
          this.router.navigate(['/login']);
        }
      });
    });
  }

  // La administración (/dashboard) tiene su propio menú vertical, así que oculta la navbar pública.
  protected readonly enAdmin = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.startsWith('/dashboard')),
    ),
    { initialValue: false },
  );
}
