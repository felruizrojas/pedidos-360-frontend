/** Formatos de presentación en es-CL (montos, duraciones y fechas). Devuelven "—" si no hay valor. */

const SIN_VALOR = '—';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });
const ENTERO = new Intl.NumberFormat('es-CL');
const FECHA_HORA = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const HORA = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** $1.990 (CLP no usa decimales). */
export function formatearCLP(monto: number | null | undefined): string {
  return monto === null || monto === undefined ? SIN_VALOR : CLP.format(monto);
}

export function formatearEntero(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? SIN_VALOR : ENTERO.format(valor);
}

/** 25.5 → "25,5 %". */
export function formatearPorcentaje(valor: number | null | undefined): string {
  return valor === null || valor === undefined
    ? SIN_VALOR
    : `${valor.toLocaleString('es-CL', { maximumFractionDigits: 1 })} %`;
}

/** Minutos → "45 min", "1 h 25 min", "2 h", "1 d 3 h". Menos de 1 minuto → "< 1 min". */
export function formatearMinutos(minutos: number | null | undefined): string {
  if (minutos === null || minutos === undefined || Number.isNaN(minutos)) {
    return SIN_VALOR;
  }
  if (minutos < 1) {
    return '< 1 min';
  }
  const total = Math.round(minutos);
  const dias = Math.floor(total / 1440);
  const horas = Math.floor((total % 1440) / 60);
  const mins = total % 60;
  if (dias > 0) {
    return horas > 0 ? `${dias} d ${horas} h` : `${dias} d`;
  }
  if (horas > 0) {
    return mins > 0 ? `${horas} h ${mins} min` : `${horas} h`;
  }
  return `${mins} min`;
}

/** "13-11-2026, 14:03" en la zona del navegador. */
export function formatearFechaHora(iso: string | Date | null | undefined): string {
  if (!iso) {
    return SIN_VALOR;
  }
  const fecha = iso instanceof Date ? iso : new Date(iso);
  return Number.isNaN(fecha.getTime()) ? SIN_VALOR : FECHA_HORA.format(fecha);
}

/** "14:03:21". */
export function formatearHora(fecha: Date | string | null | undefined): string {
  if (!fecha) {
    return SIN_VALOR;
  }
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  return Number.isNaN(d.getTime()) ? SIN_VALOR : HORA.format(d);
}

/** "hace un momento", "hace 5 min", "hace 2 h", "hace 3 d". */
export function haceCuanto(iso: string | Date | null | undefined, ahora: number = Date.now()): string {
  if (!iso) {
    return SIN_VALOR;
  }
  const t = (iso instanceof Date ? iso : new Date(iso)).getTime();
  if (Number.isNaN(t)) {
    return SIN_VALOR;
  }
  const minutos = Math.floor(Math.max(0, ahora - t) / 60_000);
  if (minutos < 1) {
    return 'hace un momento';
  }
  if (minutos < 60) {
    return `hace ${minutos} min`;
  }
  const horas = Math.floor(minutos / 60);
  return horas < 24 ? `hace ${horas} h` : `hace ${Math.floor(horas / 24)} d`;
}
