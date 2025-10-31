# nova tela "Checklist Expedição"

criar mais 1 tela no aplicativo.

antes, crie mais 1 tipo de usuario:
”expedidor”

vai ser importante para essa nova tela

tela “Checklist Expedição”

## **Prompt Completo — Tela “**Checklist **Expedição”**

O objetivo dessa tela é registrar e monitorar todos os caminhões em processo de **carregamento (expedição)** dentro da empresa, com controle de horários, temperaturas, relatórios e compartilhamento via WhatsApp.

será dividido em 4 partes:

1º parte: campos dos preenchimentos dos dados do registros:
2º parte: cards, graficos, e resumos dos registros

3º parte: tabela completa com todos os dados e todos os campos.

4º parte: botoes de gerar relatorios

a tabela ficará assim:
Empresa, Data, Placa, Fretista, Hora de Chegada, Hora de Saída, Temperatura **(°C)**, Condições do Baú, Potualidade, Qtd. PBR (quantidade de paletes PBR), Qtd. Desc. (quantidade de paletes descartaveis), Observação, Qtd. Devolvida (campo que o usuario vai digitar a quantidade de PBR devolvidos na tabela depois do registro criado), Saldo (diferença da Qtd PBR - qtd Devolvida), Status, Usuario (nome do usuario logado que fez o registro), Data e Hora (Data e hora que o usuario criou o registro)

observação: se o saldo for >0, automaticamente o Campo Status virá como “Pendente”, se for = 0, o Status virá mudará automaticamente para “Devolvido”
observação: criar esquema de paginação, aperecer 100 registros por pagina. sempre ordenando do mais recente criado ao mais antigo.

---

---

### 1. Parte da tela **“**Checklist **Expedição”** 🚛

**Função:** Registrar informações detalhadas de cada caminhão que está sendo carregado.

**Campos:
0. Empresa: (**menu suspenso (dropdown) com as opções da lista de empresas (da lista do arquivo empresas.csv).

1. **Data da Expedição:** preenchido automaticamente com a data atual.
2. **Placa:** menu suspenso (dropdown) com as opções da lista de fretistas (da lista do arquivo fretistas.csv).
3. **Fretista:** preenchido automaticamente conforme a placa selecionada (consultar relação pelo arquivo fretistas.csv.
4. **Hora de Chegada:** campo tipo hora.
5. **Hora de Saída:** campo tipo hora.
6. **Temperatura (°C):** campo numérico com unidade exibida (°C).
7. **Condições do Baú:** seletor com opções: ✅ **Conforme** / ❌ **Não Conforme**.
8. **Pontualidade:** seletor com opções: 🕐 **Pontual** / ⏰ **Com Atraso**.
9. **Observação:** campo de texto livre (opcional).

**Botões e Funções:**

- 📷 **Botão “Anexar Evidências”** (so criar o botão, a funcionalidade e o salvamento será implementada depois)
- 💾 **Botão “Salvar e Compartilhar Registro”**
    - Salva o registro no banco de dados (Supabase). crie as tabelas para registros dos dados no supabase.
    - Gera um **resumo automático** do registro (data, placa, motorista, temperatura, etc.).
    - Abre o WhatsApp com mensagem pré-formatada com emojis e anexos (usando `whatsapp://send?text=`).

---

### 2. Parte da tela **“**Checklist **Expedição”** 🚛

**Função:** Visualizar, analisar e exportar todos os registros feitos.

**Componentes:**

### 🔍 **Filtros:**

- Busca Dinamica (qualquer coisa que o usuario digitar)
- Data inicial e final.
- Período (Hoje, Ontem, Semanal, Mensal, Anual)
- Fretista.
- Placa.
- Status PBR (Palete PBR) (Pendente / Devolvido / Parcialmente).
- Condição do baú (Conforme / Não Conforme).
- Temperatura (ºC): (≥ a 12º / ≤ a 12º)
- Pontualidade (Pontual / Com Atraso)

### 📈 **Cards Estatísticos:**

- Total de Checklists
- Total de PBR Expedidos
- Total de PBR Pendentes
- Total de Descartáveis Expedidos
- Temperatura Média (ºC)
- Tempo Médio de Carregamento (calculo em minutos com a média entre a hora de chegada até a hora de saída)
- Total de Atrasos
- Total de NC (Não conformidades para condiçoes do Bau)

### 📊 **Gráficos (usando Recharts):**

- card de tabela mostrando: “Pendencias PBR por Fretista” Colunas: Data | Placa | Fretista | Qtd | Status
- card de tabela mostrando: “Atrasos por Fretista” Colunas: Data | Placa | Fretista | Hora de Chegada | Potualidade
- Gráfico de barras: “Atrasos nos Ultimos 7 dias”
- Grafico de barras: “Temperatura Média por Fretista”

### 🚨 **Alertas Inteligentes**

- Exibir aviso em destaque se houver caminhões “Não Conformes” e “Com Atraso” e com “Status Pendente”.
- Exemplos:
    
    > ⚠️ 3 caminhões com atraso hoje
    > 
    
    > ⚠️ 2 baús não conformes hoje
    > 
    
    > ⚠️ 7 fretistas com saldo PBR pendente hoje
    > 

### 3º Parte da tela **“**Checklist **Expedição”** 🚛

📋 **Tabela de Registros (com CRUD completo):**

- Colunas:
    
    Empresa, Data, Placa, Fretista, Hora de Chegada, Hora de Saída, Temperatura **(°C)**, Condições do Baú, Potualidade, Qtd. PBR (quantidade de paletes PBR), Qtd. Desc. (quantidade de paletes descartaveis), Observação, Qtd. Devolvida, Saldo, Status, Usuario (nome do usuario logado que fez o registro), Data e Hora (Data e hora que o usuario criou o registro)
    
    observação:
    
    criar esquema de paginação, aperecer 100 registros por pagina. sempre ordenando do mais recente criado ao mais antigo.
    
- Funções:
    - ✏️ **Editar registro**
    - 👁️ Visualizar o registro (completo em um modal com todas as informações)
    - 🗑️ **Excluir registro**
    - 📎 **Visualizar Imagens** (abre modal com as fotos anexadas)

4º Parte da tela **“**Checklist **Expedição”** 🚛

Botões **Gerar Relatórios**

- 📄 PDF (com cards, graficos e resumos em tabelas por fretista, por data, por status. Contendo  as principais informações (Empresa, data, placa, fretista, Saldo, temperatura, status.)
- 🧾 XLS (completo com todos os campos preenchidos e nao preenchidos na parte do registro. quero tambem que o cabeçalho seja formatado na cor verde, com a fonte do texto branco)
- 🌐 HTML (com cards, graficos e resumos em tabelas por fretista, por data, por status. Contendo  as principais informações (Empresa, data, placa, fretista, Saldo, temperatura, status.)

### 📱 **Botão “Compartilhar Resumo via WhatsApp”**

---

### 💾 **Banco de Dados (Supabase)**

Tabelas sugeridas:

1. **expedicoes**
    - id (uuid)
    - Empresa
    - data
    - placa
    - fretista
    - hora_chegada
    - hora_saida
    - temperatura
    - condicao_bau
    - pontualidade
    - qtd_PBR
    - qtd_Desc
    - observacao
    - qtd_Devolvida
    - Saldo
    - imagens (array de URLs)
    - status (texto: “Pendente”, “Concluído”, “Não Conforme”)
    - Usuario (que criou o registro)
    - criado_em (timestamp)

---

### 🔔 Outras **Funcionalidades**

- Suporte offline (sincronização local → Supabase quando voltar conexão).
- Exportação automática de dados no final do turno.
- Notificações push (para lembrar caminhões pendentes).
- Validação de campos obrigatórios.
- Exibir mensagem de sucesso ao salvar.
- Design em cards, ícones visuais (ex: caminhão, relógio, termômetro).
- Tema com cores: baseando-se nas demais telas do app

IMPORTANTE:

apenas usuarios do tipo “colaborador” e “administrador” podem realizar registro (1º parte). esses dois usuarios terão acesso completo total a essa tela. 1º parte, 2º parte 3º parte e 4º parte da tela.

Já o usuario do tipo “fretista” apenas verão a 2º parte e a 3º parte da tela
já os usuarios do tipo “vendedor” e “novo” não terão acesso a essa tela.

já usuario do tipo “expedidor” so terá acesso a essa tela, mas será acesso total tambem as 4º partes da tela. Mas nao terá acesso a nenhuma outra tela do aplicativo. apenas a tela “Checklist Expedição”

---

---