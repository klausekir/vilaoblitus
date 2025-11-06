# 🎮 Vila Abandonada - Phaser Edition

## ✅ Migração Completa!

Seu jogo foi migrado para **Phaser.js 3** com sucesso!

---

## 📂 Arquivos criados:

### Arquivo principal:
- **game-phaser.html** - Arquivo HTML principal (abra este no navegador)

### Código Phaser:
```
js/phaser/
├── config.js                          # Configuração do Phaser
├── managers/
│   ├── GameStateManager.js            # Gerencia estado do jogo (inventário, save/load)
│   └── UIManager.js                   # Gerencia interface (inventário, notificações)
└── scenes/
    ├── BootScene.js                   # Cena de loading
    └── LocationScene.js               # Cena principal do jogo
```

---

## 🚀 Como usar:

### 1. Abrir o jogo:
```bash
# Simplesmente abra no navegador:
game-phaser.html
```

### 2. Compatibilidade com dados existentes:
- ✅ Usa o mesmo **GAME_MAP** (js/map.js)
- ✅ Carrega dados do **location-editor** automaticamente
- ✅ Sistema de save/load separado (`vila_abandonada_phaser`)

---

## 🎯 O que você ganhou com Phaser:

### ✅ Performance:
- **Renderização WebGL** (GPU acelerada)
- **60 FPS** estáveis
- Sem repaints/reflows do DOM

### ✅ Zoom/Câmera nativo:
```javascript
// ANTES (HTML):
locationImage.style.transform = 'scale(2.5)';
hotspotsContainer.style.transform = 'scale(2.5)';
// Itens não acompanhavam...

// AGORA (Phaser):
this.cameras.main.zoomTo(2.5, 700);
// TUDO acompanha automaticamente! 🎉
```

### ✅ Sistema de Loading:
- Barra de progresso profissional
- Preload inteligente de assets
- Não há mais "pop" de imagens

### ✅ Animações fluidas:
- Itens flutuam suavemente
- Zoom suave ao navegar
- Transições fade in/out
- Hover effects nos itens

### ✅ Código organizado:
- Sistema de cenas separadas
- Managers para estado e UI
- Fácil de expandir

---

## 🎮 Controles:

- **🖱️ Click** em hotspots para navegar
- **🖱️ Click** em itens para coletar
- **🖱️ Hover** sobre hotspots para ver setas e labels
- **⌨️ H** - Toggle debug de hotspots (mostra áreas clicáveis)
- **🎒 Botão inventário** - Ver itens coletados
- **💾 Botão salvar** - Salvar progresso
- **🔄 Botão resetar** - Resetar jogo

---

## 📊 Comparação com versão HTML:

| Feature | HTML (game-offline.html) | Phaser (game-phaser.html) |
|---------|--------------------------|---------------------------|
| **Performance** | ⭐⭐⭐ (DOM) | ⭐⭐⭐⭐⭐ (WebGL) |
| **Zoom/Câmera** | ⚠️ Gambiarra CSS | ✅ Nativo perfeito |
| **Animações** | ⭐⭐ (CSS) | ⭐⭐⭐⭐⭐ (Tweens) |
| **Loading** | ❌ Sem controle | ✅ Barra profissional |
| **Mobile** | ⚠️ Funciona | ✅ Otimizado |
| **Código** | 🤯 Complexo | 😎 Organizado |
| **Expansível** | ⚠️ Difícil | ✅ Fácil |

---

## 🔧 Personalização:

### Mudar resolução:
```javascript
// Em js/phaser/config.js
const config = {
    width: 1920,  // Largura
    height: 1080, // Altura
    // ...
};
```

### Mudar velocidade do zoom:
```javascript
// Em js/phaser/scenes/LocationScene.js (linha ~350)
this.cameras.main.zoomTo(2.5, 1000); // 1000ms = 1 segundo
```

### Adicionar mais cenas:
```javascript
// Criar novo arquivo: js/phaser/scenes/MinhaNovaScene.js
class MinhaNovaScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MinhaNovaScene' });
    }
    // ...
}

// Adicionar em config.js:
scene: [
    BootScene,
    LocationScene,
    MinhaNovaScene  // ← Adicionar aqui
]
```

---

## 🐛 Debug:

### Ver áreas clicáveis:
```
Pressione H no jogo para mostrar/ocultar hotspots
```

### Console do navegador (F12):
```javascript
// Ver estado do jogo
gameStateManager.getState()

// Ver inventário
gameStateManager.getInventoryArray()

// Teleportar para local
gameStateManager.navigateToLocation('casa_abandonada_01_sala')

// Adicionar item
gameStateManager.collectItem({
    id: 'test_item',
    name: 'Item de Teste'
})
```

---

## ⚡ Próximos passos (sugestões):

### 1. **Sistema de Puzzles**
Implementar puzzles interativos usando Phaser

### 2. **Personagem andando**
Adicionar sprite de personagem que anda ao clicar

### 3. **Efeitos visuais**
- Partículas (chuva, névoa, poeira)
- Iluminação dinâmica
- Sombras

### 4. **Audio**
```javascript
// Em BootScene.js preload():
this.load.audio('music_ambient', 'audio/ambient.mp3');
this.load.audio('sfx_collect', 'audio/collect.wav');

// Em LocationScene.js create():
this.sound.play('music_ambient', { loop: true, volume: 0.3 });
```

### 5. **Animações de sprites**
```javascript
// Portas abrindo, baús abrindo, etc
this.anims.create({
    key: 'door_open',
    frames: [...],
    frameRate: 10
});
```

---

## 📚 Recursos de aprendizado:

- **Documentação oficial:** https://photonstorm.github.io/phaser3-docs/
- **Exemplos:** https://phaser.io/examples
- **Tutoriais:** https://phaser.io/tutorials

---

## 🆘 Problemas comuns:

### Imagens não aparecem:
- ✅ Verifique se o caminho está correto em GAME_MAP
- ✅ Abra o Console (F12) para ver erros
- ✅ Verifique se o preload está funcionando

### Hotspots não clicam:
- ✅ Pressione H para ver se estão posicionados corretamente
- ✅ Verifique os dados de position no GAME_MAP

### Jogo não inicia:
- ✅ Abra o Console (F12) para ver erros
- ✅ Verifique se todos os arquivos .js estão carregando
- ✅ Teste em outro navegador (Chrome/Firefox)

---

## 🎉 Conclusão:

Agora você tem:
- ✅ Versão HTML funcional (game-offline.html)
- ✅ Versão Phaser otimizada (game-phaser.html)
- ✅ Compatibilidade total entre as duas
- ✅ Base sólida para expandir o jogo

**Use game-phaser.html para continuar o desenvolvimento!**

---

## 📝 Notas:

- O sistema de save é **separado** entre HTML e Phaser
- Ambas versões usam o mesmo **GAME_MAP**
- O **location-editor** funciona com ambas

**Divirta-se desenvolvendo! 🎮✨**
