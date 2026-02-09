use std::path::PathBuf;

#[tauri::command]
pub fn resolve_claude_path() -> Result<String, String> {
    // Try common locations for the Claude CLI
    let candidates = get_claude_candidates();

    for candidate in &candidates {
        if candidate.exists() {
            return Ok(candidate.to_string_lossy().to_string());
        }
    }

    // Try PATH lookup via `where` on Windows or `which` on Unix
    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = std::process::Command::new("where").arg("claude").output() {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout);
                if let Some(first_line) = path.lines().next() {
                    let p = PathBuf::from(first_line.trim());
                    if p.exists() {
                        return Ok(p.to_string_lossy().to_string());
                    }
                }
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        if let Ok(output) = std::process::Command::new("which").arg("claude").output() {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout);
                let p = PathBuf::from(path.trim());
                if p.exists() {
                    return Ok(p.to_string_lossy().to_string());
                }
            }
        }
    }

    Err("Claude CLI not found. Please install it from https://docs.anthropic.com/en/docs/claude-code".to_string())
}

#[derive(serde::Serialize)]
pub struct SessionInfo {
    pub id: String,
    pub project: String,
    pub modified: u64,
}

#[tauri::command]
pub fn list_sessions() -> Result<Vec<SessionInfo>, String> {
    let home = get_home_dir()?;
    let claude_dir = home.join(".claude").join("projects");

    if !claude_dir.exists() {
        return Ok(vec![]);
    }

    let mut sessions = Vec::new();

    let project_dirs = std::fs::read_dir(&claude_dir)
        .map_err(|e| format!("Failed to read .claude/projects: {}", e))?;

    for project_entry in project_dirs.flatten() {
        if !project_entry.path().is_dir() {
            continue;
        }

        let project_name = project_entry.file_name().to_string_lossy().to_string();

        let entries = match std::fs::read_dir(project_entry.path()) {
            Ok(e) => e,
            Err(e) => {
                eprintln!("Warning: could not read project dir {:?}: {}", project_entry.path(), e);
                continue;
            }
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("jsonl") {
                if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                    let modified = entry
                        .metadata()
                        .ok()
                        .and_then(|m| m.modified().ok())
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs())
                        .unwrap_or(0);

                    sessions.push(SessionInfo {
                        id: stem.to_string(),
                        project: project_name.clone(),
                        modified,
                    });
                }
            }
        }
    }

    // Sort by modified time, newest first
    sessions.sort_by(|a, b| b.modified.cmp(&a.modified));

    // Limit to most recent 50
    sessions.truncate(50);

    Ok(sessions)
}

fn get_home_dir() -> Result<PathBuf, String> {
    #[cfg(target_os = "windows")]
    {
        std::env::var("USERPROFILE")
            .map(PathBuf::from)
            .map_err(|_| "USERPROFILE not set".to_string())
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::env::var("HOME")
            .map(PathBuf::from)
            .map_err(|_| "HOME not set".to_string())
    }
}

fn get_claude_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    #[cfg(target_os = "windows")]
    {
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            candidates.push(PathBuf::from(&local_app_data).join("Programs").join("claude").join("claude.exe"));
        }
        if let Ok(app_data) = std::env::var("APPDATA") {
            candidates.push(PathBuf::from(&app_data).join("npm").join("claude.cmd"));
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Ok(home) = std::env::var("HOME") {
            candidates.push(PathBuf::from(&home).join(".npm-global").join("bin").join("claude"));
            candidates.push(PathBuf::from("/usr/local/bin/claude"));
            candidates.push(PathBuf::from("/opt/homebrew/bin/claude"));
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(home) = std::env::var("HOME") {
            candidates.push(PathBuf::from(&home).join(".npm-global").join("bin").join("claude"));
            candidates.push(PathBuf::from("/usr/local/bin/claude"));
        }
    }

    candidates
}
