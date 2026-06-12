@echo off
echo ========================================
echo  Planner Build Script
echo ========================================
echo.

echo [0/3] Downloading WebView2 bootstrapper...
if not exist MicrosoftEdgeWebview2Setup.exe (
    curl -L -o MicrosoftEdgeWebview2Setup.exe "https://go.microsoft.com/fwlink/p/?LinkId=2124703"
    if errorlevel 1 (
        echo FAILED: Could not download WebView2 bootstrapper. Check internet connection.
        pause
        exit /b 1
    )
    echo WebView2 bootstrapper downloaded.
) else (
    echo WebView2 bootstrapper already exists, skipping.
)
echo.

echo [1/3] Building main app...
py -3.13 -m PyInstaller app.spec --clean -y
if errorlevel 1 (
    echo FAILED: main app build error.
    pause
    exit /b 1
)

echo.
echo [2/3] Building widget...
py -3.13 -m PyInstaller widget.spec --clean -y
if errorlevel 1 (
    echo FAILED: widget build error.
    pause
    exit /b 1
)

echo.
echo [3/3] Done!
echo.
echo ----------------------------------------
echo  Next: Create installer
echo  1. Install Inno Setup
echo  2. Open installer.iss in Inno Setup Compiler
echo  3. Build ^> Compile (Ctrl+F9)
echo  4. Distribute installer_output/setup.exe
echo ----------------------------------------
echo.
pause
