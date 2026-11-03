!macro NSIS_HOOK_PREUNINSTALL
  ; Matar la app Tauri y el sidecar si estuvieran en ejecucion para no dejar
  ; procesos huerfanos ni archivos bloqueados (DB, AppData/Local/YanesuShisutemu).
  ; Silenciamos la salida para no imprimir falsos errores en el log si la app ya estaba cerrada.
  nsExec::Exec 'cmd.exe /c "taskkill /F /IM yanesu-desktop.exe >nul 2>&1"'
  nsExec::Exec 'cmd.exe /c "taskkill /F /IM yanesu_shisutemu.exe >nul 2>&1"'
  Sleep 500
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; Si el usuario selecciono la casilla de eliminar datos de la aplicacion y no es una actualizacion:
  ${If} $DeleteAppDataCheckboxState = 1
  ${AndIf} $UpdateMode <> 1
    SetShellVarContext current
    RMDir /r "$LOCALAPPDATA\YanesuShisutemu"
  ${EndIf}
!macroend

!macro NSIS_HOOK_PREINSTALL
!macroend

!macro NSIS_HOOK_POSTINSTALL
!macroend
