import { useEffect } from 'react';

/**
 * Animación de entrada al hacer scroll.
 * Cualquier elemento con la clase `reveal` aparece con un desplazamiento suave.
 * `style={{ '--d': n }}` escalona la entrada (n × 55 ms).
 * Se vuelve a escanear cuando cambian las dependencias (filtros que montan tarjetas nuevas).
 */
export function useReveal(deps: unknown[] = []) {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.06 }
    );
    const raf = requestAnimationFrame(() => {
      document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => io.observe(el));
    });
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
