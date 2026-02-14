param(
  [string]$OutDir = "testdata/generated/viewer_large_text",
  [string[]]$TextSizes = @("10MB", "100MB", "1GB"),
  [string]$MarkdownSize = "10MB",
  [switch]$SkipMarkdown
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Parse-SizeBytes {
  param([string]$Size)

  $trimmed = ""
  if (-not [string]::IsNullOrWhiteSpace($Size)) {
    $trimmed = $Size.Trim().ToUpperInvariant()
  }

  if ($trimmed -match '^([0-9]+)\s*(B|KB|MB|GB)$') {
    $num = [int64]$Matches[1]
    $unit = $Matches[2]
    switch ($unit) {
      "B" { return $num }
      "KB" { return $num * 1KB }
      "MB" { return $num * 1MB }
      "GB" { return $num * 1GB }
    }
  }

  throw "Invalid size format: '$Size'. Use formats like 10MB, 100MB, 1GB."
}

function Write-LargeTextFile {
  param(
    [string]$Path,
    [int64]$TargetBytes,
    [switch]$Markdown
  )

  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  $file = [System.IO.File]::Open($Path, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::Read)
  try {
    $writer = New-Object System.IO.StreamWriter($file, $utf8NoBom, 1048576)
    try {
      $lineNo = 1
      $barWidth = 32
      $reportEvery = 5000

      if ($Markdown) {
        $writer.WriteLine("# Large Markdown Test")
        $writer.WriteLine("")
      }

      while ($file.Length -lt $TargetBytes) {
        if ($Markdown) {
          if ($lineNo % 40 -eq 1) {
            $writer.WriteLine(("## Section {0}" -f $lineNo))
          }
          $line = "- [{0}] **item_{0}** value=`"{1}`" code:`seed_{2}`"" -f $lineNo, ([Convert]::ToString(($lineNo * 2654435761), 16)), ($lineNo % 997)
        } else {
          $line = "line={0} token={1} path=C:\\temp\\sample_{2}.txt message=The_quick_brown_fox_jumps_over_the_lazy_dog_{3}" -f $lineNo, ([Convert]::ToString(($lineNo * 2654435761), 16)), ($lineNo % 1000), ($lineNo % 97)
        }

        $writer.WriteLine($line)
        $lineNo++

        if ($lineNo % $reportEvery -eq 0) {
          $writer.Flush()
          $ratio = [Math]::Min(1.0, [double]$file.Length / [double]$TargetBytes)
          $filled = [int][Math]::Round($ratio * $barWidth)
          $bar = ("#" * $filled).PadRight($barWidth, '.')
          Write-Host (("[{0}] {1,6:P1} {2:N0}/{3:N0} bytes" -f $bar, $ratio, $file.Length, $TargetBytes))
        }
      }

      $writer.Flush()
    } finally {
      $writer.Dispose()
    }
  } finally {
    $file.Dispose()
  }
}

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

foreach ($size in $TextSizes) {
  $bytes = Parse-SizeBytes -Size $size
  $name = ("large_text_{0}.txt" -f $size.ToLowerInvariant())
  $path = Join-Path $OutDir $name
  Write-Host "Generating text: $name ($bytes bytes)"
  Write-LargeTextFile -Path $path -TargetBytes $bytes
  Write-Host "Done: $path"
}

if (-not $SkipMarkdown) {
  $mdBytes = Parse-SizeBytes -Size $MarkdownSize
  $mdName = ("large_markdown_{0}.md" -f $MarkdownSize.ToLowerInvariant())
  $mdPath = Join-Path $OutDir $mdName
  Write-Host "Generating markdown: $mdName ($mdBytes bytes)"
  Write-LargeTextFile -Path $mdPath -TargetBytes $mdBytes -Markdown
  Write-Host "Done: $mdPath"
}

Write-Host "All files generated under: $OutDir"
