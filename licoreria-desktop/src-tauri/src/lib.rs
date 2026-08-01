use std::path::PathBuf;
use std::process::Command as StdCommand;
use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

fn get_port_path() -> PathBuf {
    let mut port_path = dirs::data_local_dir().expect("No se encontró AppData/Local");
    port_path.push("SistemaLicoreria");
    port_path.push(".port");
    port_path
}

struct SidecarState(Mutex<Option<CommandChild>>);

/// Mata el sidecar y todo su árbol de procesos (incluyendo hijos Python de PyInstaller).
fn kill_sidecar_tree(child: CommandChild) {
    let pid = child.pid();
    let _ = child.kill();
    // fallback: taskkill /T mata el árbol completo
    let _ = StdCommand::new("taskkill")
        .args(["/PID", &pid.to_string(), "/T", "/F"])
        .output();
}

/// Muestra un diálogo de error y cierra la app al pulsar OK.
/// Si `kill_sidecar` es true, también mata el proceso del backend.
fn show_fatal_error(app: &tauri::App, message: &str, kill_sidecar: bool) {
    let handle = app.handle().clone();
    app.dialog()
        .message(message)
        .title("Sistema Licorería")
        .show(move |_| {
            if kill_sidecar {
                if let Some(state) = handle.try_state::<SidecarState>() {
                    if let Ok(mut guard) = state.0.lock() {
                        if let Some(child) = guard.take() {
                            kill_sidecar_tree(child);
                        }
                    }
                }
            }
            std::process::exit(1);
        });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 1. Iniciar sidecar (backend .exe). Si falla, mostrar diálogo y cerrar.
            let sidecar = match app.shell().sidecar("sistema_licoreria") {
                Ok(cmd) => cmd,
                Err(e) => {
                    show_fatal_error(
                        app,
                        &format!("No se pudo preparar el backend del sistema.\n\n{e}"),
                        false,
                    );
                    return Ok(());
                }
            };

            let (mut _rx, child) = match sidecar.spawn() {
                Ok(pair) => pair,
                Err(e) => {
                    show_fatal_error(
                        app,
                        &format!("No se pudo iniciar el backend del sistema.\n\n{e}"),
                        false,
                    );
                    return Ok(());
                }
            };

            app.manage(SidecarState(Mutex::new(Some(child))));

            // 2. Polling: esperar hasta 20s a que .port aparezca
            let port_path = get_port_path();
            let mut port: Option<u16> = None;
            for _ in 0..40 {
                std::thread::sleep(Duration::from_millis(500));
                if let Ok(content) = std::fs::read_to_string(&port_path) {
                    if let Ok(p) = content.trim().parse::<u16>() {
                        port = Some(p);
                        break;
                    }
                }
            }

            let Some(port) = port else {
                show_fatal_error(
                    app,
                    "El backend no respondió a tiempo. \
                     Verifica que no haya otro proceso usando los puertos y vuelve a abrir la app.",
                    true,
                );
                return Ok(());
            };

            // 3. Navegar la ventana al backend
            if let Some(window) = app.get_webview_window("main") {
                let url = format!("http://127.0.0.1:{}", port);
                let _ = window.navigate(url.parse().expect("Invalid URL"));
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            // 4. Al cerrar la app, matar el sidecar para no dejar procesos huérfanos
            if let tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit = event {
                if let Some(state) = app_handle.try_state::<SidecarState>() {
                    if let Ok(mut guard) = state.0.lock() {
                        if let Some(child) = guard.take() {
                            kill_sidecar_tree(child);
                        }
                    }
                }
            }
        });
}
