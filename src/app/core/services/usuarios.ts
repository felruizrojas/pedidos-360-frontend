import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Usuario } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/users`;

  /** Usuarios de Entra ID con rol en la app (solo Admin). Solo lectura. */
  obtenerUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl);
  }

  /** Marca en el BFF que el usuario inició sesión (lo deja "Activo" en la vista de usuarios). */
  registrarInicioSesion(): Observable<unknown> {
    return this.http.get(`${this.apiUrl}/me`);
  }
}
