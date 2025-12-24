/**
 * Script para gerar ícones PWA em tamanhos específicos
 * 
 * Uso: node scripts/generate-pwa-icons.js
 * 
 * Requer: sharp (npm install sharp --save-dev)
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
  // Apple touch icons
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 167, name: 'apple-touch-icon-167x167.png' },
];

const inputImage = path.join(__dirname, '../public/assets/logodocemel.png');
const outputDir = path.join(__dirname, '../public/icons');

async function generateIcons() {
  try {
    // Criar diretório de saída se não existir
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log('✅ Diretório de ícones criado:', outputDir);
    }

    // Verificar se a imagem de entrada existe
    if (!fs.existsSync(inputImage)) {
      console.error('❌ Imagem de entrada não encontrada:', inputImage);
      console.log('💡 Por favor, coloque logodocemel.png em public/assets/');
      process.exit(1);
    }

    console.log('🔄 Gerando ícones PWA...\n');

    // Gerar cada tamanho
    for (const { size, name } of sizes) {
      const outputPath = path.join(outputDir, name);
      
      await sharp(inputImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ Gerado: ${name} (${size}x${size})`);
    }

    // Gerar favicon também
    const faviconPath = path.join(__dirname, '../public/favicon.ico');
    await sharp(inputImage)
      .resize(32, 32)
      .png()
      .toFile(path.join(outputDir, 'favicon-32x32.png'));

    console.log('\n✅ Todos os ícones foram gerados com sucesso!');
    console.log(`📁 Localização: ${outputDir}`);
    console.log('\n💡 Próximos passos:');
    console.log('   1. Atualize o manifest.json com os novos caminhos dos ícones');
    console.log('   2. Atualize o index.html com os novos ícones');
    
  } catch (error) {
    console.error('❌ Erro ao gerar ícones:', error);
    process.exit(1);
  }
}

// Executar geração de ícones
generateIcons().catch(error => {
  console.error('❌ Erro ao gerar ícones:', error);
  if (error.code === 'MODULE_NOT_FOUND') {
    console.log('\n💡 Sharp não está instalado!');
    console.log('💡 Para instalar, execute:');
    console.log('   npm install sharp --save-dev\n');
  }
  process.exit(1);
});

