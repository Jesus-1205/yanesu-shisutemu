use std::path::PathBuf;
use std::time::Duration;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

fn get_port_path() -> PathBuf {
    let mut port_path = dirs::data_local_dir().expect("No se encontró AppData/Local");
    port_path.push("SistemaLicoreria");
    port_path.push(".port");
    port_path
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // 1. Iniciar sidecar (backend .exe)
            let sidecar = app
                .shell()
                .sidecar("sistema_licoreria")
                .expect("Failed to create sidecar command");
            sidecar.spawn().expect("Failed to spawn sidecar");

            // 2. Polling: esperar hasta 20s a que .port aparezca
            let port_path = get_port_path();
            let mut port: u16 = 8000;
            for _ in 0..40 {
                std::thread::sleep(Duration::from_millis(500));
                if let Ok(content) = std::fs::read_to_string(&port_path) {
                    if let Ok(p) = content.trim().parse::<u16>() {
                        port = p;
                        break;
                    }
                }
            }

            // 3. Navegar la ventana al backend
            if let Some(window) = app.get_webview_window("main") {
                let url = format!("http://127.0.0.1:{}", port);
                let _ = window
                    .navigate(url.parse().expect("Invalid URL"));
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
