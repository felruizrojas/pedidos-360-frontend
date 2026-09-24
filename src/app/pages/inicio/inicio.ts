import { AfterViewInit, Component, ElementRef, viewChild } from '@angular/core';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class Inicio implements AfterViewInit {
  private readonly heroVideo = viewChild.required<ElementRef<HTMLVideoElement>>('heroVideo');

  ngAfterViewInit(): void {
    // Refuerzo del autoplay: aseguramos el silencio y lanzamos play() a mano. Si el navegador
    // igual lo rechaza, se ignora; el video es solo decorativo.
    const video = this.heroVideo().nativeElement;
    video.muted = true;
    video.play().catch(() => {});
  }
}
