@echo off
echo Clearing SecDove database...
echo.

cd /d %~dp0server
npm run clear-db

echo.
echo Database cleared successfully!
echo Press any key to exit...
pause > nul
