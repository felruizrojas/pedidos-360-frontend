import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  loginWithMicrosoft(): void {
    console.log('Redirigiendo al flujo de autenticación de Microsoft Entra ID...');
    // Aquí es donde más adelante inyectarás el servicio MSAL de Angular (@azure/msal-angular)
    // para abrir la ventana emergente o hacer el redirect oficial.
  }
}
