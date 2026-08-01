!macro NSIS_HOOK_PREUNINSTALL
  ; Mata el backend antes de borrar archivos para no dejar procesos huérfanos
  ; ni archivos bloqueados (DB, AppData/Local/SistemaLicoreria).
  nsExec::ExecToLog 'taskkill /IM "sistema_licoreria.exe" /F'
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
!macroend

!macro NSIS_HOOK_PREINSTALL
!macroend

!macro NSIS_HOOK_POSTINSTALL
!macroend
