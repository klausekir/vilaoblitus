# Guia de Transformações de Itens

## Visão Geral

O editor agora possui controles completos para transformar itens PNG, incluindo:
- 📏 **Redimensionamento** com handles visuais e inputs numéricos
- 🔄 **Rotação** de -180° a 180°
- 📐 **Escala independente** em X e Y para perspectiva
- ↔️ **Espelhamento** horizontal e vertical
- 🎯 **Seleção visual** com borda azul
- ⚙️ **Painel de controles** dedicado

## Como Usar

### 1. Acessar o Editor Visual

1. Abra `location-editor.html`
2. Selecione um local
3. Vá para a aba **🖼️ Posicionamento Visual**
4. Faça upload da imagem do local e PNGs dos itens (se ainda não fez)

### 2. Selecionar um Item

Clique em qualquer item posicionado na imagem para selecioná-lo. Quando selecionado:
- ✅ Borda azul aparece ao redor do item
- ✅ Handles de redimensionamento aparecem nos cantos
- ✅ Painel de transformações é preenchido à direita

### 3. Layout do Editor

```
┌─────────────┬──────────────────┬─────────────────┐
│   Itens     │   Canvas com     │  Transformações │
│ Disponíveis │   Imagem do      │   (Controles)   │
│             │   Local          │                 │
│ - Upload PNG│                  │ - Tamanho       │
│ - Preview   │  [Item aqui]     │ - Rotação       │
│             │                  │ - Escala        │
│             │                  │ - Espelhar      │
│             │                  │ - Reset         │
└─────────────┴──────────────────┴─────────────────┘
```

## Controles de Transformação

### 📏 Redimensionamento

**Método 1: Handles Visuais**
- Clique e segure em um dos 4 handles brancos nos cantos
- Arraste para redimensionar o item
- O tamanho muda proporcionalmente a partir do centro

**Método 2: Inputs Numéricos**
- Digite largura e altura em pixels
- Valores mínimos: 20px
- Valores recomendados: 40-200px

**Dica**: Use handles para ajuste rápido, inputs para precisão.

### 🔄 Rotação

**Slider de Rotação**:
- Arraste o slider de -180° a 180°
- Valor atual mostrado abaixo do slider
- Rotação é aplicada ao redor do centro do item

**Casos de uso**:
- **0°**: Item na vertical normal
- **45°**: Inclinação diagonal
- **90°**: Item deitado de lado
- **180°**: Item de cabeça para baixo
- **-45°**: Inclinação oposta

### 📐 Escala X e Y

**Para que serve**:
- Escala X: Achatar/alargar horizontalmente
- Escala Y: Achatar/alargar verticalmente
- Cria efeitos de perspectiva 3D

**Range**: 0.1x (muito pequeno) a 3.0x (muito grande)
**Padrão**: 1.0x (tamanho original)

**Exemplos práticos**:

```
Escala X = 1.0, Y = 0.5  →  Item achatado (visto de cima)
Escala X = 1.5, Y = 1.0  →  Item largo
Escala X = 0.7, Y = 1.3  →  Item alto e fino
Escala X = 1.2, Y = 0.8  →  Perspectiva isométrica
```

**Dica**: Combine escala com rotação para efeitos 3D realistas!

### ↔️ Espelhamento

**Botões de Flip**:
- **↔️ Flip X**: Espelha horizontalmente (esquerda ↔ direita)
- **↕️ Flip Y**: Espelha verticalmente (cima ↔ baixo)
- Clique novamente para desfazer

**Casos de uso**:
- Flip X: Inverter direção de objetos (espada apontando para esquerda → direita)
- Flip Y: Inverter objetos pendurados/caídos
- Flip X + Y: Rotação de 180° com transformação

### 🔄 Resetar Transformações

Botão vermelho no final do painel que restaura:
- Rotação → 0°
- Escala X → 1.0x
- Escala Y → 1.0x
- Flip X → desativado
- Flip Y → desativado

**Nota**: Tamanho (width/height) não é resetado.

## Fluxo de Trabalho

### Cenário 1: Item no Chão com Perspectiva

```
1. Posicione o item onde quer (arraste)
2. Selecione o item (clique)
3. Rotação → 0°
4. Escala X → 1.0
5. Escala Y → 0.6  (achatar para parecer deitado)
6. Tamanho → 100x100px
```

### Cenário 2: Item Pendurado na Parede

```
1. Posicione próximo à parede
2. Selecione o item
3. Rotação → -15° (pequena inclinação)
4. Escala X → 0.9
5. Escala Y → 1.1  (alongar verticalmente)
6. Tamanho → 60x60px
```

### Cenário 3: Item em Perspectiva Isométrica

```
1. Posicione o item
2. Selecione
3. Rotação → 26° (ângulo isométrico)
4. Escala X → 1.2
5. Escala Y → 0.8
6. Cria efeito 3D isométrico
```

### Cenário 4: Moeda no Chão

```
1. Posicione onde a moeda está
2. Selecione
3. Rotação → 0°
4. Escala X → 1.0
5. Escala Y → 0.3  (muito achatada, vista de cima)
6. Tamanho → 50x50px
```

## Estrutura dos Dados

Quando você transforma um item, os dados salvos incluem:

```javascript
item: {
    id: 'old_coin',
    name: 'Moeda Antiga',
    imageData: 'data:image/png;base64,...',
    position: { x: 45, y: 70 },
    size: { width: 80, height: 80 },
    transform: {
        rotation: 25,        // graus
        scaleX: 1.2,        // multiplicador
        scaleY: 0.8,        // multiplicador
        flipX: false,       // boolean
        flipY: false        // boolean
    }
}
```

## Renderização no Jogo

As transformações são aplicadas usando CSS `transform`:

```css
transform:
    translate(-50%, -50%)          /* centralizar */
    rotate(25deg)                  /* rotacionar */
    scaleX(1.2)                    /* escala horizontal */
    scaleY(0.8)                    /* escala vertical */
    scale(1.15);                   /* hover effect */
```

**Ordem das transformações**:
1. Translate (centraliza no ponto)
2. Rotate (gira ao redor do centro)
3. ScaleX (achata/alarga em X)
4. ScaleY (achata/alarga em Y)
5. Scale (hover zoom quando mouse passa)

## Dicas Avançadas

### Criar Profundidade

Use escalas diferentes para simular profundidade:
- **Frente**: ScaleX=1.0, ScaleY=1.0
- **Meio**: ScaleX=0.8, ScaleY=0.8
- **Fundo**: ScaleX=0.6, ScaleY=0.6

### Simular Superfícies

**Mesa/Chão**:
```
ScaleY = 0.3 a 0.6 (depende do ângulo)
```

**Parede Frontal**:
```
ScaleX = 1.0, ScaleY = 1.0 (sem distorção)
```

**Parede Lateral**:
```
ScaleX = 0.7, ScaleY = 1.0
Rotation = leve (5-10°)
```

### Efeito de Brilho/Destaque

Para itens importantes:
```
1. Tamanho maior (120-150px)
2. Escala ligeiramente maior (1.1x, 1.1x)
3. Rotação com movimento (use -5° a 5°)
```

### Consistência Visual

Mantenha o mesmo estilo para todos os itens:
- **Mesma perspectiva**: Se um item tem ScaleY=0.6, outros no chão também devem ter
- **Mesma rotação**: Se itens pendurados têm -15°, mantenha consistente
- **Mesmo tamanho base**: 60-80px para itens normais, 100-120px para importantes

## Atalhos e Produtividade

### Workflow Rápido

1. **Posicionar primeiro**: Arraste todos os itens para suas posições
2. **Depois transformar**: Selecione e ajuste transformações
3. **Testar**: Exporte, atualize map.js, teste no jogo
4. **Refinar**: Volte ao editor e ajuste

### Copiar Transformações (Manual)

Se quer o mesmo efeito em vários itens:
1. Anote os valores do primeiro item
2. Aplique manualmente aos outros itens
3. Ou copie o objeto `transform` no código exportado

### Preview Rápido

Para ver como ficará no jogo:
- O editor mostra em tempo real as transformações
- O hover effect no editor é o mesmo do jogo
- As transformações são aplicadas exatamente igual

## Troubleshooting

### Item está distorcido demais
- **Causa**: Escala X ou Y muito extrema
- **Solução**: Mantenha escalas entre 0.3 e 2.0

### Item não aparece no jogo
- Verifique se exportou o código
- Verifique se atualizou js/map.js
- Recarregue com Ctrl+F5 (limpa cache)

### Transformação não funciona no jogo
- Verifique se o item tem `transform` definido
- Verifique se não há erros no console (F12)
- Teste com transformações padrão primeiro

### Handles de redimensionamento não aparecem
- Certifique-se de que o item está selecionado
- Clique no item para selecioná-lo
- Borda azul deve aparecer

### Rotação fica estranha com flip
- Flip inverte a escala, não rota
- Use rotação + flip para efeitos específicos
- Se confuso, reset e comece de novo

## Referência Rápida

### Transformações Comuns

| Efeito Desejado | Rotação | ScaleX | ScaleY | Flip |
|-----------------|---------|--------|--------|------|
| Normal | 0° | 1.0 | 1.0 | Não |
| Chão/Mesa | 0° | 1.0 | 0.4 | Não |
| Parede esquerda | 0° | 0.7 | 1.0 | Não |
| Pendurado | -10° | 0.9 | 1.1 | Não |
| Invertido | 180° | 1.0 | 1.0 | Não |
| Espelhado | 0° | 1.0 | 1.0 | X |
| Isométrico | 26° | 1.2 | 0.8 | Não |

### Tamanhos Recomendados

| Tipo de Item | Tamanho (px) |
|--------------|--------------|
| Pequeno (moeda, chave) | 40-60 |
| Médio (livro, garrafa) | 60-90 |
| Grande (baú, porta) | 90-150 |
| Muito grande (estátua) | 150-250 |

### Hotkeys Futuras (Não implementado ainda)

```
R - Rotação tool
S - Escala tool
F - Flip X
Shift+F - Flip Y
Ctrl+R - Reset transforms
Delete - Remove item
```

---

**Dica Final**: Experimente! As transformações são em tempo real e salvam automaticamente. Você pode testar à vontade sem medo de quebrar nada. Use o botão Reset se algo der errado.

🎨 **Divirta-se criando itens com perspectiva realista!**