pub trait ResultExt<T> {
    fn map_str(self) -> Result<T, String>;
}

impl<T, E: std::fmt::Display> ResultExt<T> for Result<T, E> {
    fn map_str(self) -> Result<T, String> {
        self.map_err(|e| e.to_string())
    }
}
