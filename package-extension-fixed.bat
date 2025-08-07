@echo off
echo Packaging Glimpse Extension for Firefox/Zen Browser...
echo.

REM Remove old package if it exists
if exist glimpse.xpi del glimpse.xpi
if exist glimpse.zip del glimpse.zip
if exist ai-chat-sidebar.xpi del ai-chat-sidebar.xpi
if exist ai-chat-sidebar.zip del ai-chat-sidebar.zip

echo Creating temporary directory structure...
mkdir temp_package 2>nul
copy manifest.json temp_package\ >nul
copy background.js temp_package\ >nul

REM Copy directories with proper structure
xcopy icons temp_package\icons\ /E /I /Q >nul
xcopy sidebar temp_package\sidebar\ /E /I /Q >nul

echo Packaging files...
cd temp_package
powershell -command "Compress-Archive -Path .\* -DestinationPath ..\glimpse.zip -Force"
cd ..

REM Clean up temp directory
rmdir /s /q temp_package

REM Rename to .xpi
ren glimpse.zip glimpse.xpi

echo.
echo ✅ Extension packaged successfully as glimpse.xpi
echo.
echo 📦 Verifying package structure...
powershell -command "Add-Type -AssemblyName System.IO.Compression.FileSystem; $zip = [System.IO.Compression.ZipFile]::OpenRead('glimpse.xpi'); $zip.Entries | ForEach-Object { Write-Host $_.FullName }; $zip.Dispose()"
echo.
echo 🚀 To install in Zen Browser:
echo    1. Remove old extension from about:addons if installed
echo    2. Drag and drop glimpse.xpi into Zen Browser
echo    3. Click 'Add' when prompted
echo    4. Press Ctrl+Shift+Y to open sidebar
echo.
pause
