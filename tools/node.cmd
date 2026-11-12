@echo off
setlocal
rem Usa el Node.js instalado; si no hay, el que trae Antigravity IDE (no requiere instalar nada).
where node >/dev/null 2>nul
if %ERRORLEVEL% EQU 0 (
  node %*
  exit /b %ERRORLEVEL%
)
set "RTQ_IDE=%LOCALAPPDATA%\Programs\Antigravity IDE\Antigravity IDE.exe"
if not exist "%RTQ_IDE%" (
  echo [ERROR] No se encontro Node.js ni Antigravity IDE. Instala Node.js 18 o superior desde https://nodejs.org
  exit /b 1
)
set ELECTRON_RUN_AS_NODE=1
"%RTQ_IDE%" %*
endlocal & exit /b %ERRORLEVEL%
