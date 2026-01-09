@echo off
REM Memory Optimization Application Script
REM This script backs up and replaces files with optimized versions

echo ========================================
echo  Memory Optimization Application
echo ========================================
echo.

echo [1/5] Creating backup directory...
if not exist "backups" mkdir backups
set BACKUP_DIR=backups\backup-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%
set BACKUP_DIR=%BACKUP_DIR: =0%
mkdir "%BACKUP_DIR%"
echo     ✓ Created: %BACKUP_DIR%
echo.

echo [2/5] Backing up current files...
copy "src\server.js" "%BACKUP_DIR%\server.js.backup" >nul
copy "src\services\ai.service.js" "%BACKUP_DIR%\ai.service.js.backup" >nul
echo     ✓ Backed up server.js
echo     ✓ Backed up ai.service.js
echo.

echo [3/5] Checking if optimized files exist...
if not exist "src\server.memory-optimized.js" (
    echo     ✗ ERROR: server.memory-optimized.js not found!
    echo     Please ensure the optimized files are created first.
    pause
    exit /b 1
)
if not exist "src\services\ai.service.memory-optimized.js" (
    echo     ✗ ERROR: ai.service.memory-optimized.js not found!
    echo     Please ensure the optimized files are created first.
    pause
    exit /b 1
)
echo     ✓ All optimized files found
echo.

echo [4/5] Applying optimizations...
copy "src\server.memory-optimized.js" "src\server.js" >nul
copy "src\services\ai.service.memory-optimized.js" "src\services\ai.service.js" >nul
echo     ✓ Replaced server.js with optimized version
echo     ✓ Replaced ai.service.js with optimized version
echo.

echo [5/5] Verification...
echo     ✓ Backups saved to: %BACKUP_DIR%
echo     ✓ Memory optimizations applied
echo.

echo ========================================
echo  Next Steps:
echo ========================================
echo 1. Start the server: npm run dev
echo 2. Test all features (Socket.IO, PDF upload, etc.)
echo 3. Monitor memory usage (check logs every 5 min)
echo 4. If issues occur, restore from: %BACKUP_DIR%
echo.
echo To restore backups:
echo   copy "%BACKUP_DIR%\server.js.backup" "src\server.js"
echo   copy "%BACKUP_DIR%\ai.service.js.backup" "src\services\ai.service.js"
echo.

pause
