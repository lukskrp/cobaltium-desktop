//! Minimal C ABI over `jpreprocess` (OpenJTalk rewrite) for Japanese G2P.
//! Returns newline-joined full-context labels; the IPA mapping is done in TS,
//! ported from piper1-gpl's `phonemize_japanese.py`. BSD-3-Clause.
use std::ffi::CStr;
use std::os::raw::c_char;
use std::sync::OnceLock;

use jpreprocess::{kind::*, DefaultTokenizer, JPreprocess, SystemDictionaryConfig};

static JP: OnceLock<JPreprocess<DefaultTokenizer>> = OnceLock::new();

fn preprocessor() -> &'static JPreprocess<DefaultTokenizer> {
    JP.get_or_init(|| {
        let system = SystemDictionaryConfig::Bundled(JPreprocessDictionaryKind::NaistJdic)
            .load()
            .expect("load bundled naist-jdic");
        JPreprocess::with_dictionaries(system, None)
    })
}

/// Extract newline-joined full-context labels for `text`.
/// Returns bytes needed (excl. NUL), or a negative error code.
#[no_mangle]
pub extern "C" fn ja_bridge_extract(text: *const c_char, out: *mut c_char, cap: i32) -> i32 {
    if text.is_null() || out.is_null() {
        return -1;
    }
    let input = unsafe {
        match CStr::from_ptr(text).to_str() {
            Ok(value) => value,
            Err(_) => return -2,
        }
    };
    let labels = match preprocessor().extract_fullcontext(input) {
        Ok(value) => value,
        Err(_) => return -3,
    };
    let joined = labels
        .iter()
        .map(|label| label.to_string())
        .collect::<Vec<_>>()
        .join("\n");
    let bytes = joined.as_bytes();
    let needed = bytes.len() as i32;
    if cap <= 0 || needed + 1 > cap {
        return needed;
    }
    unsafe {
        std::ptr::copy_nonoverlapping(bytes.as_ptr() as *const c_char, out, bytes.len());
        *out.add(bytes.len()) = 0;
    }
    needed
}
