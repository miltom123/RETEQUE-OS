@echo off
title Retequenos - Bateria de Pruebas Automatizadas
cd /d "%~dp0"
echo ======================================================
echo RETEQUENOS OS - EJECUTANDO PRUEBAS DEL SISTEMA
echo ======================================================
set RTQ_FAIL=0
for %%T in (test-system test-backend test-access test-pricing test-web-orders test-reports test-requirements test-initial-staff test-migration test-mobile-frontend) do (
  echo.
  echo --- %%T
  call "tools\node.cmd" "tools\%%T.js" || set RTQ_FAIL=1
)
echo.
if %RTQ_FAIL% EQU 0 (echo TODAS LAS PRUEBAS PASARON) else (echo HAY PRUEBAS FALLIDAS: revisa los mensajes de arriba)
pause
