pub trait ResultExt<T> {
    fn map_str(self) -> Result<T, String>;
}

impl<T, E: std::fmt::Display> ResultExt<T> for Result<T, E> {
    fn map_str(self) -> Result<T, String> {
        self.map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn map_str_converts_err_to_display_string() {
        let ok: Result<i32, std::num::ParseIntError> = Ok(42);
        assert_eq!(ok.map_str(), Ok(42));

        let err: Result<i32, std::num::ParseIntError> = "not a number".parse::<i32>();
        assert_eq!(err.map_str(), Err("invalid digit found in string".to_string()));
    }
}
