use tauri::command;
use std::process::Command;
use std::io::{Write, Read};
use regex::Regex;

#[command]
pub async fn execute_command(command: String) -> Result<String, String> {
    // Sanitize the command to prevent injection
    let sanitized_command = sanitize_command(&command)?;
    
    // Execute the command using the system shell
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", &sanitized_command])
            .output()
    } else {
        Command::new("sh")
            .arg("-c")
            .arg(&sanitized_command)
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

/// Sanitize command input to prevent injection attacks
fn sanitize_command(command: &str) -> Result<String, String> {
    // Check for potentially dangerous characters
    let dangerous_patterns = [
        "&", "|", ";", "$", "`", "<", ">", "\\", "/", "~", "\\\\", "\"", "'",
    ];
    
    for pattern in dangerous_patterns {
        if command.contains(pattern) {
            return Err(format!("Command contains forbidden character: {}", pattern));
        }
    }
    
    // Check for absolute paths
    if command.starts_with("/") || command.starts_with("\\\\") || command.contains(":\\\") {
        return Err("Absolute paths are not allowed".to_string());
    }
    
    // Check for command chaining
    let re = Regex::new(r"\s+&&\s+|\s+\|\s+|\s+;\s+").unwrap();
    if re.is_match(command) {
        return Err("Command chaining is not allowed".to_string());
    }
    
    Ok(command.to_string())
}