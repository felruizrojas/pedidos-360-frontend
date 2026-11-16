import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarChart, BarraDato } from './bar-chart';

describe('BarChart', () => {
  let fixture: ComponentFixture<BarChart>;
  const el = () => fixture.nativeElement as HTMLElement;
  const barras = () => [...el().querySelectorAll('rect.barra')] as SVGRectElement[];

  function crear(datos: BarraDato[], extra: Record<string, unknown> = {}) {
    fixture = TestBed.createComponent(BarChart);
    fixture.componentRef.setInput('datos', datos);
    fixture.componentRef.setInput('titulo', 'Ventas por hora');
    for (const [k, v] of Object.entries(extra)) {
      fixture.componentRef.setInput(k, v);
    }
    fixture.detectChanges();
  }

  it('dibuja una barra por dato, con alto proporcional al valor', () => {
    crear([
      { etiqueta: '09:00', valor: 100 },
      { etiqueta: '10:00', valor: 50 },
      { etiqueta: '11:00', valor: 25 },
    ]);
    expect(barras()).toHaveLength(3);
    const altos = barras().map((b) => Number(b.getAttribute('height')));
    expect(altos[1] / altos[0]).toBeCloseTo(0.5);
    expect(altos[2] / altos[0]).toBeCloseTo(0.25);
    expect(el().querySelector('svg')!.getAttribute('role')).toBe('img');
    expect(el().querySelector('svg > title')!.textContent).toBe('Ventas por hora');
  });

  it('muestra las etiquetas y un title (tooltip) con valor y detalle por barra', () => {
    crear([{ etiqueta: '09:00', valor: 2700, detalle: '1 pedido' }], { formatoValor: (v: number) => `$${v}` });
    expect([...el().querySelectorAll('text.rotulo')].map((t) => t.textContent)).toEqual(['09:00']);
    expect(barras()[0].querySelector('title')!.textContent).toBe('09:00: $2700 · 1 pedido');
  });

  it('horizontal: el ancho es proporcional y el valor va al final de la barra', () => {
    crear(
      [
        { etiqueta: 'Pan', valor: 8 },
        { etiqueta: 'Café', valor: 2 },
      ],
      { orientacion: 'horizontal' },
    );
    const anchos = barras().map((b) => Number(b.getAttribute('width')));
    expect(anchos[1] / anchos[0]).toBeCloseTo(0.25);
    expect([...el().querySelectorAll('text.valor')].map((t) => t.textContent)).toEqual(['8', '2']);
  });

  it('estado vacío sin datos o con todo en 0', () => {
    crear([]);
    expect(el().querySelector('[role="status"]')!.textContent).toContain('Sin datos en este rango');
    expect(el().querySelector('svg')).toBeNull();
    crear([
      { etiqueta: 'a', valor: 0 },
      { etiqueta: 'b', valor: 0 },
    ]);
    expect(el().textContent).toContain('Sin datos en este rango');
    expect(el().querySelector('button')).toBeNull();
  });

  it('"Ver como tabla" muestra una tabla con los mismos datos y vuelve al gráfico', () => {
    crear(
      [
        { etiqueta: '09:00', valor: 10, detalle: '2 pedidos' },
        { etiqueta: '10:00', valor: 5, detalle: '1 pedido' },
      ],
      { etiquetaDetalle: 'Pedidos' },
    );
    const boton = el().querySelector('button')!;
    boton.click();
    fixture.detectChanges();
    expect(boton.getAttribute('aria-pressed')).toBe('true');
    expect(el().querySelector('svg')).toBeNull();
    const filas = [...el().querySelectorAll('tbody tr')].map((f) =>
      [...f.querySelectorAll('td')].map((td) => td.textContent!.trim()).join(' '),
    );
    expect(filas).toEqual(['09:00 10 2 pedidos', '10:00 5 1 pedido']);
    expect(el().querySelector('caption')!.textContent).toBe('Ventas por hora');

    boton.click();
    fixture.detectChanges();
    expect(el().querySelector('svg')).not.toBeNull();
  });
});
