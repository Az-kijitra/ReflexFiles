$ErrorActionPreference = "Stop"

function Get-VersionFromPath {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    return $null
  }
  try {
    return (Get-Item $Path).VersionInfo.ProductVersion
  } catch {
    return $null
  }
}

function Resolve-LatestReleaseForMajor {
  param([string]$Major)
  if (-not $Major) {
    return $null
  }

  $latestCandidates = @(
    "https://msedgedriver.microsoft.com/LATEST_RELEASE_$Major",
    "https://msedgewebdriverstorage.z22.web.core.windows.net/LATEST_RELEASE_$Major",
    "https://msedgedriver.azureedge.net/LATEST_RELEASE_$Major"
  )

  foreach ($latestUrl in $latestCandidates) {
    try {
      $resolved = (Invoke-WebRequest -Uri $latestUrl -UseBasicParsing -TimeoutSec 20).Content.Trim()
      if ($resolved) {
        Write-Host "Resolved latest EdgeDriver for major $Major from ${latestUrl}: $resolved"
        return $resolved
      }
    } catch {
      Write-Host "Failed to resolve from ${latestUrl}: $($_.Exception.Message)"
    }
  }

  return $null
}

function Try-DownloadDriverZip {
  param(
    [string]$DriverVersion,
    [string]$ZipPath
  )

  $zipCandidates = @(
    "https://msedgedriver.microsoft.com/$DriverVersion/edgedriver_win64.zip",
    "https://msedgewebdriverstorage.z22.web.core.windows.net/$DriverVersion/edgedriver_win64.zip",
    "https://msedgedriver.azureedge.net/$DriverVersion/edgedriver_win64.zip"
  )

  foreach ($zipUrl in $zipCandidates) {
    try {
      Invoke-WebRequest -Uri $zipUrl -OutFile $ZipPath -UseBasicParsing -TimeoutSec 60
      Write-Host "Downloaded EdgeDriver from $zipUrl"
      return $true
    } catch {
      Write-Host "Failed download from ${zipUrl}: $($_.Exception.Message)"
    }
  }

  return $false
}

function Add-CandidateVersion {
  param(
    [System.Collections.Generic.List[string]]$List,
    [string]$Value
  )
  if (-not $Value) {
    return
  }
  if (-not $List.Contains($Value)) {
    $null = $List.Add($Value)
  }
}

$edgeExe = "$Env:ProgramFiles (x86)\Microsoft\Edge\Application\msedge.exe"
$edgeVersion = Get-VersionFromPath -Path $edgeExe

$webviewRoot = "$Env:ProgramFiles (x86)\Microsoft\EdgeWebView\Application"
$webviewVersion = $null
if (Test-Path $webviewRoot) {
  $runtimeDir = Get-ChildItem $webviewRoot -Directory |
    Where-Object { $_.Name -match '^\d+\.\d+\.\d+\.\d+$' } |
    Sort-Object { [version]$_.Name } -Descending |
    Select-Object -First 1
  if ($runtimeDir) {
    $webviewVersion = $runtimeDir.Name
  }
}
if (-not $webviewVersion) {
  $webviewVersion = Get-VersionFromPath -Path "$webviewRoot\msedgewebview2.exe"
}

Write-Host "Detected WebView2 version: $webviewVersion"
Write-Host "Detected Edge version: $edgeVersion"

$candidateVersions = New-Object 'System.Collections.Generic.List[string]'
Add-CandidateVersion -List $candidateVersions -Value $webviewVersion
Add-CandidateVersion -List $candidateVersions -Value $edgeVersion

foreach ($version in @($webviewVersion, $edgeVersion)) {
  if (-not $version) {
    continue
  }
  $major = $version.Split('.')[0]
  $latest = Resolve-LatestReleaseForMajor -Major $major
  Add-CandidateVersion -List $candidateVersions -Value $latest
}

if ($candidateVersions.Count -eq 0) {
  throw "Unable to determine Edge/WebView2 version candidates for EdgeDriver."
}

Write-Host "Driver version candidates (in order): $($candidateVersions -join ', ')"

$zipPath = "$PWD\edgedriver.zip"
$installedVersion = $null
foreach ($candidate in $candidateVersions) {
  if (Try-DownloadDriverZip -DriverVersion $candidate -ZipPath $zipPath) {
    $installedVersion = $candidate
    break
  }
}

if (-not $installedVersion) {
  throw "Failed to download EdgeDriver from all candidate versions."
}

Expand-Archive -Path $zipPath -DestinationPath "$PWD\edgedriver" -Force
Copy-Item "$PWD\edgedriver\msedgedriver.exe" "$PWD\msedgedriver.exe" -Force

Write-Host "Installed EdgeDriver version candidate: $installedVersion"
& "$PWD\msedgedriver.exe" --version

