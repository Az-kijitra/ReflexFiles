use crate::fs_ops_mutate_helpers::{io_error_code, log_and_fail};
use crate::fs_ops_preflight::preflight_create;
use std::fs;
use std::time::Instant;

#[tauri::command]
pub fn fs_create(parent: String, name: String, kind: String) -> Result<(), String> {
    let started = Instant::now();
    let target = match preflight_create(&parent, &name, &kind) {
        Ok(target) => target,
        Err(err) => {
            crate::log_error(
                "create",
                &parent,
                &name,
                &format!("code={}; {}", err.code, err.message),
            );
            return Err(format!("code={}; {}", err.code, err.message));
        }
    };
    let result = if kind == "folder" {
        fs::create_dir(&target).map(|_| ())
    } else {
        fs::File::create(&target).map(|_| ())
    };
    if let Err(err) = result {
        let code = io_error_code(&err);
        return log_and_fail(
            "create",
            &parent,
            &target.to_string_lossy(),
            &format!("code={}; {}", code, err),
        );
    }
    crate::log_event(
        "CREATE",
        &parent,
        &target.to_string_lossy(),
        &format!("kind={}; ms={}", kind, started.elapsed().as_millis()),
    );
    Ok(())
}
