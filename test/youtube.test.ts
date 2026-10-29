import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseYouTubeId, youTubeThumbnailUrl } from '../src/utils/youtube.js';

const ID = 'dQw4w9WgXcQ';

describe('parseYouTubeId', () => {
  it('acepta el ID suelto y las formas habituales de URL de YouTube', () => {
    const accepted = [
      ID,
      `https://www.youtube.com/watch?v=${ID}`,
      `https://www.youtube.com/watch?v=${ID}&t=42s`,
      `https://youtube.com/watch?v=${ID}`,
      `https://m.youtube.com/watch?v=${ID}`,
      `https://youtu.be/${ID}?si=abc123`,
      `https://www.youtube.com/embed/${ID}`,
      `https://www.youtube.com/shorts/${ID}`,
      `https://www.youtube.com/live/${ID}`,
      `youtube.com/watch?v=${ID}`,
      `  https://youtu.be/${ID}  `,
    ];
    for (const input of accepted) {
      assert.equal(parseYouTubeId(input), ID, `debería aceptar ${input}`);
    }
  });

  it('rechaza hosts ajenos, esquemas no HTTP y entradas mal formadas', () => {
    const rejected = [
      `https://vimeo.com/${ID}`,
      `https://youtube.com.evil.example/watch?v=${ID}`,
      `https://www.youtube.com/watch?v=short`,
      `https://www.youtube.com/watch?v=`,
      `https://www.youtube.com/channel/${ID}`,
      'javascript:alert(1)',
      '',
      '   ',
      null,
      undefined,
      42,
    ];
    for (const input of rejected) {
      assert.equal(parseYouTubeId(input), null, `debería rechazar ${JSON.stringify(input)}`);
    }
  });
});

describe('youTubeThumbnailUrl', () => {
  it('devuelve la miniatura pública del vídeo', () => {
    assert.equal(youTubeThumbnailUrl(ID), `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
  });
});
