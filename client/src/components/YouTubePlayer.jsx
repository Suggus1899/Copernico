import React, { useEffect, useRef, useState } from 'react';

const YOUTUBE_API_SRC = 'https://www.youtube.com/iframe_api';
const YOUTUBE_HOST = 'https://www.youtube-nocookie.com';

// Valores de YT.PlayerState que usa la aplicación
const PLAYER_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2 };

let apiPromise = null;

// Carga la API de YouTube una sola vez por página
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);

  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousReady?.();
        resolve(window.YT);
      };

      const script = document.createElement('script');
      script.src = YOUTUBE_API_SRC;
      script.async = true;
      script.onerror = () => {
        apiPromise = null;
        reject(new Error('No se pudo cargar la API de YouTube'));
      };
      document.head.appendChild(script);
    });
  }

  return apiPromise;
}

/**
 * Reproductor de YouTube incrustado (sin cookies de seguimiento).
 * onPlayerChange recibe la instancia del reproductor al estar lista y null al desmontarse.
 * onPlay, onPause y onEnded se disparan con los cambios de estado de reproducción.
 */
export default function YouTubePlayer({ videoId, title, onPlayerChange, onPlay, onPause, onEnded }) {
  const containerRef = useRef(null);
  const handlersRef = useRef({});
  const [loadError, setLoadError] = useState(false);

  // Los manejadores se leen desde una ref para no recrear el reproductor cuando cambian
  useEffect(() => {
    handlersRef.current = { onPlayerChange, onPlay, onPause, onEnded };
  });

  useEffect(() => {
    let cancelled = false;
    let player = null;
    let node = null;
    setLoadError(false);

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;

        // YT.Player reemplaza su nodo por un iframe; el contenedor de React no se toca
        node = document.createElement('div');
        containerRef.current.appendChild(node);
        player = new YT.Player(node, {
          videoId,
          host: YOUTUBE_HOST,
          playerVars: { rel: 0, modestbranding: 1 },
          events: {
            onReady: () => handlersRef.current.onPlayerChange?.(player),
            onStateChange: ({ data }) => {
              const handlers = handlersRef.current;
              if (data === PLAYER_STATE.PLAYING) handlers.onPlay?.();
              else if (data === PLAYER_STATE.PAUSED) handlers.onPause?.();
              else if (data === PLAYER_STATE.ENDED) handlers.onEnded?.();
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
      handlersRef.current.onPlayerChange?.(null);
      player?.destroy();
      node?.remove();
    };
  }, [videoId]);

  return (
    <div className="youtube-player" ref={containerRef} role="region" aria-label={`Reproductor: ${title}`}>
      {loadError && (
        <p className="clases-page__video-missing" role="alert">
          No se pudo cargar el reproductor.{' '}
          <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer">
            Ver en YouTube
          </a>
        </p>
      )}
    </div>
  );
}
