@echo off
title Retequenos - App movil, web y KDS
cd /d "%~dp0"
echo ======================================================
echo RETEQUENOS OS - Servidor Seguro y Hub Operativo
echo ======================================================
if not exist "web\dist\index.html" echo [AVISO] Falta web\dist: ejecuta "Compilar web.cmd" una vez para ver la tienda en /app.
echo Abriendo la app en http://localhost:3000/app ...
start "" "http://localhost:3000/app"
call "tools\node.cmd" "tools\server.js" --port 3000 -Lan
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [ERROR] No se pudo iniciar el servidor Node.js.
  pause
)
