import { formatearCLP, formatearMinutos, formatearPorcentaje, haceCuanto } from './formato';

describe('formato', () => {
  it('CLP sin decimales con separador de miles', () => {
    const texto = formatearCLP(15990);
    expect(texto.startsWith('$')).toBe(true);
    expect(texto.replace(/\s/g, '')).toBe('$15.990');
    expect(formatearCLP(null)).toBe('—');
  });

  it('minutos legibles', () => {
    expect(formatearMinutos(0.4)).toBe('< 1 min');
    expect(formatearMinutos(45)).toBe('45 min');
    expect(formatearMinutos(85)).toBe('1 h 25 min');
    expect(formatearMinutos(120)).toBe('2 h');
    expect(formatearMinutos(1500)).toBe('1 d 1 h');
    expect(formatearMinutos(null)).toBe('—');
  });

  it('porcentaje con coma decimal', () => {
    expect(formatearPorcentaje(33.3)).toBe('33,3 %');
    expect(formatearPorcentaje(null)).toBe('—');
  });

  it('hace cuánto', () => {
    const ahora = Date.parse('2026-11-13T15:00:00Z');
    expect(haceCuanto('2026-11-13T14:59:40Z', ahora)).toBe('hace un momento');
    expect(haceCuanto('2026-11-13T14:55:00Z', ahora)).toBe('hace 5 min');
    expect(haceCuanto('2026-11-13T12:00:00Z', ahora)).toBe('hace 3 h');
    expect(haceCuanto('2026-11-10T15:00:00Z', ahora)).toBe('hace 3 d');
    expect(haceCuanto(null, ahora)).toBe('—');
  });
});
