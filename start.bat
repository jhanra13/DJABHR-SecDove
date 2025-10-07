@echo off
echo Starting SecDove Server and Client...

REM Start the server in a new command window
start "SecDove Server" cmd /k "cd /d %~dp0server && npm start"

REM Wait a moment for server to start
timeout /t 3 /nobreak > nul

REM Start the client in a new command window
start "SecDove Client" cmd /k "cd /d %~dp0client && npm run dev"

echo Both server and client are starting...
echo Server: http://localhost:8000
echo Client: http://localhost:3000
pause