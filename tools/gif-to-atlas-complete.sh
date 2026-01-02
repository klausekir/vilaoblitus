#!/bin/bash
# Script completo: GIF → Atlas otimizado (com limpeza automática)
# Uso: ./gif-to-atlas-complete.sh <input.gif> <output_name> [max_frames] [tolerance]

set -e  # Exit on error

if [ $# -lt 2 ]; then
    echo "=========================================="
    echo "GIF → ATLAS COMPLETO (com limpeza)"
    echo "=========================================="
    echo ""
    echo "Uso: $0 <input.gif> <output_name> [max_frames] [tolerance]"
    echo ""
    echo "Exemplos:"
    echo "  $0 spider.gif spider 17 20"
    echo "  $0 arvore01.gif arvore01 12"
    echo ""
    echo "Processo:"
    echo "  1. Remove fundo"
    echo "  2. Extrai frames"
    echo "  3. Cria atlas PNG + JSON"
    echo "  4. Otimiza para PNG-8"
    echo "  5. LIMPA arquivos temporários"
    echo "=========================================="
    exit 1
fi

INPUT_GIF=$1
OUTPUT_NAME=$2
MAX_FRAMES=${3:-20}
TOLERANCE=${4:-20}

echo "=========================================="
echo "Processando: $INPUT_GIF"
echo "Output: ${OUTPUT_NAME}_atlas.png/json"
echo "Frames: $MAX_FRAMES"
echo "Tolerância: $TOLERANCE"
echo "=========================================="
echo ""

# Variáveis de arquivos temporários
NO_BG_GIF="images/objects/${OUTPUT_NAME}_no_bg.gif"
FRAMES_DIR="frames_${OUTPUT_NAME}_no_bg"

# Passo 1: Remover fundo
echo "[1/5] Removendo fundo..."
python tools/remove-gif-background.py "$INPUT_GIF" "$NO_BG_GIF" $TOLERANCE
echo ""

# Passo 2: Extrair frames
echo "[2/5] Extraindo $MAX_FRAMES frames..."
python tools/gif-to-frames.py "$NO_BG_GIF" $MAX_FRAMES
echo ""

# Passo 3: Criar atlas
echo "[3/5] Criando atlas..."
node tools/create-atlas-from-pngs.js "$FRAMES_DIR" "$OUTPUT_NAME"
echo ""

# Passo 4: Otimizar
echo "[4/5] Otimizando PNG..."
node tools/optimize-png.js "images/objects/${OUTPUT_NAME}_atlas.png"
echo ""

# Passo 5: Limpar temporários
echo "[5/5] Limpando arquivos temporários..."
rm -rf "$FRAMES_DIR"
rm -f "$NO_BG_GIF"
echo "Removido: $FRAMES_DIR/"
echo "Removido: $NO_BG_GIF"
echo ""

echo "=========================================="
echo "COMPLETO!"
echo "=========================================="
echo ""
echo "Arquivos gerados:"
echo "  images/objects/${OUTPUT_NAME}_atlas.png"
echo "  images/objects/${OUTPUT_NAME}_atlas.json"
echo ""

# Mostrar tamanhos
PNG_SIZE=$(du -h "images/objects/${OUTPUT_NAME}_atlas.png" | cut -f1)
JSON_SIZE=$(du -h "images/objects/${OUTPUT_NAME}_atlas.json" | cut -f1)

echo "Tamanhos finais:"
echo "  PNG:  $PNG_SIZE"
echo "  JSON: $JSON_SIZE"
echo ""
echo "Pronto para usar no jogo!"
