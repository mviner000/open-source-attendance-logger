use tauri::{Manager, Window};

#[tauri::command]
async fn close_splashscreen(window: Window) {
    window.close().unwrap();
}

#[tauri::command]
async fn minimize_window(window: Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
async fn maximize_window(window: Window) -> Result<(), String> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
async fn close_window(window: Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let splashscreen = app.get_webview_window("splashscreen").unwrap();
            let main_window = app.get_webview_window("main").unwrap();

            splashscreen.show().unwrap();

            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(2));
                
                tauri::async_runtime::block_on(async move {
                    // Make sure the window is fullscreen before showing it
                    main_window.set_fullscreen(true).unwrap();
                    main_window.show().unwrap();
                    splashscreen.close().unwrap();
                });
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            close_splashscreen, 
            minimize_window, 
            maximize_window, 
            close_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}