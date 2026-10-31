@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js bulunamadi. https://nodejs.org adresinden Node 22 veya uzerini kurun. & pause & exit /b 1)
if not exist node_modules (echo Bagimliliklar kuruluyor... & call npm install || (pause & exit /b 1))
if not exist apps\studio\dist\index.html (echo Arayuz derleniyor... & call npm run build || (pause & exit /b 1))
start "" http://127.0.0.1:4173/studio
node apps/local-server/src/server.ts
pause
