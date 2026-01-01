Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("C:\src\codex.oblitus\images\objects\arvore01_spritesheet.png")
$w = $img.Width
$h = $img.Height
$img.Dispose()

Write-Host "=== ARVORE01 SPRITESHEET ==="
Write-Host "Largura: $w px"
Write-Host "Altura: $h px"
Write-Host "Frames (largura / 249): " ([Math]::Floor($w / 249))
Write-Host "Resto (pixels extras): " ($w % 249)
