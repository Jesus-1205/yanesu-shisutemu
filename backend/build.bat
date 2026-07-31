@echo off
echo === Construyendo Frontend ===
cd ..\frontend
call pnpm install
call pnpm build
cd ..\backend

echo === Empaquetando con PyInstaller ===
pyinstaller build.spec --clean --noconfirm

echo === Build completado ===
echo Ejecutable en: dist\sistema_licoreria\sistema_licoreria.exe
pause
