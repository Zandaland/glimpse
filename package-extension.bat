@echo off
echo Packaging Glimpse Extension for Firefox...
echo.

REM Remove old package if it exists
if exist glimpse.xpi del glimpse.xpi
if exist glimpse.zip del glimpse.zip
if exist ai-chat-sidebar.xpi del ai-chat-sidebar.xpi
if exist ai-chat-sidebar.zip del ai-chat-sidebar.zip

REM Create the package
powershell -command "Compress-Archive -Path .\manifest.json, .\background.js, .\icons, .\sidebar -DestinationPath glimpse.zip -Force"

REM Rename to .xpi
ren glimpse.zip glimpse.xpi

echo.
echo ✅ Extension packaged successfully as glimpse.xpi
echo.
echo 📦 Package contents:
echo    - manifest.json
echo    - background.js
echo    - icons/ folder
echo    - sidebar/ folder
echo.
echo 🚀 To install in Firefox:
echo    1. Open Firefox (preferably Developer Edition)
echo    2. Drag and drop glimpse.xpi into Firefox
echo    3. Click 'Add' when prompted
echo.
echo 💡 For permanent installation without signing, use Firefox Developer Edition
echo    and set xpinstall.signatures.required = false in about:config
echo.
pause
