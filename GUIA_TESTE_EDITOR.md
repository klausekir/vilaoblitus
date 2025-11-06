# Guia de Teste - Location Editor

## Como testar se os itens estão aparecendo

### Passo 1: Abrir o Editor
1. Abra `location-editor.html` no navegador
2. Pressione **F12** para abrir o Console do navegador (DevTools)

### Passo 2: Selecionar um Local
1. Na lista de locais à esquerda, clique em qualquer local (ex: "Entrada da Floresta")
2. Vá para a aba **"🖼️ Posicionamento Visual"**

### Passo 3: Verificar a Imagem do Local
- Se aparecer "Faça upload da imagem do local":
  1. Volte para aba **"Informações Básicas"**
  2. Clique em **"📁 Fazer Upload da Imagem"**
  3. Selecione uma imagem JPG/PNG do local
  4. Volte para aba **"🖼️ Posicionamento Visual"**

### Passo 4: Fazer Upload do PNG do Item
1. No painel **"Itens Disponíveis"** (lado esquerdo)
2. Você verá uma lista de itens do local
3. Clique em **"📁 Upload PNG"** de um item
4. Selecione um arquivo PNG com fundo transparente

### Passo 5: Verificar o Console
No console (F12), você deve ver mensagens como:
```
renderPositionedItems: location.items = [...]
Item 0: Nome do Item imageData: presente position: {x: 50, y: 50}
Adicionando item 0 ao container. Elemento: <div>...</div>
renderPositionedItems: Total de itens adicionados: 1
```

### O que deve acontecer:
✅ O item deve aparecer **no centro** da imagem do local
✅ Você deve conseguir **clicar e arrastar** o item
✅ Quando selecionado, aparece uma **borda azul** ao redor
✅ Os controles aparecem no painel direito **"Transformações"**

### Problemas Comuns:

#### Problema 1: "Nenhum item. Adicione itens na aba Itens"
**Solução**: Vá para a aba "Itens" e adicione itens ao local primeiro

#### Problema 2: Item não aparece após upload
**Possíveis causas**:
- Arquivo muito grande (use PNG otimizado, máximo 500KB)
- Erro no console (veja F12)
- Imagem do local não carregada

#### Problema 3: Não consigo arrastar o item
**Solução**:
- Clique no item primeiro (não no handle de redimensionamento)
- Arraste mantendo o botão pressionado

## Debug

### Ver dados salvos:
No console, digite:
```javascript
console.log(gameLocations)
```

### Ver itens do local atual:
```javascript
console.log(gameLocations[currentLocationId].items)
```

### Forçar re-renderização:
```javascript
renderPositionedItems()
```

## Fluxo Esperado

```
1. Selecionar Local
   ↓
2. Ir para aba "Posicionamento Visual"
   ↓
3. Upload imagem do local (se necessário)
   ↓
4. Upload PNG do item
   ↓
5. Item aparece NO CENTRO da imagem
   ↓
6. Arrastar item para posição desejada
   ↓
7. Clicar no item para selecionar
   ↓
8. Usar controles de transformação
   ↓
9. Exportar código (botão "📤 Exportar Código")
```

## O que NÃO é possível (ainda):

❌ Arrastar da lista de itens para o canvas (não é drag-and-drop entre painéis)
❌ Copiar/colar transformações entre itens
❌ Desfazer/refazer (use o botão Reset se necessário)
❌ Múltipla seleção de itens

## Contato para Debug

Se nada aparecer, envie:
1. Screenshot do console (F12)
2. Screenshot da tela completa
3. Qual navegador está usando
