param(
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$ProjectDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Url = "http://127.0.0.1:3000"
$OutLog = Join-Path $ProjectDir "server.out.log"
$ErrLog = Join-Path $ProjectDir "server.err.log"

function Test-AppReady {
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

function Find-Npm {
  $cmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  $candidates = @(
    "$env:ProgramFiles\nodejs\npm.cmd",
    "${env:ProgramFiles(x86)}\nodejs\npm.cmd",
    "$env:LOCALAPPDATA\Programs\nodejs\npm.cmd",
    "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.15.0-win-x64\npm.cmd"
  )

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) {
      return $candidate
    }
  }

  $wingetRoot = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages"
  if (Test-Path -LiteralPath $wingetRoot) {
    $found = Get-ChildItem -Path $wingetRoot -Recurse -Filter npm.cmd -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -like "*OpenJS.NodeJS.LTS*" } |
      Select-Object -First 1
    if ($found) {
      return $found.FullName
    }
  }

  throw "Nao encontrei o npm.cmd. Instale ou repare o Node.js LTS para iniciar o sistema."
}

function Find-Chrome {
  $cmd = Get-Command chrome.exe -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  $candidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
  )

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) {
      return $candidate
    }
  }

  return $null
}

if (-not (Test-AppReady)) {
  $npm = Find-Npm
  Start-Process -FilePath $npm `
    -ArgumentList @("run", "dev", "--", "--hostname", "127.0.0.1", "--port", "3000") `
    -WorkingDirectory $ProjectDir `
    -RedirectStandardOutput $OutLog `
    -RedirectStandardError $ErrLog `
    -WindowStyle Hidden

  $ready = $false
  for ($i = 0; $i -lt 45; $i++) {
    Start-Sleep -Seconds 1
    if (Test-AppReady) {
      $ready = $true
      break
    }
  }

  if (-not $ready) {
    Start-Process -FilePath "notepad.exe" -ArgumentList $ErrLog
    throw "O servidor foi iniciado, mas nao respondeu em $Url. Veja o log de erro aberto."
  }
}

if (-not $NoBrowser) {
  $chrome = Find-Chrome
  if ($chrome) {
    Start-Process -FilePath $chrome -ArgumentList $Url
  } else {
    Start-Process $Url
  }
}
