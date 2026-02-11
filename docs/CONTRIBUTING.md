# Contributing to ReflexFiles

Thanks for taking the time to contribute.

## How to Contribute
1. Fork the repository and create your branch from `main`.
2. Make your changes with clear, focused commits.
3. Ensure tests and linters pass (see below).
4. Open a Pull Request with a clear description and steps to verify.

## Development Setup (Windows)
```bash
cd app
npm install
npm run tauri dev
```

## Tests
```bash
cd app
npm run e2e:tauri
```

## Code Style
- Prefer small, reviewable commits.
- Keep UI and Rust changes scoped and documented.

## Reporting Issues
Use the issue templates when available and include:
- Expected vs actual behavior
- Steps to reproduce
- Logs or screenshots when relevant

## Code of Conduct
By participating, you agree to follow `CODE_OF_CONDUCT.md`.
