param(
    [string]$InternalToken
)

$ErrorActionPreference = "Stop"
$serverRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $serverRoot ".env"

if ([string]::IsNullOrWhiteSpace($InternalToken)) {
    $InternalToken = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
}

$apiKey = Read-Host "OpenAI API key (saved only to ai-server/.env)"
if ([string]::IsNullOrWhiteSpace($apiKey)) {
    throw "An OpenAI API key is required. The .env file was not written."
}

$envLines = [string[]]@(
    "OPENAI_API_KEY=$apiKey"
    "AI_INTERNAL_TOKEN=$InternalToken"
    "OPENAI_MODEL=gpt-5-mini"
    "OPENAI_TIMEOUT_SECONDS=10"
    "OPENAI_REASONING_EFFORT=minimal"
    "ANALYZE_MAX_OUTPUT_TOKENS=200"
    "RESPOND_MAX_OUTPUT_TOKENS=80"
    "LOG_LEVEL=INFO"
)

[System.IO.File]::WriteAllLines(
    $envPath,
    $envLines,
    (New-Object System.Text.UTF8Encoding($false))
)

Write-Host "Configured $envPath"
