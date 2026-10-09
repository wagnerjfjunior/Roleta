@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo ============================================================
echo   ROLETA - SFJM PDF LOCAL
echo ============================================================
echo [ROOT] %CD%
if not exist "scripts\local-pdf-server.cjs" (
 echo.
 echo ERRO: Este BAT precisa ficar na pasta raiz do projeto Roleta
 echo e a branch feat/roleta-pdf-share-ios-20261009 precisa estar atualizada.
 echo Esperado: %CD%\scripts\local-pdf-server.cjs
 pause
 exit /b 1
)
set "NODE_EXE="
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"
if not defined NODE_EXE (
 for /d %%D in ("%USERPROFILE%\tools\node-portable\node-v*-win-x64") do (
  if exist "%%~fD\node.exe" if not defined NODE_EXE set "NODE_EXE=%%~fD\node.exe"
 )
)
if not defined NODE_EXE if exist "%USERPROFILE%\tools\node-portable\node-v22.22.3-win-x64\node.exe" set "NODE_EXE=%USERPROFILE%\tools\node-portable\node-v22.22.3-win-x64\node.exe"
if not defined NODE_EXE (
 echo.
 echo ERRO: Nao encontrei Node.js, nem no PATH nem em
 echo %USERPROFILE%\tools\node-portable
 pause
 exit /b 1
)
for %%N in ("%NODE_EXE%") do set "NODE_DIR=%%~dpN"
set "PATH=%NODE_DIR%;%PATH%"
echo [NODE] %NODE_EXE%
"%NODE_EXE%" --version
if errorlevel 1 (
 echo ERRO: Falha ao executar Node.js.
 pause
 exit /b 1
)
if not exist "node_modules\pdf-lib\package.json" (
 echo [PDF] Instalando a dependencia pdf-lib...
 set "NPM_CMD="
 if exist "%NODE_DIR%npm.cmd" set "NPM_CMD=%NODE_DIR%npm.cmd"
 if not defined NPM_CMD for /f "delims=" %%N in ('where npm.cmd 2^>nul') do if not defined NPM_CMD set "NPM_CMD=%%N"
 if defined NPM_CMD (
  call "%NPM_CMD%" install --no-package-lock --ignore-scripts
 ) else (
  if exist "%NODE_DIR%node_modules\npm\bin\npm-cli.js" (
   "%NODE_EXE%" "%NODE_DIR%node_modules\npm\bin\npm-cli.js" install --no-package-lock --ignore-scripts
  ) else (
   echo ERRO: npm nao encontrado. O Node portatil precisa incluir npm para instalar pdf-lib.
   pause
   exit /b 1
  )
 )
 if errorlevel 1 (
  echo ERRO: Falha na instalacao da dependencia pdf-lib.
  pause
  exit /b 1
 )
)
echo.
echo [PDF] Iniciando http://127.0.0.1:8083
echo [INFO] Abra http://localhost:8082 no Live Sync da Roleta.
echo [INFO] Mantenha esta janela aberta durante o teste.
echo.
"%NODE_EXE%" "scripts\local-pdf-server.cjs"
echo.
echo [PDF] Servidor encerrado. Confira o erro acima.
pause
exit /b 0
