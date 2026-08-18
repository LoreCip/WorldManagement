# WorldManagement

## Dev checks
Run before committing changes:
- Frontend (`worldManagement/`): `pnpm check` (tsc --noEmit + eslint + vitest)
- Backend (`worldManagement/src-tauri/`): `cargo test && cargo clippy`

TODO:
    - Pagina impostazioni personalizzate, colori, nomi mesi, estensione massima timeline
    - Error message when mandatory field is missing (title in wiki)
    - Give confirmation on map delete
    - Fix the snipped in wiki sidebar to show nicely a markdown preview
    - Filter by tag

TIMELINE
    - Possibilità di dare limiti assoluti della timeline, magari dalla pagina delle impostazioni? 

RELAZIONI

GENERALE
