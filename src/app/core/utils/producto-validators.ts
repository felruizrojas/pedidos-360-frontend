import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Reglas de validación del formulario "Nuevo producto" (catálogo del dashboard).
 * Centralizadas acá para que el componente y sus mensajes de error usen
 * siempre los mismos límites (single source of truth).
 */

export const NOMBRE_MAX_LENGTH = 25;
export const DESCRIPCION_MAX_LENGTH = 50;

/**
 * Tope de precio (CLP, sin decimales): 999.999.999. Es un límite generoso para
 * cualquier producto real, pero bloquea entradas absurdas (p. ej. 30 dígitos)
 * que no tienen sentido de negocio y que además pueden perder precisión al
 * representarse como number en JS o desbordar el rango esperado en el backend.
 */
export const PRECIO_MAX = 999_999_999;

/**
 * Tope de stock: 100.000 unidades. Cubre inventarios grandes sin permitir
 * cifras que claramente son un error de digitación.
 */
export const STOCK_MAX = 100_000;

/** Solo letras (con tildes/ñ) y espacios: sin números ni símbolos. */
export const NOMBRE_PATTERN = /^[A-Za-zÁÉÍÓÚÑÜáéíóúñü\s]*$/;

/** Letras, números y espacios: sin símbolos especiales. */
export const DESCRIPCION_PATTERN = /^[A-Za-zÁÉÍÓÚÑÜáéíóúñü0-9\s]*$/;

/** Enteros positivos sin signo ni decimales (para precio/stock). */
export const ENTERO_POSITIVO_PATTERN = /^\d+$/;

/** Normaliza un nombre de producto para comparar duplicados (espacios + mayúsculas no cuentan). */
export function normalizarNombreProducto(nombre: string): string {
  return nombre.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Valida que el nombre no coincida (ignorando mayúsculas/espacios) con el de un
 * producto ya existente en el catálogo. `obtenerNombresExistentes` se evalúa en
 * cada corrida del validador, así que siempre compara contra la lista actual.
 */
export function nombreDuplicadoValidator(obtenerNombresExistentes: () => string[]): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const valor = normalizarNombreProducto(control.value ?? '');
    if (!valor) return null;
    return obtenerNombresExistentes().includes(valor) ? { duplicado: true } : null;
  };
}
