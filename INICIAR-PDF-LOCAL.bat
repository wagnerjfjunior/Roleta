@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo ERRO: Node nao encontrado neste terminal.
 echo Execute usando o terminal Node do SFJM ou configure seu Node portatil.
 pause
 exit /b 1
)
if not exist "node_modules\pdf-lib\package.json" (
 echo Instalando dependencia de PDF local...
 call npm install --no-package-lock --ignore-scripts
 if errorlevel 1 (echo Falha ao instalar pdf-lib.& pause& exit /b 1)
)
echo.
echo SFJM Roleta: gerador PDF local em http://127.0.0.1:8083
echo Mantenha esta janela aberta durante os testes.
echo.
node scripts\local-pdf-server.cjs
pause
