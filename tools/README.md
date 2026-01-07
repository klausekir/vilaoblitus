# Tools - Codex Oblitus

Scripts para processamento de imagens e criação de spritesheets/atlases para o jogo.

## 🎯 Workflow Completo: GIF → Spritesheet Otimizado

### Processo Recomendado (4 passos):

```bash
# 1. Remover fundo do GIF
python tools/remove-gif-background.py images/objects/spider.gif images/objects/spider_no_bg.gif 20

# 2. Extrair frames do GIF (renderizados corretamente)
python tools/gif-to-frames.py images/objects/spider_no_bg.gif 17

# 3. Criar atlas PNG + JSON a partir dos frames
node tools/create-atlas-from-pngs.js

# 4. Otimizar PNG para PNG-8 (reduz ~80%)
node tools/optimize-png.js
```

**Resultado:** Spritesheet otimizado (~40KB) com fundo transparente, pronto para Phaser!

---

## 📋 Scripts Disponíveis

### 🎯 Principal - Workflow GIF → Spritesheet

1. `remove-gif-background.py` - Remove fundo de GIF
2. `gif-to-frames.py` - Extrai frames renderizados
3. `create-atlas-from-pngs.js` - Cria atlas PNG+JSON
4. `optimize-png.js` - Otimiza para PNG-8

---

### 🖼️ Python - Processamento de Imagens

#### `transparencia.py`
Remove fundo de imagens estáticas (PNG/JPG).

```bash
python tools/transparencia.py input.jpg output.png [tolerancia]
```

**Features:**
- Remove fundo de cor sólida
- Remove bordas brancas automaticamente
- Suaviza bordas (anti-aliasing)
- Tolerância ajustável

**Exemplo:**
```bash
python tools/transparencia.py moeda.jpg moeda_transparente.png 15
```

---

#### `remove-gif-background.py`
Remove fundo de GIFs animados (processa todos os frames).

```bash
python tools/remove-gif-background.py input.gif output.gif [tolerancia]
```

**Features:**
- Processa todos os frames do GIF
- Mantém transparência
- Detecta cor de fundo automaticamente

**Exemplo:**
```bash
python tools/remove-gif-background.py spider.gif spider_no_bg.gif 20
```

---

#### `gif-to-frames.py`
Extrai frames de GIF e salva como PNGs individuais.

```bash
python tools/gif-to-frames.py input.gif [max_frames]
```

**Features:**
- Renderiza frames corretamente (resolve disposal methods do GIF)
- Reduz número de frames automaticamente
- Salva em pasta `frames_[nome]`

**Exemplo:**
```bash
python tools/gif-to-frames.py spider_no_bg.gif 17
# Cria pasta: frames_spider_no_bg/
```

---

#### `convert-png-to-jpg.py`
Converte imagens PNG para JPG (remove transparência).

```bash
python tools/convert-png-to-jpg.py input.png output.jpg
```

---

#### `webp2png.py`
Converte WebP para PNG.

```bash
python tools/webp2png.py input.webp output.png
```

---

#### `optimize_images.py`
Otimiza múltiplas imagens de uma vez.

```bash
python tools/optimize_images.py [diretorio]
```

---

#### `reduce-puzzle-png.py`
Reduz tamanho de imagens PNG de puzzle.

```bash
python tools/reduce-puzzle-png.py input.png output.png
```

---

### 🔧 PowerShell - Utilitários

#### `check-img-size.ps1`
Verifica tamanhos de imagens em um diretório.

```powershell
.\tools\check-img-size.ps1
```

---

#### `check-zip-images.ps1`
Verifica imagens dentro de arquivos ZIP.

```powershell
.\tools\check-zip-images.ps1 arquivo.zip
```

---

#### `list-zip.ps1`
Lista conteúdo de arquivos ZIP.

```powershell
.\tools\list-zip.ps1 arquivo.zip
```

---

#### `compara.ps1`
Compara diferenças entre arquivos/diretórios.

```powershell
.\tools\compara.ps1 arquivo1 arquivo2
```

---

### 🎮 Node.js - Criação de Atlases

#### `create-atlas-from-pngs.js`
Cria texture atlas (PNG + JSON) a partir de frames PNG.

```javascript
// Editar o final do arquivo para especificar:
createAtlasFromPNGs('frames_spider_no_bg', 'spider')
```

**Features:**
- Organiza frames em grade otimizada
- Gera JSON compatível com Phaser
- Calcula layout automático

**Uso:**
```bash
node tools/create-atlas-from-pngs.js
```

**Output:**
- `images/objects/spider_atlas.png`
- `images/objects/spider_atlas.json`

---

#### `optimize-png.js`
Otimiza PNG para PNG-8 usando pngquant (reduz ~70-90%).

```javascript
// Editar arquivo para especificar imagem:
const inputPath = 'images/objects/spider_atlas.png';
```

**Features:**
- Converte PNG-32 → PNG-8 (indexed color)
- Compressão máxima
- Mantém qualidade visual
- Redução típica: 70-93%

**Uso:**
```bash
node tools/optimize-png.js
```

---

#### `convert-gif-to-atlas.js`
⚠️ **Obsoleto** - Conversão direta GIF→Atlas (tem problemas com frames delta).

Use o workflow de 4 passos acima ao invés deste script.

---

## 📊 Comparação de Tamanhos

### Exemplo: spider.gif

| Formato | Frames | Fundo | Tamanho | Notas |
|---------|--------|-------|---------|-------|
| GIF original | 67 | Cinza | 293 KB | Formato original |
| GIF sem fundo | 67 | Transparente | 226 KB | Após remove-gif-background |
| Atlas PNG-32 | 17 | Transparente | 204 KB | Antes de otimizar |
| **Atlas PNG-8** | **17** | **Transparente** | **38 KB** ✅ | **Resultado final!** |

**Economia: 87% menor que o GIF original!**

---

## 🎮 Uso no Phaser

```javascript
// Preload
this.load.atlas('spider',
    'images/objects/spider_atlas.png',
    'images/objects/spider_atlas.json'
);

// Create
this.anims.create({
    key: 'spider_walk',
    frames: this.anims.generateFrameNames('spider', {
        prefix: 'spider_',
        start: 0,
        end: 16
    }),
    frameRate: 10,
    repeat: -1
});

// Use
const spider = this.add.sprite(x, y, 'spider', 'spider_0');
spider.play('spider_walk');
```

---

## 🔧 Dependências

### Python
```bash
pip install Pillow
```

### Node.js
```bash
npm install pngjs pngquant-bin gifwrap --no-save
```

---

## 📝 Notas

### Por que 4 passos ao invés de script único?

1. **Flexibilidade** - Você pode pular etapas (ex: se GIF já tem fundo transparente)
2. **Debugging** - Mais fácil identificar problemas em cada etapa
3. **Reutilização** - Cada script serve para outros propósitos
4. **Qualidade** - Renderização correta dos frames GIF (PIL é mais confiável que gifwrap)

### Ajustando o número de frames

- **Muitos frames** (20+): Arquivo grande, animação fluida
- **Poucos frames** (10-15): Arquivo pequeno, animação pode ficar "travada"
- **Recomendado**: 15-20 frames para animações de personagens

### Tolerância de cor

- **Baixa** (5-10): Remove apenas cores muito similares ao fundo
- **Média** (15-25): Padrão, funciona para maioria dos casos
- **Alta** (30+): Pode remover partes do objeto por engano

---

## 🚀 Automação Futura

Para criar um script único que faz tudo:

```bash
# TODO: Criar gif-to-optimized-atlas.sh
./tools/gif-to-optimized-atlas.sh spider.gif spider 17
```

Isso executaria os 4 passos automaticamente.

---

## 🎬 MP4 para Atlas (Novo!)

### Converter vídeo MP4 para sprite atlas:

```bash
python tools/mp4-to-atlas.py video.mp4 nome_saida [tolerancia] [max_frames] [--mask x1,y1,x2,y2]
```

**Exemplos:**
```bash
# Básico
python tools/mp4-to-atlas.py fogo.mp4 fogo

# Com parâmetros personalizados
python tools/mp4-to-atlas.py efeito.mp4 efeito 30 20

# Com máscara para remover logo/marca d'água
python tools/mp4-to-atlas.py ghost.mp4 ghost 30 20 --mask 700,400,864,480
```

### Selecionar região de logo interativamente:

```bash
python tools/select-mask-region.py video.mp4
```

Abre uma janela onde você pode desenhar um retângulo sobre a logo. As coordenadas são copiadas para a área de transferência.

---

## 🌐 Recursos Online Recomendados

### Geração de GIFs/Vídeos Animados com IA

| Recurso | Descrição | Link |
|---------|-----------|------|
| **Fotor AI Video Generator** | Excelente para criar GIFs animados a partir de texto. Ótima qualidade de imagens animadas para uso em jogos. | [fotor.com/apps/ai-video-generator](https://www.fotor.com/apps/ai-video-generator/#from-text) |

**Dica:** Após gerar o vídeo/GIF no Fotor, use as ferramentas deste repositório para:
1. Remover fundo com `remove-gif-background.py` ou `mp4-to-atlas.py`
2. Converter para sprite atlas otimizado
3. Usar no Phaser com animação suave

