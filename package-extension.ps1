# PowerShell script to package Firefox/Zen Browser extension
Write-Host "Packaging Glimpse Extension..." -ForegroundColor Green

# Remove old packages
if (Test-Path "glimpse.xpi") { Remove-Item "glimpse.xpi" -Force }
if (Test-Path "glimpse.zip") { Remove-Item "glimpse.zip" -Force }
if (Test-Path "ai-chat-sidebar.xpi") { Remove-Item "ai-chat-sidebar.xpi" -Force }
if (Test-Path "ai-chat-sidebar.zip") { Remove-Item "ai-chat-sidebar.zip" -Force }
if (Test-Path "temp_package") { Remove-Item "temp_package" -Recurse -Force }

# Create temporary directory with correct structure
New-Item -ItemType Directory -Path "temp_package" -Force | Out-Null

# Copy files maintaining structure
Copy-Item "manifest.json" -Destination "temp_package\"
Copy-Item "background.js" -Destination "temp_package\"
Copy-Item "sidebar.html" -Destination "temp_package\"
Copy-Item "sidebar.css" -Destination "temp_package\"
Copy-Item "sidebar.js" -Destination "temp_package\"
Copy-Item "retry.css" -Destination "temp_package\"
Copy-Item "icons" -Destination "temp_package\" -Recurse

Write-Host "Files copied to temporary structure:" -ForegroundColor Yellow
Get-ChildItem "temp_package" -Recurse | ForEach-Object { Write-Host "  $($_.FullName.Replace((Get-Location).Path + '\temp_package\', ''))" }

# Create ZIP package
Compress-Archive -Path "temp_package\*" -DestinationPath "glimpse.zip" -Force

# Clean up
Remove-Item "temp_package" -Recurse -Force

# Rename to .xpi
Rename-Item "glimpse.zip" "glimpse.xpi"

Write-Host "`n✅ Extension packaged as glimpse.xpi" -ForegroundColor Green

# Verify package contents
Write-Host "`n📦 Package contents:" -ForegroundColor Cyan
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("glimpse.xpi")
$zip.Entries | ForEach-Object { Write-Host "  $($_.FullName)" -ForegroundColor White }
$zip.Dispose()

Write-Host "`n🚀 Installation steps:" -ForegroundColor Magenta
Write-Host "  1. Open Zen Browser"
Write-Host "  2. Go to about:addons and remove old version if installed"
Write-Host "  3. Drag glimpse.xpi into browser window"
Write-Host "  4. Click 'Add' when prompted"
Write-Host "  5. Press Ctrl+Shift+Y to open sidebar"

Read-Host "`nPress Enter to exit"
