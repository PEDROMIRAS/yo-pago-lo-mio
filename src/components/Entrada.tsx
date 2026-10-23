import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import type { Dinner, RestauranteRef } from '../types';
import { loadRestaurants } from '../lib/menu';
import { slide } from '../motion';
import { Inicio, Restaurantes } from './Inicio';
import { ConfirmDialog } from './ConfirmDialog';

const hora = (ms: number) => new Date(ms).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

/** Antes de tener cena: portada y elección de restaurante. Se monta de nuevo en cada vuelta a la portada. */
export function Entrada(props: {
  saved: { dinner: Dinner; guardado: number } | null;
  onContinuar: (d: Dinner) => void;
  onElegir: (restauranteId: string) => void;
}) {
  const { saved, onContinuar, onElegir } = props;
  const [restaurantes, setRestaurantes] = useState<RestauranteRef[] | null>(null);
  const [restError, setRestError] = useState(false);
  const [intento, setIntento] = useState(0);
  // portada o restaurantes, con la dirección del deslizamiento
  const [nav, setNav] = useState<{ pantalla: 'inicio' | 'restaurantes'; dir: number }>({ pantalla: 'inicio', dir: 1 });
  const [pedirBorrar, setPedirBorrar] = useState(false);

  useEffect(() => {
    let vivo = true;
    loadRestaurants().then(
      r => vivo && setRestaurantes(r),
      () => vivo && setRestError(true),
    );
    return () => {
      vivo = false;
    };
  }, [intento]);

  const guardada = saved && {
    restaurante: restaurantes?.find(r => r.id === saved.dinner.restauranteId)?.nombre ?? saved.dinner.restauranteId,
    personas: saved.dinner.personas.length,
    hora: hora(saved.guardado),
  };
  const aRestaurantes = () => setNav({ pantalla: 'restaurantes', dir: 1 });

  return (
    <div className="overflow-x-clip">
      <AnimatePresence mode="wait" custom={nav.dir}>
        <m.main
          key={nav.pantalla}
          custom={nav.dir}
          className="mx-auto max-w-120 px-4 pt-10 pb-8"
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
        >
          {nav.pantalla === 'inicio' ? (
            <Inicio
              guardada={guardada}
              onContinuar={() => saved && onContinuar(saved.dinner)}
              // empezar otra cena sustituye a la guardada: preguntar antes de perderla
              onNueva={() => (saved ? setPedirBorrar(true) : aRestaurantes())}
            />
          ) : (
            <Restaurantes
              restaurantes={restaurantes}
              error={restError}
              onReintentar={() => {
                setRestError(false);
                setIntento(i => i + 1);
              }}
              onElegir={onElegir}
              onVolver={() => setNav({ pantalla: 'inicio', dir: -1 })}
            />
          )}
        </m.main>
      </AnimatePresence>
      <ConfirmDialog
        open={pedirBorrar}
        titulo="Hay una cena guardada"
        texto={`Si empiezas otra, se borrará la cena en ${guardada?.restaurante ?? 'curso'}.`}
        confirmar="Empezar otra"
        onConfirm={() => {
          setPedirBorrar(false);
          aRestaurantes();
        }}
        onCancel={() => setPedirBorrar(false)}
      />
    </div>
  );
}
