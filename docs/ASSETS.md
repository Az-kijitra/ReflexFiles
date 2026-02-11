# Asset Inventory

This inventory tracks non-code assets and their ownership/license status.
Fill in `Origin` and `License` before public release.

| Path | Type | Origin | License | Notes |
| --- | --- | --- | --- | --- |
| app/static/favicon.png | PNG | TBD | TBD | App favicon. |
| app/static/ReflexFiles.png | PNG | TBD | TBD | Main product logo/image. |
| docs/ReflexFiles.png | PNG | TBD | TBD | Docs image; likely a copy of the product logo. |
| app/src-tauri/resources/ReflexFiles.png | PNG | TBD | TBD | Bundled resource; likely a copy of the product logo. |
| app/src-tauri/icons/icon.png | PNG | Original (AI-assisted + manual edits) | TBD | Base app icon source. |
| app/src-tauri/icons/icon.ico | ICO | Derived from app/src-tauri/icons/icon.png | TBD | Generated from base app icon. |
| app/src-tauri/icons/icon.icns | ICNS | Derived from app/src-tauri/icons/icon.png | TBD | Generated from base app icon. |
| app/src-tauri/icons/*.png | PNG | Derived from app/src-tauri/icons/icon.png | TBD | Generated size variants (includes StoreLogo/Square*.png). |
| app/src-tauri/icons/android/mipmap-*/ic_launcher*.png | PNG | Derived from app/src-tauri/icons/icon.png | TBD | Android launcher icons. |
| app/src-tauri/icons/ios/*.png | PNG | Derived from app/src-tauri/icons/icon.png | TBD | iOS app icons. |

Notes
- Excluded generated/test artifacts: `app/build/**`, `app/.svelte-kit/**`, `app/src-tauri/target/**`,
  `e2e_artifacts/**`, `app/e2e_artifacts/**`, `app/node_modules/**`.
