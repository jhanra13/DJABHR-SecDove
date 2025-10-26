@echo off
setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set CLIENT_DIR=%SCRIPT_DIR%..\client
set DEFAULT_DOMAINS=localhost

if "%*"=="" (
    set DOMAINS=%DEFAULT_DOMAINS%
) else (
    set DOMAINS=%DEFAULT_DOMAINS% %*
)

echo [devcert] Generating certificate for domains/IPs: %DOMAINS%
echo [devcert] IPv4 entries will be mapped to *.sslip.io hostnames for compatibility.
pushd "%CLIENT_DIR%" >nul 2>&1
if errorlevel 1 (
    echo [devcert] Failed to locate client directory: %CLIENT_DIR%
    exit /b 1
)

node .\scripts\generate-devcert.mjs %DOMAINS%
set ERR=%ERRORLEVEL%
popd >nul 2>&1

if not %ERR%==0 (
    echo [devcert] Certificate generation failed.
    exit /b %ERR%
)

echo [devcert] Certificate generation completed successfully.
exit /b 0
