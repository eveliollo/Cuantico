import { Complex } from '../types/quantum';

/**
 * Complex arithmetic operations mirroring the Rust `num-complex` crate.
 */
export const ComplexMath = {
  create(re: number = 0, im: number = 0): Complex {
    return { re, im };
  },

  zero(): Complex {
    return { re: 0, im: 0 };
  },

  one(): Complex {
    return { re: 1, im: 0 };
  },

  i(): Complex {
    return { re: 0, im: 1 };
  },

  add(a: Complex, b: Complex): Complex {
    return { re: a.re + b.re, im: a.im + b.im };
  },

  sub(a: Complex, b: Complex): Complex {
    return { re: a.re - b.re, im: a.im - b.im };
  },

  mul(a: Complex, b: Complex): Complex {
    return {
      re: a.re * b.re - a.im * b.im,
      im: a.re * b.im + a.im * b.re,
    };
  },

  scale(a: Complex, s: number): Complex {
    return { re: a.re * s, im: a.im * s };
  },

  div(a: Complex, b: Complex): Complex {
    const denom = b.re * b.re + b.im * b.im;
    if (denom === 0) return { re: 0, im: 0 };
    return {
      re: (a.re * b.re + a.im * b.im) / denom,
      im: (a.im * b.re - a.re * b.im) / denom,
    };
  },

  conj(a: Complex): Complex {
    return { re: a.re, im: -a.im };
  },

  abs(a: Complex): number {
    return Math.hypot(a.re, a.im);
  },

  absSq(a: Complex): number {
    return a.re * a.re + a.im * a.im;
  },

  arg(a: Complex): number {
    return Math.atan2(a.im, a.re);
  },

  exp(a: Complex): Complex {
    const r = Math.exp(a.re);
    return {
      re: r * Math.cos(a.im),
      im: r * Math.sin(a.im),
    };
  },

  fromPolar(r: number, theta: number): Complex {
    return {
      re: r * Math.cos(theta),
      im: r * Math.sin(theta),
    };
  },

  format(c: Complex, precision: number = 3): string {
    if (!c) return '0';
    const cRe = c.re ?? 0;
    const cIm = c.im ?? 0;
    const re = Math.abs(cRe) < 1e-9 ? 0 : Number(cRe.toFixed(precision));
    const im = Math.abs(cIm) < 1e-9 ? 0 : Number(cIm.toFixed(precision));

    if (re === 0 && im === 0) return '0';
    if (im === 0) return `${re}`;
    if (re === 0) {
      if (im === 1) return 'i';
      if (im === -1) return '-i';
      return `${im}i`;
    }

    const sign = im >= 0 ? '+' : '-';
    const absIm = Math.abs(im);
    const imPart = absIm === 1 ? 'i' : `${absIm}i`;
    return `${re} ${sign} ${imPart}`;
  }
};
