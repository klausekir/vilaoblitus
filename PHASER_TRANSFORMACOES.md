# 🎨 Transformações de Itens no Phaser

## ✅ O que funciona:

### **Transformações 2D:**

| Transformação | Status | Descrição |
|---------------|--------|-----------|
| **Position (x, y)** | ✅ Funciona perfeitamente | Posicionamento em pixels ou % |
| **Size (width, height)** | ✅ Funciona perfeitamente | Tamanho do sprite |
| **Rotation (Z)** | ✅ Funciona perfeitamente | Rotação no plano 2D (graus) |
| **Scale X/Y** | ✅ Funciona perfeitamente | Escala horizontal/vertical |
| **Flip X/Y** | ✅ Funciona perfeitamente | Espelhar horizontal/vertical |
| **Opacity** | ✅ Funciona perfeitamente | Transparência (0-1) |
| **Skew X/Y** | ⚠️ Suporte limitado | Inclinação (não totalmente implementado) |

---

## ❌ O que NÃO funciona (limitações do Phaser):

### **Transformações 3D/CSS:**

| Transformação | Status | Motivo |
|---------------|--------|--------|
| **rotateX** | ⚠️ Simulado | Aproximação 2D usando scale + offset |
| **rotateY** | ⚠️ Simulado | Aproximação 2D usando scale + offset |
| **perspective** | ⚠️ Simulado | Efeito básico de perspectiva |
| **transform3D** | ❌ Não suportado | Phaser renderiza em 2D (WebGL/Canvas 2D) |

---

## 🎨 Como funciona a simulação de perspectiva:

### **rotateX (inclinação vertical):**
```
rotateX: 45°  →  Topo do item parece "longe"
                 Aplica: scaleY menor + ajuste de posição Y
                 Simula: Item inclinado para trás

rotateX: -45° →  Topo do item parece "perto"
                 Aplica: scaleY menor + ajuste de posição Y
                 Simula: Item inclinado para frente
```

### **rotateY (inclinação horizontal):**
```
rotateY: 45°  →  Lado direito parece "longe"
                 Aplica: scaleX menor + ajuste de posição X
                 Simula: Item virando para esquerda

rotateY: -45° →  Lado esquerdo parece "longe"
                 Aplica: scaleX menor + ajuste de posição X
                 Simula: Item virando para direita
```

**NOTA:** Não é perspectiva real 3D, mas uma aproximação visual que funciona bem para jogos 2D!

---

## 🎯 Como definir transformações que funcionam:

### No **location-editor.html**:

```javascript
"items": [
    {
        "id": "mapa_antigo",
        "name": "Mapa Antigo",
        "image": "images/items/mapa_antigo.png",
        "position": { "x": 20, "y": 30 },      // ✅ Funciona
        "size": { "width": 120, "height": 80 }, // ✅ Funciona
        "transform": {
            "rotation": 15,        // ✅ Funciona (graus)
            "scaleX": 1.2,         // ✅ Funciona
            "scaleY": 0.8,         // ✅ Funciona
            "flipX": false,        // ✅ Funciona
            "flipY": false,        // ✅ Funciona
            "opacity": 0.9,        // ✅ Funciona

            // PERSPECTIVA SIMULADA:
            "rotateX": 45,         // ⚠️ Simulado (inclinação vertical)
            "rotateY": 30,         // ⚠️ Simulado (inclinação horizontal)
            "skewX": 10,           // ⚠️ Suporte limitado
            "skewY": 5             // ⚠️ Suporte limitado
        }
    }
]
```

---

## 💡 Alternativas para perspectiva:

Se você quer simular perspectiva 3D no Phaser:

### **Opção 1: Pré-renderizar com perspectiva**
```
1. Crie a imagem com perspectiva no Photoshop/GIMP
2. Salve como PNG
3. Use no jogo (sem transformações)
```

### **Opção 2: Usar scale para simular profundidade**
```javascript
// Objeto "longe" (menor)
"transform": {
    "scaleX": 0.6,
    "scaleY": 0.6,
    "opacity": 0.8
}

// Objeto "perto" (maior)
"transform": {
    "scaleX": 1.2,
    "scaleY": 1.2,
    "opacity": 1.0
}
```

### **Opção 3: Usar múltiplas imagens**
```
item_perspectiva_1.png  (vista frontal)
item_perspectiva_2.png  (vista inclinada)
item_perspectiva_3.png  (vista lateral)
```

---

## 🔧 Transformações aplicadas no Phaser:

### **Código real (LocationScene.js):**

```javascript
// 1. Tamanho
const targetWidth = item.size?.width || 80;
const targetHeight = item.size?.height || 80;
const scaleX = targetWidth / sprite.width;
const scaleY = targetHeight / sprite.height;

// 2. Scale + Flip
const finalScaleX = scaleX * (transform.scaleX || 1) * (transform.flipX ? -1 : 1);
const finalScaleY = scaleY * (transform.scaleY || 1) * (transform.flipY ? -1 : 1);
sprite.setScale(finalScaleX, finalScaleY);

// 3. Rotação 2D
if (transform.rotation) {
    sprite.setAngle(transform.rotation);
}

// 4. Opacidade
if (transform.opacity !== undefined) {
    sprite.setAlpha(transform.opacity);
}

// 5. Skew (limitado)
// Não totalmente implementado devido a limitações do Phaser
```

---

## 📊 Comparação HTML vs Phaser:

| Feature | HTML (game-offline.html) | Phaser (game-phaser.html) |
|---------|--------------------------|---------------------------|
| **Rotação 2D** | ✅ CSS transform | ✅ sprite.setAngle() |
| **Rotação 3D** | ✅ CSS transform3D | ❌ Não suportado |
| **Scale** | ✅ CSS scale | ✅ sprite.setScale() |
| **Opacity** | ✅ CSS opacity | ✅ sprite.setAlpha() |
| **Skew** | ✅ CSS skew | ⚠️ Parcial |
| **Perspective** | ✅ CSS perspective | ❌ Não suportado |
| **Performance** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🎮 Recomendações:

### **Para itens simples:**
Use apenas:
- `position` (x, y)
- `size` (width, height)
- `rotation` (graus 2D)
- `opacity`

### **Para itens com perspectiva:**
**Opção A:** Crie a imagem já com perspectiva
**Opção B:** Use a versão HTML (game-offline.html)

### **Para melhor performance:**
Use Phaser e evite transformações 3D

---

## 🆘 Dúvidas?

### "Por que rotateX/rotateY não funcionam?"
Phaser é uma engine 2D. Transformações 3D CSS não são suportadas.

### "Como fazer perspectiva então?"
Pré-renderize as imagens com perspectiva ou use a versão HTML.

### "Posso misturar Phaser + CSS?"
Tecnicamente sim, mas perde a vantagem de performance do Phaser.

---

## 💡 Resumo:

✅ **Use Phaser para:**
- Performance máxima
- Animações 2D suaves
- Jogos simples/médios

✅ **Use HTML (game-offline.html) para:**
- Transformações 3D complexas
- Perspectiva CSS
- Efeitos visuais avançados

**Ambas versões funcionam!** Escolha baseado nas suas necessidades. 🎮✨
