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
copy /Y "dist\sistema_licoreria.exe" "dist\sistema_licoreria-%TARGET_TRIPLE%.exe"

echo === Build completado ===
echo Backend (onefile): dist\sistema_licoreria.exe
echo.
echo Para crear el instalador NSIS:
echo   cd ..\licoreria-desktop\src-tauri
echo   cargo tauri build
pause
