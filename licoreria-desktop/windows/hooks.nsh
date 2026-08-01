!macro NSIS_HOOK_PREUNINSTALL
  ; Matar la app Tauri y el sidecar antes de borrar archivos para no dejar
  ; procesos huérfanos ni archivos bloqueados (DB, AppData/Local/SistemaLicoreria).
  ; Orden: primero Tauri (mata WebView2 hijos), luego el sidecar.
  nsExec::ExecToLog 'taskkill /IM "licoreria-desktop.exe" /F'
  nsExec::ExecToLog 'taskkill /IM "sistema_licoreria.exe" /F'
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
!macroend

!macro NSIS_HOOK_PREINSTALL
!macroend

!macro NSIS_HOOK_POSTINSTALL
!macroend
