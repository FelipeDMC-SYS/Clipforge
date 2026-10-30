@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instala Node.js 24 desde https://nodejs.org/ y vuelve a abrir este archivo.
  pause
  exit /b 1
)
echo Iniciando ClipForge. Abre la direccion que aparecera abajo.
node scripts\serve.mjs
pause
