use tauri::command;
use std::process::Command;
use std::io::{Write, Read};

#[command]
pub async fn execute_command(command: String) -> Result<String, String> {
    // Execute the command using the system shell
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", &command])
            .output()
    } else {
        Command::new("sh")
            .arg("-c")
            .arg(&command)
            .output()
    };

    match output {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                Ok(stdout.into_owned())
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(stderr.into_owned())
            }
        }
        Err(e) => Err(e.to_string()),
    }
}