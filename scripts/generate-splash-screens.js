/**
 * Script para gerar splash screens para diferentes tamanhos de tela
 * 
 * Uso: node scripts/generate-splash-screens.js
 * 
 * Requer: sharp (npm install sharp --save-dev)
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tamanhos de splash screen para diferentes dispositivos
const splashScreens = [
  // iPhone
  { width: 640, height: 1136, name: 'splash-iphone-se.png', device: 'iPhone SE' },
  { width: 750, height: 1334, name: 'splash-iphone-8.png', device: 'iPhone 8' },
  { width: 828, height: 1792, name: 'splash-iphone-xr.png', device: 'iPhone XR' },
  { width: 1125, height: 2436, name: 'splash-iphone-x.png', device: 'iPhone X/XS' },
  { width: 1242, height: 2688, name: 'splash-iphone-xs-max.png', device: 'iPhone XS Max' },
  { width: 1242, height: 2208, name: 'splash-iphone-8-plus.png', device: 'iPhone 8 Plus' },
  // iPad
  { width: 1536, height: 2048, name: 'splash-ipad.png', device: 'iPad' },
  { width: 1668, height: 2224, name: 'splash-ipad-pro-10.5.png', device: 'iPad Pro 10.5"' },
  { width: 2048, height: 2732, name: 'splash-ipad-pro-12.9.png', device: 'iPad Pro 12.9"' },
  // Android
  { width: 720, height: 1280, name: 'splash-android-mdpi.png', device: 'Android MDPI' },
  { width: 1080, height: 1920, name: 'splash-android-hdpi.png', device: 'Android HDPI' },
  { width: 1440, height: 2560, name: 'splash-android-xhdpi.png', device: 'Android XHDPI' },
  { width: 2160, height: 3840, name: 'splash-android-xxhdpi.png', device: 'Android XXHDPI' },
];

const inputImage = path.join(__dirname, '../public/assets/logosplash.png');
const outputDir = path.join(__dirname, '../public/splash');

async function generateSplashScreens() {
  try {
    // Criar diretório de saída se não existir
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log('✅ Diretório de splash screens criado:', outputDir);
    }

    // Verificar se a imagem de entrada existe
    if (!fs.existsSync(inputImage)) {
      console.error('❌ Imagem de entrada não encontrada:', inputImage);
      console.log('💡 Por favor, coloque logosplash.png em public/assets/');
      process.exit(1);
    }

    console.log('🔄 Gerando splash screens...\n');

    // Gerar cada splash screen
    for (const { width, height, name, device } of splashScreens) {
      const outputPath = path.join(outputDir, name);
      
      await sharp(inputImage)
        .resize(width, height, {
          fit: 'cover',
          position: 'center',
          background: { r: 46, g: 125, b: 50, alpha: 1 } // #2E7D32 (theme color)
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ Gerado: ${name} (${width}x${height}) - ${device}`);
    }

    console.log('\n✅ Todos os splash screens foram gerados com sucesso!');
    console.log(`📁 Localização: ${outputDir}`);
    console.log('\n💡 Próximos passos:');
    console.log('   1. Atualize o index.html com os novos splash screens');
    console.log('   2. Adicione os links no <head> do HTML');
    
  } catch (error) {
    console.error('❌ Erro ao gerar splash screens:', error);
    process.exit(1);
  }
}

// Executar geração de splash screens
generateSplashScreens().catch(error => {
  console.error('❌ Erro ao gerar splash screens:', error);
  if (error.code === 'MODULE_NOT_FOUND') {
    console.log('\n💡 Sharp não está instalado!');
    console.log('💡 Para instalar, execute:');
    console.log('   npm install sharp --save-dev\n');
  }
  process.exit(1);
});

