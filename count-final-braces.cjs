const fs = require('fs');

const content = fs.readFileSync('src/Pages/Monitoramento.jsx', 'utf8');
const lines = content.split('\n');

// Contar chaves nas últimas 50 linhas
const startLine = Math.max(0, lines.length - 50);
let openBraces = 0;
let closeBraces = 0;

console.log('Últimas 50 linhas:');
for (let i = startLine; i < lines.length; i++) {
  const line = lines[i];
  const lineNum = i + 1;
  
  // Contar chaves na linha
  const openCount = (line.match(/\{/g) || []).length;
  const closeCount = (line.match(/\}/g) || []).length;
  
  openBraces += openCount;
  closeBraces += closeCount;
  
  if (openCount > 0 || closeCount > 0) {
    console.log(`Linha ${lineNum}: "${line.trim()}" (Abertas: ${openCount}, Fechadas: ${closeCount})`);
  }
}

console.log(`\nTotal nas últimas 50 linhas:`);
console.log(`Chaves abertas: ${openBraces}`);
console.log(`Chaves fechadas: ${closeBraces}`);
console.log(`Diferença: ${openBraces - closeBraces}`);