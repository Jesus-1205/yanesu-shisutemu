@echo off
echo === Construyendo Frontend ===
cd ..\frontend
call pnpm install
call pnpm build
cd ..\backend

echo === Empaquetando con PyInstaller ===
pyinstaller build.spec --clean --noconfirm

echo === Preparando sidecar para Tauri ===
set TARGET_TRIPLE=x86_64-pc-windows-msvc
set SIDECAR_DIR=..\licoreria-desktop\src-tauri\bin
if not exist "%SIDECAR_DIR%" mkdir "%SIDECAR_DIR%"
copy /Y "dist\sistema_licoreria\sistema_licoreria.exe" "%SIDECAR_DIR%\sistema_licoreria-%TARGET_TRIPLE%.exe"

echo === Build completado ===
echo Backend:   dist\sistema_licoreria\sistema_licoreria.exe
echo Sidecar:   %SIDECAR_DIR%\sistema_licoreria-%TARGET_TRIPLE%.exe
pause
