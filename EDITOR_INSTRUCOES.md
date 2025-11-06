# Editor de Locais e Enigmas - Instruções

## Como Abrir o Editor

1. Abra o arquivo **location-editor.html** no navegador
2. O editor carrega automaticamente todos os 15 locais existentes do jogo

## Interface do Editor

### Painel Esquerdo - Lista de Locais
- Lista todos os locais do jogo
- Clique em um local para editá-lo
- Botão **"+ Adicionar Novo Local"** para criar novos locais
- Botão **🗑️** ao lado de cada local para removê-lo

### Painel Central - Abas de Edição

#### 📝 Informações Básicas
Edite os dados principais do local:
- **ID do Local**: Identificador único (ex: forest_entrance)
  - Sem espaços, use underscore (_)
  - Se mudar o ID, todas as conexões são atualizadas automaticamente
- **Nome do Local**: Nome amigável (ex: Entrada da Floresta)
- **Descrição**: Texto descritivo do local
- **Caminho da Imagem**: Caminho para a imagem (ex: images/forest_entrance.jpg)
- **Local desbloqueado**: Marque se o local está acessível desde o início

Clique em **💾 Salvar Informações** para aplicar as mudanças.

#### 🧩 Enigma
Configure ou remova enigmas do local:

1. Marque **"Este local tem um enigma"** para criar/editar um enigma
2. Digite o **ID do Enigma** (ex: fountain_puzzle)
3. Selecione o **Tipo de Enigma**:

   **🧭 Direção** (4 direções)
   - Pergunta com 4 opções
   - Resposta: número da opção correta (0-3)
   - Opcional: Dica

   **📜 Charada** (Múltipla escolha)
   - Pergunta/charada
   - Várias opções (uma por linha)
   - Resposta: número da opção correta (começando em 0)

   **🔢 Sequência** (Ordem correta)
   - Pergunta
   - Sequência correta: números separados por vírgula (ex: 0,2,1)

   **➕ Matemática** (Cálculo)
   - Problema matemático
   - Resposta: número correto

   **🔐 Código** (Senha numérica)
   - Pergunta
   - Código correto (número)
   - Opcional: Dica

   **🔧 Combinar Itens** (Items necessários)
   - Pergunta
   - IDs dos itens necessários (separados por vírgula)

4. Preencha os campos específicos do tipo escolhido
5. Configure a **Recompensa**:
   - ID do item de recompensa
   - Nome do item de recompensa

Clique em **💾 Salvar Enigma** para aplicar.

#### 💎 Itens
Gerencie itens colecionáveis no local:

- Clique **+ Adicionar Item** para criar um novo item
  - Digite o ID do item (ex: old_coin)
  - Digite o nome do item (ex: Moeda Antiga)
- Clique **✏️ Editar** para modificar um item existente
- Clique **🗑️** para remover um item

#### 🎯 Hotspots
Configure áreas interativas na imagem:

- Clique **+ Adicionar Hotspot** para criar um novo hotspot
  - ID do hotspot (ex: fountain)
  - Nome do hotspot (ex: Fonte Seca)
  - Ação (examine, navigate, puzzle, collect)
  - Campos adicionais dependendo da ação:
    - **examine**: Mensagem ao examinar
    - **navigate**: ID do local de destino
    - **puzzle**: ID do puzzle
    - **collect**: ID do item a coletar
  - Posição padrão: 50%, 50% (pode editar depois)

- Clique **✏️ Editar** para modificar posição e tamanho:
  - Nome do hotspot
  - Posição X, Y (porcentagem)
  - Largura e Altura (porcentagem)

- Clique **🗑️** para remover um hotspot

#### 🔗 Conexões
Gerencie quais locais podem ser acessados:

- Lista todos os outros locais do jogo
- Locais conectados aparecem com fundo verde
- Clique **+ Conectar** para criar uma conexão (bidirecional)
- Clique **✕ Desconectar** para remover uma conexão
- As conexões são sempre bidirecionais (se A conecta com B, B automaticamente conecta com A)

## Funcionalidades Especiais

### ✓ Salvamento Automático
- Todas as mudanças são salvas automaticamente no navegador (localStorage)
- Indicador verde aparece no canto superior direito quando salva
- Os dados persistem mesmo se fechar o navegador

### + Adicionar Novo Local
1. Clique no botão **"+ Adicionar Novo Local"** no painel esquerdo
2. Digite o ID do novo local
3. Digite o nome do novo local
4. O local é criado com valores padrão
5. Selecione o local e edite todas as informações

### 🗑️ Remover Local
1. Clique no botão **🗑️** ao lado do local
2. Confirme a remoção
3. Todas as conexões com este local são removidas automaticamente de outros locais
4. Todos os hotspots que apontavam para este local são limpos

### 📦 Exportar Código
1. Clique no botão **📦 Exportar Código** (canto inferior direito)
2. Uma janela modal aparece com o código JavaScript completo
3. Clique em **📋 Copiar Código**
4. Abra o arquivo **js/map.js**
5. Substitua todo o conteúdo pelo código copiado
6. Salve o arquivo

O código exportado inclui:
- Todos os locais com todas as configurações
- Enigmas, itens, hotspots, conexões
- Funções auxiliares (getLocation, getUnlockedLocations)
- Formato pronto para usar no jogo

## Dicas de Uso

### Renomear um Local
1. Vá para a aba **📝 Informações Básicas**
2. Mude o campo **ID do Local** para o novo ID
3. Clique em **💾 Salvar Informações**
4. O sistema atualiza automaticamente todas as conexões e referências

### Criar uma Sequência de Locais
1. Crie todos os locais primeiro (usando **+ Adicionar Novo Local**)
2. Para cada local, vá na aba **🔗 Conexões**
3. Conecte com os locais adjacentes
4. As conexões são bidirecionais automaticamente

### Testar Enigmas
1. Configure o enigma na aba **🧩 Enigma**
2. Exporte o código
3. Atualize o arquivo **js/map.js**
4. Teste no jogo (use **game-offline.html** para testes rápidos)

### Organizar Hotspots
- Use posições em porcentagem para garantir que funcionam em qualquer resolução
- Posição (x, y) é o canto superior esquerdo do hotspot
- Largura e altura definem o tamanho da área clicável
- Exemplo: x=50, y=50, width=15, height=20
  - Hotspot no centro da imagem (50%, 50%)
  - 15% de largura, 20% de altura

### Backup dos Dados
O editor salva automaticamente no navegador, mas para fazer backup:
1. Clique em **📦 Exportar Código**
2. Copie o código
3. Salve em um arquivo .js no seu computador
4. Se precisar restaurar, cole o código de volta no **js/map.js**

## Fluxo de Trabalho Recomendado

1. **Planejamento**:
   - Defina quantos locais quer (15 já existem, mas pode adicionar mais)
   - Planeje a história e a progressão

2. **Criação de Locais**:
   - Adicione todos os locais primeiro
   - Configure informações básicas (nome, descrição, imagem)

3. **Conexões**:
   - Defina como os locais se conectam
   - Crie o mapa de navegação

4. **Enigmas e Itens**:
   - Adicione enigmas aos locais
   - Configure itens colecionáveis
   - Defina as recompensas

5. **Hotspots**:
   - Adicione áreas interativas
   - Ajuste posições testando no jogo

6. **Teste e Ajuste**:
   - Exporte o código
   - Teste no game-offline.html
   - Volte ao editor para ajustes

7. **Publicação**:
   - Quando estiver pronto, exporte o código final
   - Atualize o js/map.js
   - Faça upload para o Hostinger

## Atalhos e Teclas

Não há atalhos de teclado no editor, mas você pode:
- Usar **Tab** para navegar entre campos
- **Enter** nos campos de texto não submete o formulário
- Clicar em **Salvar** em cada aba para persistir mudanças

## Resolução de Problemas

**O local não aparece na lista**
- Verifique se salvou as informações básicas
- Atualize a página do navegador

**As conexões não funcionam**
- Verifique se ambos os locais existem
- As conexões são bidirecionais - se A conecta com B, B automaticamente conecta com A

**O código exportado dá erro**
- Verifique se todos os IDs estão corretos
- IDs não devem ter espaços ou caracteres especiais
- Use apenas letras, números e underscore (_)

**Os dados sumiram**
- Os dados ficam no localStorage do navegador
- Se limpar os dados do navegador, perde as edições
- Use **Exportar Código** regularmente para fazer backup

**Enigma não funciona no jogo**
- Verifique se o tipo de enigma está correto
- Verifique se a resposta correta está no formato certo
- Para tipo "direction" e "riddle": número da opção (0, 1, 2, 3)
- Para tipo "sequence": array de números (0,2,1)
- Para tipo "math" e "code": número inteiro

## Próximos Passos

Depois de editar todos os locais:
1. Clique em **📦 Exportar Código**
2. Copie o código gerado
3. Abra **js/map.js** em um editor de texto
4. Substitua todo o conteúdo pelo código copiado
5. Salve o arquivo
6. Teste o jogo abrindo **game-offline.html**
7. Quando tudo estiver funcionando, faça upload para o Hostinger

---

**Dica Final**: Use o **map-editor.html** para posicionar visualmente os locais no mapa, e o **location-editor.html** para configurar todo o conteúdo, enigmas e conexões!