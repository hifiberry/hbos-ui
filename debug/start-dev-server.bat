@echo off
echo Starting HifiBerry UI Development Server...
echo.
echo This will start the development server with the dev-server configuration
echo connecting to API at 192.168.1.66:80 (nginx proxy)
echo.
echo Server will be available at: http://localhost:5173/
echo.

REM Kill any existing Node.js processes to ensure clean start
taskkill /f /im node.exe >nul 2>&1

REM Start the development server with dev-server config on port 5173
npm run dev-server -- --port 5173

pause
