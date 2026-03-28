#Requires -Version 5.1
<#
.SYNOPSIS
    Start the Astro docs dev server on Windows.
.DESCRIPTION
    Installs dependencies if needed, picks a free port, launches the dev server,
    opens a browser, and tears everything down on Ctrl+C.
#>

param(
    [int]$Port = 0
)

$ErrorActionPreference = 'Stop'

$DocsDir = 'docs'

if (-not (Test-Path $DocsDir -PathType Container)) {
    Write-Error "Error: $DocsDir directory not found in $(Get-Location)"
    exit 1
}

# Pick a free port if none was supplied
if ($Port -eq 0) {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
    $listener.Start()
    $Port = $listener.LocalEndpoint.Port
    $listener.Stop()
}

Push-Location $DocsDir

try {
    # Disable Astro dev toolbar
    if (Get-Command npx -ErrorAction SilentlyContinue) {
        Write-Host 'Disabling Astro dev toolbar (devToolbar preference)'
        npx astro preferences disable devToolbar --global 2>$null | Out-Null
    }

    # Detect package manager
    $PkgManager = 'npm'
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        $PkgManager = 'pnpm'
    } elseif (Get-Command yarn -ErrorAction SilentlyContinue) {
        $PkgManager = 'yarn'
    }

    # Install dependencies if needed
    if (-not (Test-Path 'node_modules' -PathType Container)) {
        Write-Host "Installing docs dependencies with $PkgManager..."
        switch ($PkgManager) {
            'pnpm' { pnpm install }
            'yarn' { yarn install --silent }
            default { npm install --no-audit --no-fund --silent }
        }
    }

    # Build the dev command
    $DevArgs = switch ($PkgManager) {
        'pnpm' { @('run', 'dev', '--', '--port', $Port) }
        'yarn' { @('dev', '--port', $Port) }
        default { @('run', 'dev', '--', '--port', $Port) }
    }

    Write-Host "Starting Astro dev server (docs) on http://127.0.0.1:$Port"

    # Start dev server as a background job
    $ServerProcess = Start-Process -FilePath $PkgManager -ArgumentList $DevArgs `
        -NoNewWindow -PassThru

    $Url = "http://127.0.0.1:$Port/"

    # Wait for the server to be ready (up to 20 seconds)
    $MaxWait = 20
    $Elapsed = 0
    $Interval = 0.25
    while ($Elapsed -lt $MaxWait) {
        try {
            $tcp = [System.Net.Sockets.TcpClient]::new()
            $tcp.Connect('127.0.0.1', $Port)
            $tcp.Close()
            break
        } catch {
            Start-Sleep -Milliseconds ([int]($Interval * 1000))
            $Elapsed += $Interval
        }
    }

    # Open the browser
    Start-Process $Url

    Write-Host 'Press Ctrl+C to stop the preview and exit.'

    # Keep running until Ctrl+C
    try {
        $ServerProcess.WaitForExit()
    } finally {
        if (-not $ServerProcess.HasExited) {
            Write-Host "Stopping dev server (PID $($ServerProcess.Id))"
            Stop-Process -Id $ServerProcess.Id -Force -ErrorAction SilentlyContinue
        }
    }
} finally {
    Pop-Location
}
