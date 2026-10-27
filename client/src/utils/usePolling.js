import { useEffect, useRef } from 'react';

// Ejecuta `task` al montar y cada `intervalMs`, pero no mientras la pestaña está oculta.
// Al volver a mostrarla refresca de inmediato. `task` debe capturar sus propios errores.
export default function usePolling(task, intervalMs) {
  const taskRef = useRef(task);
  taskRef.current = task;

  useEffect(() => {
    let timer = null;
    const start = () => {
      if (timer === null) timer = setInterval(() => taskRef.current(), intervalMs);
    };
    const stop = () => {
      clearInterval(timer);
      timer = null;
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
        return;
      }
      taskRef.current();
      start();
    };

    onVisibilityChange();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      stop();
    };
  }, [intervalMs]);
}
