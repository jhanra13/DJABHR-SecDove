@echo off
echo Starting SecDove Client in Debug Mode...
echo.

cd /d %~dp0client
echo Current directory: %CD%
echo.

echo Starting development server...
npm run dev

pause