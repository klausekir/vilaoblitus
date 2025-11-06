# Editor de Locais - Início Rápido

## Abrir o Editor

```
1. Abra: location-editor.html no navegador
2. Todos os 15 locais aparecem no painel esquerdo
```

## 5 Operações Principais

### 1️⃣ EDITAR UM LOCAL
- Clique no local no painel esquerdo
- Vá para aba **📝 Informações Básicas**
- Edite nome, descrição, imagem
- Clique **💾 Salvar Informações**

### 2️⃣ ADICIONAR NOVO LOCAL
- Clique **+ Adicionar Novo Local** (topo do painel esquerdo)
- Digite ID (ex: new_forest)
- Digite nome (ex: Nova Floresta)
- Configure as informações básicas

### 3️⃣ CRIAR/EDITAR ENIGMA
- Selecione um local
- Vá para aba **🧩 Enigma**
- Marque "Este local tem um enigma"
- Escolha tipo: Direção, Charada, Sequência, Matemática, Código, ou Combinar Itens
- Preencha pergunta, opções e resposta
- Defina recompensa (ID e nome do item)
- Clique **💾 Salvar Enigma**

### 4️⃣ CONECTAR LOCAIS
- Selecione um local
- Vá para aba **🔗 Conexões**
- Clique **+ Conectar** nos locais que devem estar conectados
- Conexões são bidirecionais automaticamente

### 5️⃣ EXPORTAR CÓDIGO
- Clique **📦 Exportar Código** (canto inferior direito)
- Clique **📋 Copiar Código**
- Abra **js/map.js** e substitua todo o conteúdo
- Salve e teste no jogo

## Abas Disponíveis

| Aba | Função |
|-----|--------|
| 📝 **Informações Básicas** | Nome, descrição, imagem, ID |
| 🧩 **Enigma** | Criar/editar puzzles |
| 💎 **Itens** | Adicionar itens colecionáveis |
| 🎯 **Hotspots** | Áreas clicáveis na imagem |
| 🔗 **Conexões** | Conectar com outros locais |

## Tipos de Enigma

| Tipo | Quando Usar | Exemplo |
|------|-------------|---------|
| 🧭 **Direção** | 4 direções cardeais | "Qual direção a água fluía?" |
| 📜 **Charada** | Pergunta com opções | "O que sou eu?" |
| 🔢 **Sequência** | Ordem correta | "Pressione: Sol, Lua, Estrela" |
| ➕ **Matemática** | Cálculo numérico | "População ÷ 25 = ?" |
| 🔐 **Código** | Senha numérica | "Digite o código: 1234" |
| 🔧 **Combinar Itens** | Usar múltiplos itens | "Use engrenagem + chave" |

## Dicas Rápidas

✓ **Salvamento automático** - Não precisa clicar em "Salvar" toda hora, só ao finalizar cada seção

✓ **IDs únicos** - Use nomes como `forest_entrance`, sem espaços

✓ **Renomear local** - Mude o ID na aba "Informações Básicas". O sistema atualiza tudo automaticamente

✓ **Remover local** - Clique 🗑️ ao lado do local. Todas as conexões são removidas automaticamente

✓ **Testar rapidamente** - Exporte o código, atualize js/map.js, abra game-offline.html

✓ **Backup** - Clique em Exportar Código e salve o código em um arquivo .js

## Fluxo de Trabalho

```
1. Abrir location-editor.html
          ↓
2. Selecionar local para editar
          ↓
3. Modificar informações, enigmas, itens, hotspots, conexões
          ↓
4. Exportar código
          ↓
5. Atualizar js/map.js
          ↓
6. Testar no game-offline.html
          ↓
7. Repetir até ficar perfeito
```

## Exemplo Completo: Criar Um Novo Local

```
1. Clique "+ Adicionar Novo Local"
2. ID: haunted_cave
3. Nome: Caverna Assombrada
4. Clique no novo local na lista
5. Aba Informações Básicas:
   - Descrição: "Uma caverna escura e fria..."
   - Imagem: images/haunted_cave.jpg
   - Salvar
6. Aba Enigma:
   - Marcar "tem enigma"
   - Tipo: Código
   - Pergunta: "Quantas tochas há na entrada?"
   - Resposta: 7
   - Recompensa ID: cave_key
   - Recompensa Nome: Chave da Caverna
   - Salvar
7. Aba Itens:
   - + Adicionar Item
   - ID: old_torch
   - Nome: Tocha Antiga
8. Aba Conexões:
   - Conectar com "underground_tunnel"
9. Exportar código → Atualizar js/map.js → Testar
```

## Comandos de Emergência

**Perdi tudo!**
- Recarregue a página - os dados estão no localStorage do navegador
- Se limpou o cache, use um backup do código exportado

**Erro no código exportado!**
- Verifique IDs (sem espaços, sem caracteres especiais)
- Use apenas letras, números e underscore (_)

**Local não aparece no jogo!**
- Verifique se exportou o código
- Verifique se atualizou o js/map.js
- Verifique se o local está conectado a outro local já acessível

---

**Pronto para começar!** Abra **location-editor.html** e comece a personalizar seu jogo.

📖 Para mais detalhes, leia **EDITOR_INSTRUCOES.md**