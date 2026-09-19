@echo off
setlocal

rem Project root = directory containing this script (no hardcoded paths).
set PROJECT_DIR=%~dp0

echo ===============================
echo  Rebuild project...
echo ===============================
cd /d "%PROJECT_DIR%"
call gradlew.bat :desktop:installDist

if errorlevel 1 (
    echo.
    echo Build failed. App will not be launched
    pause
    exit /b 1
)

echo.
echo ===============================
echo  Launching app...
echo ===============================
call "%PROJECT_DIR%desktop\build\install\desktop\bin\desktop.bat"

endlocal