use std::path::PathBuf;
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

            // 2. Esperar a que el backend escriba .port
            std::thread::sleep(std::time::Duration::from_secs(3));

            // 3. Leer puerto desde AppData/Local/SistemaLicoreria/.port
            let port_path = get_port_path();
            let port: u16 = std::fs::read_to_string(&port_path)
                .unwrap_or_else(|_| {
                    eprintln!(
                        "⚠ No se pudo leer {:?}, usando puerto 8000",
                        port_path
                    );
                    "8000".to_string()
                })
                .trim()
                .parse()
                .unwrap_or(8000);

            // 4. Navegar la ventana al backend
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
