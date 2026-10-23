import { useEffect } from 'react';
import { animate, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import * as m from 'motion/react-m';
import { formatEuros } from '../lib/money';

/** Importe que cuenta hasta el valor nuevo; fuera del render de React (MotionValue). */
export function Euros({ cents, className }: { cents: number; className?: string }) {
  const value = useMotionValue(cents);
  const text = useTransform(value, v => formatEuros(Math.round(v)));
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return value.set(cents);
    // sin muelle: con dinero, pasarse del valor y volver se lee como un error
    const anim = animate(value, cents, { duration: 0.45, ease: [0.16, 1, 0.3, 1] });
    return () => anim.stop();
  }, [cents, reduce, value]);

  return <m.span className={className}>{text}</m.span>;
}
