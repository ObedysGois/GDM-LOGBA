// Script para corrigir problemas de sintaxe nos arquivos JSX
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obter o diretório atual em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Arquivos a serem corrigidos
const files = [
  path.join(__dirname, 'src', 'Pages', 'Monitoramento.jsx'),
  path.join(__dirname, 'src', 'Pages', 'Registros.jsx')
];

// Função para corrigir um arquivo
function fixFile(filePath) {
  console.log(`Corrigindo ${filePath}...`);
  
  try {
    // Ler o conteúdo do arquivo
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Substituir sequências de escape literais por código JavaScript válido
    content = content.replace(/\\n/g, '\n');
    
    // Escrever o conteúdo corrigido de volta para o arquivo
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log(`✅ Arquivo ${filePath} corrigido com sucesso!`);
  } catch (error) {
    console.error(`❌ Erro ao corrigir ${filePath}:`, error);
  }
}

// Corrigir cada arquivo
files.forEach(fixFile);

console.log('Processo de correção concluído!');