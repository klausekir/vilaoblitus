# Guia de Posicionamento Visual de Itens

## Visão Geral

O editor agora permite fazer upload de imagens PNG transparentes para os itens e posicioná-los visualmente sobre a imagem do local. No jogo, os itens aparecem como PNGs e têm um efeito de zoom suave quando o mouse passa sobre eles.

## Como Usar

### 1. Upload da Imagem do Local

1. Abra `location-editor.html` no navegador
2. Selecione um local na lista à esquerda
3. Vá para a aba **📝 Informações Básicas**
4. Clique em **📁 Fazer Upload da Imagem**
5. Escolha a imagem JPG/PNG do local (recomendado: 1920x1080)
6. A imagem aparecerá como preview
7. Clique em **💾 Salvar Informações**

### 2. Adicionar Itens ao Local

Antes de posicionar itens visualmente, você precisa criá-los:

1. Vá para a aba **💎 Itens**
2. Clique em **+ Adicionar Item**
3. Digite o ID do item (ex: `old_coin`)
4. Digite o nome do item (ex: `Moeda Antiga`)
5. O item é criado

Repita para cada item que deseja adicionar ao local.

### 3. Posicionamento Visual

Agora vem a parte divertida - posicionar os itens sobre a imagem:

1. Vá para a aba **🖼️ Posicionamento Visual**
2. Você verá:
   - **Painel esquerdo**: Lista de itens disponíveis
   - **Painel direito**: Imagem do local com overlay para posicionamento

#### Upload do PNG do Item

Para cada item na lista:

1. Clique em **📁 Upload PNG**
2. Escolha um arquivo PNG transparente do item
   - **Formato**: PNG com fundo transparente
   - **Tamanho recomendado**: 80x80 a 200x200 pixels
   - **Peso**: < 100KB
3. O item aparecerá no painel esquerdo com preview

#### Posicionar o Item

1. Depois de fazer upload do PNG, o item aparece automaticamente sobre a imagem do local
2. **Arraste o item** com o mouse para posicioná-lo onde desejar
3. A posição é salva automaticamente
4. O item tem um label mostrando seu nome

#### Ajustar Posição

- **Arrastar**: Clique e arraste o item para movê-lo
- **Hover**: Passe o mouse sobre o item para ver o efeito de zoom (prévia de como ficará no jogo)
- **Posição**: A posição é mostrada em porcentagem (0-100% em X e Y)

### 4. Testar no Jogo

1. Clique em **📦 Exportar Código** (canto inferior direito)
2. Copie o código gerado
3. Abra `js/map.js` em um editor de texto
4. Substitua todo o conteúdo pelo código copiado
5. Salve o arquivo
6. Abra `game-offline.html` ou `game.html` para testar

## Como Funciona no Jogo

### Renderização dos Itens

**Com PNG (novo sistema)**:
- Itens aparecem como imagens PNG transparentes na posição definida
- Efeito de **zoom suave** (15% maior) quando o mouse passa sobre o item
- Sombra projetada para dar profundidade
- Clicável para coletar

**Sem PNG (fallback)**:
- Itens aparecem como hotspots tradicionais (áreas retangulares)
- Label com "✨" e nome do item
- Clicável para coletar

### Efeito de Hover

Quando o jogador passa o mouse sobre um item PNG:
- **Escala**: Aumenta para 115% (zoom suave)
- **Brilho**: Aumenta ligeiramente
- **Transição**: 0.3s ease (suave e natural)
- **Cursor**: Muda para pointer (mãozinha)

## Estrutura dos Dados

Os itens agora podem ter as seguintes propriedades:

```javascript
{
    id: 'old_coin',                    // ID único do item
    name: 'Moeda Antiga',              // Nome exibido
    found: false,                      // Se já foi coletado
    imageData: 'data:image/png;base64,...',  // PNG em base64 (opcional)
    position: {                        // Posição na imagem (opcional)
        x: 45.5,                       // % horizontal (0-100)
        y: 67.2                        // % vertical (0-100)
    },
    size: {                            // Tamanho do PNG (opcional)
        width: 80,                     // Largura em pixels
        height: 80                     // Altura em pixels
    }
}
```

## Dicas e Boas Práticas

### Criando PNGs de Itens

1. **Fundo Transparente**: Use Photoshop, GIMP, ou removedor de fundo online
2. **Tamanho**: 80x80 a 200x200 pixels (dependendo da importância do item)
3. **Estilo**: Mantenha consistência visual entre todos os itens
4. **Detalhes**: Itens pequenos devem ser simples e reconhecíveis
5. **Brilho**: Pode adicionar brilho/glow no PNG para destacar

### Posicionamento Estratégico

1. **Visibilidade**: Coloque itens onde são facilmente notados mas não óbvios
2. **Contexto**: Itens devem fazer sentido no contexto do local
   - Moeda antiga: perto de uma fonte, no chão
   - Chave: pendurada, em uma gaveta, escondida
   - Livro: em estante, mesa
3. **Não sobrepor**: Evite colocar múltiplos itens muito próximos
4. **Proporção**: Itens importantes podem ser maiores

### Workflow Recomendado

```
1. Crie todos os locais e adicione as imagens dos locais
2. Adicione todos os itens em cada local (aba Itens)
3. Prepare os PNGs dos itens (externamente)
4. Volte ao editor, aba Posicionamento Visual
5. Faça upload dos PNGs de cada item
6. Posicione todos os itens arrastando-os
7. Exporte o código
8. Atualize js/map.js
9. Teste no jogo
10. Ajuste posições conforme necessário
```

## Ferramentas Úteis

### Para Criar PNGs Transparentes

- **Remove.bg**: https://www.remove.bg/ (remover fundo online)
- **GIMP**: Software gratuito para edição de imagens
- **Photoshop**: Software profissional
- **Canva**: Criar ícones simples com transparência
- **Flaticon**: Baixar ícones PNG (https://www.flaticon.com/)

### Para Encontrar/Criar Itens

- **OpenGameArt**: https://opengameart.org/ (assets gratuitos)
- **Itch.io**: https://itch.io/game-assets/free (assets gratuitos)
- **Kenney**: https://kenney.nl/ (assets de jogo)
- **Game-icons.net**: https://game-icons.net/ (ícones SVG para converter)

## Exemplos de Itens

### Moeda Antiga
- **Imagem**: PNG de uma moeda dourada com símbolos antigos
- **Posição**: 45% horizontal, 72% vertical (no chão, canto)
- **Tamanho**: 60x60px

### Chave Enferrujada
- **Imagem**: PNG de uma chave velha enferrujada
- **Posição**: 85% horizontal, 35% vertical (pendurada na parede)
- **Tamanho**: 50x50px

### Livro Antigo
- **Imagem**: PNG de um livro com capa de couro
- **Posição**: 30% horizontal, 55% vertical (em uma estante)
- **Tamanho**: 80x80px

### Cristal Brilhante
- **Imagem**: PNG de um cristal azul com brilho
- **Posição**: 50% horizontal, 45% vertical (no centro do altar)
- **Tamanho**: 100x100px (item importante)

## Troubleshooting

### Imagem não aparece no Posicionamento Visual
- Verifique se fez upload da imagem do local na aba "Informações Básicas"
- Verifique se salvou as informações básicas
- Recarregue o editor (F5)

### PNG do item não aparece
- Verifique se o arquivo é PNG (não JPG)
- Verifique o tamanho do arquivo (< 5MB recomendado)
- Tente com outro arquivo PNG

### Item não aparece no jogo
- Certifique-se de exportar o código atualizado
- Verifique se atualizou o js/map.js
- Recarregue o jogo com Ctrl+F5 (limpa cache)
- Verifique se o item não foi coletado anteriormente (pode resetar o jogo)

### Posição do item está errada no jogo
- As posições são relativas (%), então funcionam em qualquer resolução
- Teste em diferentes resoluções
- Ajuste a posição no editor e exporte novamente

### Item muito grande ou pequeno
- Edite o item no editor
- Após o upload do PNG, modifique manualmente o tamanho editando o código exportado:
  ```javascript
  size: { width: 100, height: 100 }  // Ajuste estes valores
  ```

## Compatibilidade

- **Navegadores**: Chrome, Firefox, Edge, Safari (modernos)
- **Formatos de imagem**:
  - Locais: JPG, PNG
  - Itens: PNG (com transparência)
- **Base64**: As imagens são armazenadas em base64 no localStorage
- **Tamanho**: Cuidado com localStorage (limite ~5-10MB total por domínio)

## Próximos Passos

Depois de posicionar todos os itens:

1. **Teste completo**: Jogue o jogo do início ao fim
2. **Ajustes**: Volte ao editor para ajustar posições conforme necessário
3. **Hotspots**: Configure hotspots adicionais na aba "Hotspots"
4. **Enigmas**: Configure enigmas na aba "Enigma"
5. **Publicação**: Quando estiver satisfeito, faça deploy no Hostinger

## Notas Importantes

- **Salvamento automático**: O editor salva automaticamente no localStorage
- **Backup**: Use "Exportar Código" regularmente para fazer backup
- **Performance**: Muitas imagens grandes podem deixar o jogo lento
- **Mobile**: O efeito de hover não funciona em dispositivos touch (mas itens ainda são clicáveis)

---

**Dica final**: Comece com poucos itens simples e teste no jogo antes de adicionar todos. Isso facilita ajustes e você pega o jeito mais rápido!

🎮 **Bom trabalho!**