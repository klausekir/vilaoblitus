@echo off
echo ========================================
echo Vila Abandonada - Servidor Local
echo ========================================
echo.

:: Verificar se Python está instalado
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Python encontrado! Iniciando servidor...
    echo.
    echo Servidor rodando em: http://localhost:8000
    echo.
    echo Abra no navegador: http://localhost:8000/game-phaser.html
    echo.
    echo Pressione Ctrl+C para parar o servidor
    echo ========================================
    echo.
    python -m http.server 8000
    goto :end
)

:: Verificar se Node.js está instalado
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo Node.js encontrado! Verificando http-server...
    echo.

    :: Tentar usar http-server
    http-server --version >nul 2>&1
    if %errorlevel% == 0 (
        echo http-server encontrado! Iniciando servidor...
        echo.
        echo Servidor rodando em: http://localhost:8000
        echo.
        echo Abra no navegador: http://localhost:8000/game-phaser.html
        echo.
        echo Pressione Ctrl+C para parar o servidor
        echo ========================================
        echo.
        http-server -p 8000
        goto :end
    ) else (
        echo http-server NAO encontrado. Instalando...
        npm install -g http-server
        echo.
        echo Iniciando servidor...
        echo.
        echo Servidor rodando em: http://localhost:8000
        echo.
        echo Abra no navegador: http://localhost:8000/game-phaser.html
        echo.
        echo Pressione Ctrl+C para parar o servidor
        echo ========================================
        echo.
        http-server -p 8000
        goto :end
    )
)

:: Verificar se PHP está instalado
php --version >nul 2>&1
if %errorlevel% == 0 (
    echo PHP encontrado! Iniciando servidor...
    echo.
    echo Servidor rodando em: http://localhost:8000
    echo.
    echo Abra no navegador: http://localhost:8000/game-phaser.html
    echo.
    echo Pressione Ctrl+C para parar o servidor
    echo ========================================
    echo.
    php -S localhost:8000
    goto :end
)

:: Nenhum servidor encontrado
echo ========================================
echo ERRO: Nenhum servidor HTTP encontrado!
echo ========================================
echo.
echo Você precisa instalar uma dessas opcoes:
echo.
echo 1. Python (recomendado)
echo    Download: https://www.python.org/downloads/
echo.
echo 2. Node.js + http-server
echo    Download: https://nodejs.org/
echo    Depois: npm install -g http-server
echo.
echo 3. VSCode + Live Server Extension
echo    Download VSCode: https://code.visualstudio.com/
echo    Extension: Live Server (Ritwick Dey)
echo.
echo ========================================
pause

:end
