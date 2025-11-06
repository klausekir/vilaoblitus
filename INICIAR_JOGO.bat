@echo off
echo ========================================
echo    VILA ABANDONADA - Iniciando Jogo
echo ========================================
echo.
echo Verificando Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Python nao encontrado!
    echo.
    echo Por favor, instale Python:
    echo https://www.python.org/downloads/
    echo.
    echo OU abra manualmente: game-offline.html
    pause
    exit /b
)

echo Python encontrado!
echo.
echo Iniciando servidor na porta 8000...
echo.
echo ========================================
echo  Abra seu navegador e acesse:
echo
echo  JOGAR: http://localhost:8000/game-offline.html
echo  EDITAR: http://localhost:8000/location-editor.html
echo ========================================
echo.
echo Pressione Ctrl+C para parar o servidor
echo.

python -m http.server 8000
