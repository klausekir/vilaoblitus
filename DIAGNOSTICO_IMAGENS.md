# 🔍 Diagnóstico - Imagens não aparecem

## Como diagnosticar:

### 1. Abra o Console do navegador (F12)

Procure por estas mensagens:

```
✅ BOM:
   ✓ Dados do editor carregados do IndexedDB
   📍 Locações encontradas: 25
   ✓ 25 imagens para carregar

❌ PROBLEMA:
   ❌ Erro ao carregar: floresta images/floresta.jpg
   ⚠️ Imagem não encontrada para: floresta
```

---

## Possíveis causas e soluções:

### Causa 1: Imagens não existem fisicamente

**Sintoma:**
```
❌ Erro ao carregar: floresta images/floresta.jpg
```

**Solução:**
Verifique se o arquivo existe:
```
images/
├── floresta.jpg       ← Este arquivo existe?
├── portao_entrada.jpg
└── ...
```

---

### Causa 2: Caminhos errados no GAME_MAP

**Sintoma:**
No console você vê:
```
📷 floresta: images/floresta.jpg
```

Mas o arquivo está em outro lugar.

**Solução:**
Abra `js/map.js` e verifique:
```javascript
"floresta": {
    "image": "images/floresta.jpg",  // ← Caminho correto?
    // ...
}
```

---

### Causa 3: GAME_MAP está vazio

**Sintoma:**
```
📋 GAME_MAP disponível:
   Total de locações: 0
```

**Solução:**
1. Verifique se `js/map.js` existe
2. Abra `location-editor.html`
3. Clique em "📦 Exportar Código"
4. Copie o código
5. Cole em `js/map.js` (substitua tudo)

---

### Causa 4: IndexedDB com dados antigos

**Sintoma:**
```
✓ Dados do editor carregados do IndexedDB
📍 Locações encontradas: 25
```

Mas os caminhos das imagens estão errados.

**Solução:**
1. Abra `location-editor.html`
2. Verifique se as imagens estão corretas
3. Clique em "💾 Salvar no Jogo"
4. Atualize `game-phaser.html` (F5)

---

## Teste rápido:

### 1. Verificar se arquivos existem:

Abra o terminal na pasta do projeto:
```bash
dir images
```

Você deve ver:
```
floresta.jpg
portao_entrada.jpg
rua_vila.jpg
...
```

### 2. Ver GAME_MAP atual:

No Console do navegador (F12):
```javascript
GAME_MAP
```

Deve mostrar:
```javascript
{
  floresta: {
    id: "floresta",
    name: "Floresta",
    image: "images/floresta.jpg",
    ...
  },
  ...
}
```

### 3. Verificar uma imagem específica:

No Console:
```javascript
GAME_MAP.floresta.image
// Deve retornar: "images/floresta.jpg"
```

---

## Debug avançado:

### Ver todas as imagens que o Phaser tentou carregar:

No Console durante o loading:
```
Procure por linhas como:
   📷 floresta: images/floresta.jpg
   📷 portao_entrada: images/portao_entrada.jpg
   ...
```

### Ver erros de carregamento:

Procure por:
```
❌ Erro ao carregar: [nome] [caminho]
```

---

## Solução definitiva:

### Se nada funcionar:

1. **Reexporte o map.js do editor:**
```
   a) Abra location-editor.html
   b) Clique em "📦 Exportar Código"
   c) Copie TODO o código
   d) Abra js/map.js
   e) Cole (substitua tudo)
   f) Salve
```

2. **Limpe o IndexedDB:**
```
   a) F12 → Application/Armazenamento
   b) IndexedDB → VilaAbandonadaDB
   c) Delete Database
   d) Recarregue a página
```

3. **Verifique os arquivos de imagem:**
```bash
   # No terminal:
   dir images

   # Deve listar TODOS os arquivos:
   floresta.jpg
   portao_entrada.jpg
   rua_vila.jpg
   casa_abandonada_01_frente.jpg
   ...
```

4. **Teste com um caminho absoluto:**
```javascript
// Em js/map.js, teste com caminho completo:
"floresta": {
    "image": "C:/src/claude_oblitus2/images/floresta.jpg",
    // ...
}
```

---

## Mensagens que você DEVE ver se tudo estiver OK:

```
🎮 Vila Abandonada - Phaser Edition
📦 Carregando dados do jogo...
✓ Dados do editor carregados do IndexedDB
📍 Locações encontradas: 25
📋 GAME_MAP disponível:
   Total de locações: 25
   Locações: floresta, portao_entrada, rua_vila, ...
   📷 floresta: images/floresta.jpg
   📷 portao_entrada: images/portao_entrada.jpg
   ...
✓ 25 imagens para carregar
✓ Phaser inicializado
📐 Resolução: 1280 x 720
```

Se você ver isso, as imagens DEVEM aparecer!

---

## Ainda não funciona?

Me mande o output do console (F12) para eu ver o que está acontecendo.

Copie TUDO que aparecer no console e me envie.
