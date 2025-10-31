const fs = require('fs');

const filePath = './src/Pages/Monitoramento.jsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

let braceCount = 0;
let negativeLines = [];

lines.forEach((line, index) => {
  const lineNumber = index + 1;
  const openBraces = (line.match(/\{/g) || []).length;
  const closeBraces = (line.match(/\}/g) || []).length;
  
  braceCount += openBraces - closeBraces;
  
  // Se o contador ficar negativo, registrar a linha
  if (braceCount < 0) {
    negativeLines.push({
      line: lineNumber,
      content: line.trim(),
      count: braceCount,
      openBraces,
      closeBraces
    });
  }
});

console.log('Linhas onde o contador de chaves fica negativo:');
negativeLines.forEach(item => {
  console.log(`Linha ${item.line}: "${item.content}" (Contador: ${item.count}, Abertas: ${item.openBraces}, Fechadas: ${item.closeBraces})`);
});

console.log(`\nContador final de chaves: ${braceCount}`);
console.log(`Total de linhas problemáticas: ${negativeLines.length}`);

// Mostrar as primeiras 10 linhas problemáticas
if (negativeLines.length > 0) {
  console.log('\nPrimeiras linhas problemáticas:');
  negativeLines.slice(0, 10).forEach(item => {
    console.log(`Linha ${item.line}: "${item.content}"`);
  });
}