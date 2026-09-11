@echo off
title Rusticos Artesanales - servidor local
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"
echo Abriendo http://localhost:4321 ...
echo Deja esta ventana abierta mientras trabajes en el sitio. Cierrala para apagarlo.
start "" http://localhost:4321
call npm run dev -- --host --port 4321
pause
