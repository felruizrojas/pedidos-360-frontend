import { NgComponentOutlet } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Type, computed, effect, inject, signal, viewChild } from '@angular/core';
import { AuthState } from '../../core/services/auth-state';

@Component({
  selector: 'app-inicio',
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class Inicio implements AfterViewInit {
  private readonly heroVideo = viewChild.required<ElementRef<HTMLVideoElement>>('heroVideo');
  private readonly authState = inject(AuthState);
  /** Solo el Cliente ve "Tus últimos pedidos"; para el resto la landing queda igual (sin llamadas al backend). */
  protected readonly esCliente = computed(() => this.authState.estaLogueado() && this.authState.roles().includes('Cliente'));
  /**
   * "Tus últimos pedidos" se descarga solo para un Cliente (import() dinámico). No se usa @defer porque Inicio
   * está en el bundle inicial y @defer sumaría ~6 kB de runtime a todos los visitantes.
   */
  protected readonly ultimosPedidos = signal<Type<unknown> | null>(null);

  constructor() {
    effect(() => {
      if (this.esCliente() && !this.ultimosPedidos()) {
        void import('./ultimos-pedidos').then((m) => this.ultimosPedidos.set(m.UltimosPedidos));
      }
    });
  }

  ngAfterViewInit(): void {
    // Refuerzo del autoplay: aseguramos el silencio y lanzamos play() a mano. Si el navegador
    // igual lo rechaza, se ignora; el video es solo decorativo.
    const video = this.heroVideo().nativeElement;
    video.muted = true;
    video.play()?.catch(() => {}); // ?. : jsdom (tests) no implementa play() y devuelve undefined
  }
}
