@echo off
echo === Construyendo Frontend ===
cd ..\frontend
call pnpm install
call pnpm build
cd ..\backend

echo === Empaquetando con PyInstaller (onefile) ===
pyinstaller build.spec --clean --noconfirm

echo === Preparando sidecar para Tauri ===
set TARGET_TRIPLE=x86_64-pc-windows-msvc
copy /Y "dist\yanesu_shisutemu.exe" "dist\yanesu_shisutemu-%TARGET_TRIPLE%.exe"

echo === Construyendo instalador Tauri (NSIS) ===
cd ..\licoreria-desktop
call pnpm install
call pnpm build

echo === Build completado ===
echo Backend: ..\backend\dist\yanesu_shisutemu.exe
echo Instalador: ..\licoreria-desktop\src-tauri\target\release\bundle\nsis\Yanesu Shisutemu_1.0.0_x64-setup.exe
pause
