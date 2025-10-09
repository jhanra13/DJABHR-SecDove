@echo off
echo Starting SecureDove server and client...

start cmd /c "cd server && npm start"
start cmd /c "cd client && npm run dev"

echo Both server and client are starting...
pause