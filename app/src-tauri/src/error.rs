use std::fmt::{self, Display};

#[derive(Debug, Copy, Clone, PartialEq, Eq)]
pub enum AppErrorKind {
    Permission,
    NotFound,
    Conflict,
    InvalidPath,
    Io,
    Unknown,
}

impl AppErrorKind {
    pub fn code(self) -> &'static str {
        match self {
            AppErrorKind::Permission => "permission_denied",
            AppErrorKind::NotFound => "not_found",
            AppErrorKind::Conflict => "conflict",
            AppErrorKind::InvalidPath => "invalid_path",
            AppErrorKind::Io => "io_error",
            AppErrorKind::Unknown => "unknown",
        }
    }

    pub fn from_io(kind: std::io::ErrorKind) -> Self {
        use std::io::ErrorKind;
        match kind {
            ErrorKind::NotFound => AppErrorKind::NotFound,
            ErrorKind::PermissionDenied => AppErrorKind::Permission,
            ErrorKind::AlreadyExists => AppErrorKind::Conflict,
            ErrorKind::InvalidInput => AppErrorKind::InvalidPath,
            _ => AppErrorKind::Io,
        }
    }
}

#[derive(Debug)]
pub enum AppError {
    Io(std::io::Error),
    Message { kind: AppErrorKind, message: String },
}

impl AppError {
    pub fn msg(message: impl Into<String>) -> Self {
        AppError::Message {
            kind: AppErrorKind::Unknown,
            message: message.into(),
        }
    }

    pub fn with_kind(kind: AppErrorKind, message: impl Into<String>) -> Self {
        AppError::Message {
            kind,
            message: message.into(),
        }
    }

    pub fn kind(&self) -> AppErrorKind {
        match self {
            AppError::Io(err) => AppErrorKind::from_io(err.kind()),
            AppError::Message { kind, .. } => *kind,
        }
    }

    pub fn code(&self) -> &'static str {
        self.kind().code()
    }
}

impl Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::Io(err) => write!(f, "{err}"),
            AppError::Message { message, .. } => write!(f, "{message}"),
        }
    }
}

impl std::error::Error for AppError {}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io(err)
    }
}

impl From<String> for AppError {
    fn from(message: String) -> Self {
        AppError::Message {
            kind: AppErrorKind::Unknown,
            message,
        }
    }
}

impl From<&str> for AppError {
    fn from(message: &str) -> Self {
        AppError::Message {
            kind: AppErrorKind::Unknown,
            message: message.to_string(),
        }
    }
}

pub type AppResult<T> = Result<T, AppError>;

pub fn format_error(kind: AppErrorKind, message: impl Into<String>) -> String {
    let message = message.into();
    format!("code={}; {}", kind.code(), message)
}

pub fn format_unknown(message: impl Into<String>) -> String {
    format_error(AppErrorKind::Unknown, message)
}

pub fn ensure_error_string(message: impl Into<String>) -> String {
    let message = message.into();
    if message.starts_with("code=") {
        message
    } else {
        format_unknown(message)
    }
}
