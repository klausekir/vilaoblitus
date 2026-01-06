# Instruções para Claude Code - Puzzle Prism Light

Cole este texto no terminal do Claude Code:

---

Implemente o puzzle "prism_light" para o jogo Codex Oblitus.

PROPRIEDADES DOS PRISMAS (TRIÂNGULO RETO):
- Luz pela HIPOTENUSA: passa reto
- Luz por FACE RETA: gira 90° e sai pela outra face reta
- Podem rotacionar (0, 90, 180, 270 graus) e espelhar (flipX)

ARQUIVOS A CRIAR/MODIFICAR:

1. CRIAR js/phaser/puzzles/PrismLightPuzzle.js:
   - Ray tracing para calcular trajetória
   - Lógica de reflexão no triângulo reto
   - Rendering do raio com glow
   - Clique=rotacionar, botão direito=espelhar
   - Detecção colisão com receptor

2. MODIFICAR js/phaser/puzzles/PuzzleManager.js:
   - case 'prism_light' em createPuzzle()
   - método createPrismLightPuzzle(config)

3. MODIFICAR js/phaser/scenes/LocationScene.v2.js:
   - 'prism_light' em phaserPuzzleTypes

4. MODIFICAR location-editor-db.html:
   - Botão "Prisma de Luz" no menu
   - Formulário: emissor(x,y,dir), receptor(x,y), 3 slots
   - Canvas preview com raio em tempo real

ESTRUTURA DE DADOS: { type:'prism_light', emitter:{x,y,direction,color}, receptor:{x,y,width,height}, prismSlots:[{id,x,y,requiredItem:'prisma'}], onUnlockedAction:{type:'navigate',targetLocation:'cena_secreta'} }

Use itens existentes: prisma, prisma1, prisma2. Siga padrão do padlock_5digit. Comece pelo PrismLightPuzzle.js.
