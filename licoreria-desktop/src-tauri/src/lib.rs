use std::path::PathBuf;
use std::process::Command as StdCommand;
use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

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

    #[cfg(windows)]
    {
        // Primero por nombre de imagen (más confiable que por PID)
        let _ = StdCommand::new("taskkill")
            .args(["/IM", "sistema_licoreria.exe", "/T", "/F"])
            .creation_flags(CREATE_NO_WINDOW)
            .status();

        // Fallback por PID
        std::thread::sleep(Duration::from_millis(100));
        let _ = StdCommand::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .creation_flags(CREATE_NO_WINDOW)
            .status();
    }

    #[cfg(not(windows))]
    {
        let _ = StdCommand::new("kill")
            .args(["-9", &pid.to_string()])
            .status();
    }
}

/// Muestra diálogo de error, mata el sidecar si es necesario, y cierra la app.
fn show_fatal_error(app: &tauri::AppHandle, msg: &str, kill_sidecar: bool) {
    app.dialog()
        .message(msg)
        .title("Sistema Licorería")
        .kind(tauri_plugin_dialog::MessageDialogKind::Error)
        .blocking_show();

    if kill_sidecar {
        let state = app.state::<SidecarState>();
        let mut guard = state.0.lock().unwrap();
        if let Some(child) = guard.take() {
            drop(guard);
            kill_sidecar_tree(child);
        }
    }
    app.exit(1);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(SidecarState(Mutex::new(None)))
        .setup(|app| {
            let app_handle = app.handle().clone();

            // 1. Spawnea el sidecar con error handling graceful
            let sidecar = match app.shell().sidecar("sistema_licoreria") {
                Ok(cmd) => cmd,
                Err(e) => {
                    show_fatal_error(
                        &app_handle,
                        &format!("No se pudo preparar el backend.\n\n{e}"),
                        false,
                    );
                    return Ok(());
                }
            };

            let (_, child) = match sidecar.spawn() {
                Ok(pair) => pair,
                Err(e) => {
                    show_fatal_error(
                        &app_handle,
                        &format!("No se pudo iniciar el backend.\n\n{e}"),
                        false,
                    );
                    return Ok(());
                }
            };

            // Guardar referencia al proceso hijo
            let state = app.state::<SidecarState>();
            *state.0.lock().unwrap() = Some(child);

            // 2. Hilo en segundo plano: .port -> health check -> transición
            std::thread::spawn(move || {
                let client = reqwest::blocking::Client::builder()
                    .timeout(Duration::from_secs(2))
                    .build()
                    .unwrap();

                let port_path = get_port_path();
                let mut port: Option<u16> = None;

                for _ in 0..40 {
                    // 2a. Leer .port si aún no tenemos puerto
                    if port.is_none() {
                        if let Ok(content) = std::fs::read_to_string(&port_path) {
                            if let Ok(p) = content.trim().parse::<u16>() {
                                port = Some(p);
                            }
                        }
                    }

                    // 2b. Si tenemos puerto, hacer health check
                    if let Some(p) = port {
                        let url = format!("http://127.0.0.1:{}/api/health", p);
                        if let Ok(res) = client.get(&url).send() {
                            if res.status().is_success() {
                                // Backend listo — transición de ventanas
                                if let Some(main) = app_handle.get_webview_window("main") {
                                    let _ = main.navigate(
                                        format!("http://127.0.0.1:{}", p)
                                            .parse()
                                            .unwrap(),
                                    );
                                    let _ = main.show();
                                    let _ = main.set_focus();
                                }
                                if let Some(splash) = app_handle.get_webview_window("splashscreen")
                                {
                                    let _ = splash.close();
                                }
                                return;
                            }
                        }
                    }

                    std::thread::sleep(Duration::from_millis(500));
                }

                // Timeout: backend no respondió
                show_fatal_error(
                    &app_handle,
                    "El backend no respondió a tiempo.\nVerifica que no haya otro proceso usando los puertos.",
                    true,
                );
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            // 3. Cleanup al cerrar la app (más confiable que on_window_event)
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
