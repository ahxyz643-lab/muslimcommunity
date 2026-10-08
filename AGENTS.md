
- All uploads go through `UploadWizard` (/create) and the singleton `uploadManager` in src/lib/upload; never add per-page upload flows — keeps one pipeline and background progress.
