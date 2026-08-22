@echo off
setlocal enabledelayedexpansion
title Yanesu Shisutemu - Build
color 0F

set "ROOT=%~dp0..\"

REM ═══════════════════════════════════════════════════════════
REM  0. Detectar Node.js desde fnm
REM ═══════════════════════════════════════════════════════════

set "NODE_VERSION="
if exist "%ROOT%.node-version" (
    set /p NODE_VERSION=<"%ROOT%.node-version"
    REM Trim espacios y saltos de linea
    for /f "tokens=*" %%a in ("!NODE_VERSION!") do set "NODE_VERSION=%%a"
)

if "!NODE_VERSION!"=="" (
    echo [INFO] No se encontro .node-version, usando v24.18.0
    set "NODE_VERSION=v24.18.0"
)

set "FNM_NODE_DIR=%APPDATA%\fnm\node-versions\!NODE_VERSION!\installation"
if not exist "!FNM_NODE_DIR!\node.exe" (
    echo.
    echo [ERROR] Node !NODE_VERSION! no encontrado en fnm.
    echo         Ruta: !FNM_NODE_DIR!\node.exe
    echo.
    echo         Ejecuta: fnm install !NODE_VERSION!
    echo.
    goto :fail
)

echo [OK] Node !NODE_VERSION! detectado en fnm
set "PATH=!FNM_NODE_DIR!;%PATH%"

REM ═══════════════════════════════════════════════════════════
REM  1. Verificar herramientas requeridas
REM ═══════════════════════════════════════════════════════════

echo.
echo === Verificando herramientas ===

set "HAS_ERROR=0"

where node >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] node no encontrado
    set "HAS_ERROR=1"
) else (
    for /f "tokens=*" %%v in ('node --version 2^>nul') do echo [OK] node %%v
)

where pnpm >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] pnpm no encontrado
    set "HAS_ERROR=1"
) else (
    for /f "tokens=*" %%v in ('pnpm --version 2^>nul') do echo [OK] pnpm %%v
)

where python >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] python no encontrado
    set "HAS_ERROR=1"
) else (
    for /f "tokens=*" %%v in ('python --version 2^>nul') do echo [OK] %%v
)

where pyinstaller >nul 2>&1
if !errorlevel! equ 0 (
    echo [OK] pyinstaller
    set "PYINSTALLER_CMD=pyinstaller"
) else (
    python -m PyInstaller --version >nul 2>&1
    if !errorlevel! equ 0 (
        echo [OK] pyinstaller ^(via python -m PyInstaller^)
        set "PYINSTALLER_CMD=python -m PyInstaller"
    ) else (
        echo [ERROR] pyinstaller no encontrado
        echo         Ejecuta: pip install pyinstaller
        set "HAS_ERROR=1"
    )
)

where cargo >nul 2>&1
if !errorlevel! neq 0 (
    REM Verificar en la ruta por defecto de Cargo
    if exist "%USERPROFILE%\.cargo\bin\cargo.exe" (
        set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
        echo [OK] cargo ^(agregado desde ~/.cargo/bin^)
    ) else (
        echo [ERROR] cargo no encontrado
        echo         Instala Rust: https://rustup.rs
        set "HAS_ERROR=1"
    )
) else (
    for /f "tokens=*" %%v in ('cargo --version 2^>nul') do echo [OK] %%v
)

if "!HAS_ERROR!"=="1" (
    echo.
    echo [ERROR] Faltan herramientas requeridas. Abortando build.
    goto :fail
)

REM ═══════════════════════════════════════════════════════════
REM  2. Opcion --clean
REM ═══════════════════════════════════════════════════════════

if "%1"=="--clean" (
    echo.
    echo === Limpiando artefactos anteriores ===
    if exist "%ROOT%frontend\dist" (
        rmdir /s /q "%ROOT%frontend\dist"
        echo [OK] frontend/dist eliminado
    )
    if exist "%ROOT%backend\build" (
        rmdir /s /q "%ROOT%backend\build"
        echo [OK] backend/build eliminado
    )
    if exist "%ROOT%backend\dist" (
        rmdir /s /q "%ROOT%backend\dist"
        echo [OK] backend/dist eliminado
    )
    if exist "%ROOT%licoreria-desktop\src-tauri\target" (
        rmdir /s /q "%ROOT%licoreria-desktop\src-tauri\target"
        echo [OK] src-tauri/target eliminado
    )
)

REM ═══════════════════════════════════════════════════════════
REM  3. Construir Frontend
REM ═══════════════════════════════════════════════════════════

echo.
echo === [1/4] Construyendo Frontend ===
cd /d "%ROOT%frontend" || (echo [ERROR] No se encontro frontend/ & goto :fail)

call pnpm install
if !errorlevel! neq 0 (
    echo [ERROR] pnpm install fallo en frontend
    goto :fail
)

call pnpm build
if !errorlevel! neq 0 (
    echo [ERROR] Frontend build fallo
    goto :fail
)
echo [OK] Frontend construido exitosamente

REM ═══════════════════════════════════════════════════════════
REM  4. Empaquetar Backend con PyInstaller
REM ═══════════════════════════════════════════════════════════

echo.
echo === [2/4] Empaquetando Backend con PyInstaller ===
cd /d "%ROOT%backend" || (echo [ERROR] No se encontro backend/ & goto :fail)

!PYINSTALLER_CMD! build.spec --clean --noconfirm
if !errorlevel! neq 0 (
    echo [ERROR] PyInstaller fallo
    goto :fail
)

if not exist "dist\yanesu_shisutemu.exe" (
    echo [ERROR] El ejecutable dist\yanesu_shisutemu.exe no se genero
    goto :fail
)
echo [OK] Backend empaquetado exitosamente

REM ═══════════════════════════════════════════════════════════
REM  5. Preparar sidecar para Tauri
REM ═══════════════════════════════════════════════════════════

echo.
echo === [3/4] Preparando sidecar para Tauri ===
set "TARGET_TRIPLE=x86_64-pc-windows-msvc"
copy /Y "dist\yanesu_shisutemu.exe" "dist\yanesu_shisutemu-%TARGET_TRIPLE%.exe" >nul
if !errorlevel! neq 0 (
    echo [ERROR] No se pudo copiar el sidecar
    goto :fail
)
echo [OK] Sidecar copiado: yanesu_shisutemu-%TARGET_TRIPLE%.exe

REM ═══════════════════════════════════════════════════════════
REM  6. Construir instalador Tauri (NSIS)
REM ═══════════════════════════════════════════════════════════

echo.
echo === [4/4] Construyendo instalador Tauri ===
cd /d "%ROOT%licoreria-desktop" || (echo [ERROR] No se encontro licoreria-desktop/ & goto :fail)

call pnpm install
if !errorlevel! neq 0 (
    echo [ERROR] pnpm install fallo en licoreria-desktop
    goto :fail
)

call pnpm tauri build
if !errorlevel! neq 0 (
    echo [ERROR] Tauri build fallo
    goto :fail
)
echo [OK] Instalador Tauri construido exitosamente

REM ═══════════════════════════════════════════════════════════
REM  7. Resumen
REM ═══════════════════════════════════════════════════════════

echo.
echo ═══════════════════════════════════════════════════════════
echo  BUILD COMPLETADO EXITOSAMENTE
echo ═══════════════════════════════════════════════════════════
echo.
echo  Backend:   %ROOT%backend\dist\yanesu_shisutemu.exe
echo  Sidecar:   %ROOT%backend\dist\yanesu_shisutemu-%TARGET_TRIPLE%.exe
echo  Instalador: %ROOT%licoreria-desktop\src-tauri\target\release\bundle\nsis\Yanesu Shisutemu_1.0.0_x64-setup.exe
echo.

REM Verificar que los artefactos existen
set "ALL_OK=1"
if not exist "%ROOT%backend\dist\yanesu_shisutemu.exe" (
    echo [WARN] Backend NO generado
    set "ALL_OK=0"
)
if not exist "%ROOT%licoreria-desktop\src-tauri\target\release\bundle\nsis\Yanesu Shisutemu_1.0.0_x64-setup.exe" (
    echo [WARN] Instalador NSIS NO generado
    set "ALL_OK=0"
)
if "!ALL_OK!"=="1" (
    echo  Todos los artefactos generados correctamente.
)
echo.
goto :end

:fail
echo.
echo ═══════════════════════════════════════════════════════════
echo  BUILD FALLIDO
echo ═══════════════════════════════════════════════════════════
echo.
pause
exit /b 1

:end
endlocal
pause
