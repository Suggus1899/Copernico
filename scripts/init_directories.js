import fs from 'fs';
import path from 'path';

/**
 * Script para inicializar directorios necesarios para la aplicación
 */

const directories = [
  'uploads',
  'uploads/videos',
  'uploads/thumbnails',
  'uploads/avatars'
];

console.log('🚀 Inicializando directorios necesarios...\n');

directories.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Directorio creado: ${dir}`);
  } else {
    console.log(`✓  Directorio ya existe: ${dir}`);
  }
});

console.log('\n🎉 Inicialización completada exitosamente!');
console.log('📁 Todos los directorios necesarios están listos.\n');