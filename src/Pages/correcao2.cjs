const fs = require('fs');
const path = require('path');

// Função para corrigir sequências de escape
function fixEscapeSequences(content) {
  // Corrigir sequências de nova linha duplicadas
  content = content.replace(/\\\\n/g, '\n');
  
  // Corrigir sequências Unicode para emojis
  content = content.replace(/\\\\ud83d\\\\udcce/g, '📎');
  content = content.replace(/\\\\ud83c\\\\udf47/g, '🍇');
  content = content.replace(/\\\\ud83e\\\\udd66/g, '🥦');
  content = content.replace(/\\\\ud83c\\\\udf49/g, '🍉');
  content = content.replace(/\\\\ud83c\\\\udf50/g, '🥝');
  content = content.replace(/\\\\ud83c\\\\udf4e/g, '🍎');
  content = content.replace(/\\\\ud83c\\\\udf4d/g, '🍍');
  content = content.replace(/\\\\ud83e\\\\udd51/g, '🫑');
  content = content.replace(/\\\\ud83c\\\\udf45/g, '🍅');
  content = content.replace(/\\\\ud83c\\\\udf4b/g, '🍋');
  content = content.replace(/\\\\ud83e\\\\uddc4/g, '🧄');
  content = content.replace(/\\\\ud83e\\\\uddca/g, '🫚');
  content = content.replace(/\\\\ud83c\\\\udf4f/g, '🍏');
  
  // Corrigir a sequência de escape na linha 1481 do Monitoramento.jsx
  content = content.replace("alert('Mensagem gerada:\\\\n\\\\n' + message);", "alert('Mensagem gerada:\\n\\n' + message);");
  
  return content;
}

// Corrigir Monitoramento.jsx
const monitoramentoPath = path.join(__dirname, 'Monitoramento.jsx');
let monitoramentoContent = fs.readFileSync(monitoramentoPath, 'utf8');
monitoramentoContent = fixEscapeSequences(monitoramentoContent);
fs.writeFileSync(monitoramentoPath, monitoramentoContent, 'utf8');

// Corrigir Registros.jsx
const registrosPath = path.join(__dirname, 'Registros.jsx');
let registrosContent = fs.readFileSync(registrosPath, 'utf8');
registrosContent = fixEscapeSequences(registrosContent);
fs.writeFileSync(registrosPath, registrosContent, 'utf8');

console.log('Arquivos corrigidos com sucesso!');