use std::fs::OpenOptions;
use std::io::Write;
use tauri::Manager;

#[tauri::command]
pub fn append_log(app: tauri::AppHandle, message: String) -> Result<(), String> {
    let log_dir = app
        .path()
        .app_log_dir()
        .map_err(|e| format!("Failed to resolve log dir: {}", e))?;

    std::fs::create_dir_all(&log_dir)
        .map_err(|e| format!("Failed to create log dir: {}", e))?;

    let log_path = log_dir.join("claude-terminal.log");

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|e| format!("Failed to open log file: {}", e))?;

    writeln!(file, "{}", message)
        .map_err(|e| format!("Failed to write log: {}", e))?;

    Ok(())
}
