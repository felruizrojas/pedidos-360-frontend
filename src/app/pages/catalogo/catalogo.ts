import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { Producto } from '../../core/models/producto.model';
import { CatalogoService } from '../../core/services/catalogo';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class Catalogo {
  private readonly catalogoService = inject(CatalogoService);

  productos = toSignal(
    this.catalogoService.obtenerProductos().pipe(
      catchError((error) => {
        console.error('Error al obtener los productos:', error);
        return of<Producto[]>([]);
      })
    ),
    { initialValue: [] as Producto[] }
  );
}
