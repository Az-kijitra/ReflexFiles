# Large Viewer Test Data

Generate local test files for large text verification:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/generate_large_viewer_testdata.ps1
```

Default output:
- `testdata/generated/viewer_large_text/large_text_10mb.txt`
- `testdata/generated/viewer_large_text/large_text_100mb.txt`
- `testdata/generated/viewer_large_text/large_text_1gb.txt`
- `testdata/generated/viewer_large_text/large_markdown_10mb.md`

Options:

```powershell
# Text only (skip markdown)
powershell -ExecutionPolicy Bypass -File scripts/generate_large_viewer_testdata.ps1 -SkipMarkdown

# Custom sizes / output folder
powershell -ExecutionPolicy Bypass -File scripts/generate_large_viewer_testdata.ps1 `
  -OutDir testdata/generated/custom_large_text `
  -TextSizes 10MB,200MB `
  -MarkdownSize 20MB
```

Benchmark procedure:
- `development_documents/VIEWER_PERFORMANCE_BENCH.md`
- `development_documents/VIEWER_PERFORMANCE_BENCH.ja.md`
