use serde::Serialize;

/// Failure detail for copy/move operations.
#[derive(Serialize)]
pub struct OpFailure {
    pub path: String,
    pub code: String,
    pub error: String,
}

/// Summary of copy/move results.
#[derive(Serialize)]
pub struct OpSummary {
    pub ok: u64,
    pub failed: u64,
    pub total: u64,
    pub failures: Vec<OpFailure>,
}

#[derive(Serialize)]
pub struct TrashItem {
    pub original: String,
    pub trashed: String,
}

#[derive(Serialize)]
pub struct DeleteSummary {
    pub ok: u64,
    pub failed: u64,
    pub total: u64,
    pub failures: Vec<OpFailure>,
    pub trashed: Vec<TrashItem>,
}

#[derive(Serialize, Copy, Clone)]
#[serde(rename_all = "lowercase")]
pub enum OpStatus {
    Start,
    Fail,
    Done,
}

#[derive(Serialize, Copy, Clone)]
#[serde(rename_all = "lowercase")]
pub enum OpKind {
    Copy,
    Move,
}

/// Progress event emitted during copy/move.
#[derive(Serialize, Clone)]
pub struct OpProgress {
    pub op: OpKind,
    pub path: String,
    pub index: u64,
    pub total: u64,
    pub status: OpStatus, // start | fail | done
    pub error: String,
}

/// Directory statistics result.
#[derive(Serialize)]
pub struct DirStats {
    pub size: u64,
    pub files: u64,
    pub dirs: u64,
    pub timed_out: bool,
}
