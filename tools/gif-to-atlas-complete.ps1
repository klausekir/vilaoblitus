# Script completo: GIF → Atlas otimizado (com limpeza automática)
# Uso: .\gif-to-atlas-complete.ps1 <input.gif> <output_name> [max_frames] [tolerance]

param(
    [Parameter(Mandatory=$true)]
    [string]$InputGif,

    [Parameter(Mandatory=$true)]
    [string]$OutputName,

    [int]$MaxFrames = 20,
    [int]$Tolerance = 20
)

if (-not $InputGif -or -not $OutputName) {
    Write-Host "==========================================" -ForegroundColor Yellow
    Write-Host "GIF → ATLAS COMPLETO (com limpeza)" -ForegroundColor Yellow
    Write-Host "==========================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Uso: .\gif-to-atlas-complete.ps1 <input.gif> <output_name> [max_frames] [tolerance]"
    Write-Host ""
    Write-Host "Exemplos:"
    Write-Host "  .\tools\gif-to-atlas-complete.ps1 spider.gif spider 17 20"
    Write-Host "  .\tools\gif-to-atlas-complete.ps1 arvore01.gif arvore01 12"
    Write-Host ""
    Write-Host "Processo:"
    Write-Host "  1. Remove fundo"
    Write-Host "  2. Extrai frames"
    Write-Host "  3. Cria atlas PNG + JSON"
    Write-Host "  4. Otimiza para PNG-8"
    Write-Host "  5. LIMPA arquivos temporários"
    Write-Host "==========================================" -ForegroundColor Yellow
    exit 1
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Processando: $InputGif" -ForegroundColor Cyan
Write-Host "Output: ${OutputName}_atlas.png/json" -ForegroundColor Cyan
Write-Host "Frames: $MaxFrames" -ForegroundColor Cyan
Write-Host "Tolerância: $Tolerance" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Variáveis de arquivos temporários
$NoBgGif = "images/objects/${OutputName}_no_bg.gif"
$FramesDir = "frames_${OutputName}_no_bg"

try {
    # Passo 1: Remover fundo
    Write-Host "[1/5] Removendo fundo..." -ForegroundColor Green
    python tools/remove-gif-background.py $InputGif $NoBgGif $Tolerance
    Write-Host ""

    # Passo 2: Extrair frames
    Write-Host "[2/5] Extraindo $MaxFrames frames..." -ForegroundColor Green
    python tools/gif-to-frames.py $NoBgGif $MaxFrames
    Write-Host ""

    # Passo 3: Criar atlas
    Write-Host "[3/5] Criando atlas..." -ForegroundColor Green
    node tools/create-atlas-from-pngs.js $FramesDir $OutputName
    Write-Host ""

    # Passo 4: Otimizar
    Write-Host "[4/5] Otimizando PNG..." -ForegroundColor Green
    node tools/optimize-png.js "images/objects/${OutputName}_atlas.png"
    Write-Host ""

    # Passo 5: Limpar temporários
    Write-Host "[5/5] Limpando arquivos temporários..." -ForegroundColor Green
    if (Test-Path $FramesDir) {
        Remove-Item -Recurse -Force $FramesDir
        Write-Host "Removido: $FramesDir/" -ForegroundColor Gray
    }
    if (Test-Path $NoBgGif) {
        Remove-Item -Force $NoBgGif
        Write-Host "Removido: $NoBgGif" -ForegroundColor Gray
    }
    Write-Host ""

    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "COMPLETO!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Arquivos gerados:"
    Write-Host "  images/objects/${OutputName}_atlas.png"
    Write-Host "  images/objects/${OutputName}_atlas.json"
    Write-Host ""

    # Mostrar tamanhos
    $PngFile = "images/objects/${OutputName}_atlas.png"
    $JsonFile = "images/objects/${OutputName}_atlas.json"

    if (Test-Path $PngFile) {
        $PngSize = (Get-Item $PngFile).Length / 1KB
        Write-Host "Tamanhos finais:"
        Write-Host "  PNG:  $([math]::Round($PngSize, 2)) KB"

        if (Test-Path $JsonFile) {
            $JsonSize = (Get-Item $JsonFile).Length / 1KB
            Write-Host "  JSON: $([math]::Round($JsonSize, 2)) KB"
        }
    }
    Write-Host ""
    Write-Host "Pronto para usar no jogo!" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "ERRO: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Limpando arquivos temporários..." -ForegroundColor Yellow
    if (Test-Path $FramesDir) { Remove-Item -Recurse -Force $FramesDir }
    if (Test-Path $NoBgGif) { Remove-Item -Force $NoBgGif }
    exit 1
}
