Write-Host "Packaging Glimpse Extension..." -ForegroundColor Green

# Remove old packages
if (Test-Path "glimpse.xpi") { Remove-Item "glimpse.xpi" -Force }
if (Test-Path "glimpse.zip") { Remove-Item "glimpse.zip" -Force }
if (Test-Path "ai-chat-sidebar.xpi") { Remove-Item "ai-chat-sidebar.xpi" -Force }
if (Test-Path "ai-chat-sidebar.zip") { Remove-Item "ai-chat-sidebar.zip" -Force }
if (Test-Path "temp_package") { Remove-Item "temp_package" -Recurse -Force }

# Create temporary directory
New-Item -ItemType Directory -Path "temp_package" -Force | Out-Null

# Copy files
Copy-Item "manifest.json" -Destination "temp_package\"
Copy-Item "background.js" -Destination "temp_package\"
Copy-Item "sidebar.html" -Destination "temp_package\"
Copy-Item "sidebar.css" -Destination "temp_package\"
Copy-Item "sidebar.js" -Destination "temp_package\"
Copy-Item "retry.css" -Destination "temp_package\"
Copy-Item "icon-48.png" -Destination "temp_package\"
Copy-Item "icon-96.png" -Destination "temp_package\"

Write-Host "Files copied successfully" -ForegroundColor Yellow

# Create ZIP package
Compress-Archive -Path "temp_package\*" -DestinationPath "glimpse.zip" -Force

# Clean up
Remove-Item "temp_package" -Recurse -Force

# Rename to .xpi
Rename-Item "glimpse.zip" "glimpse.xpi"

Write-Host "Extension packaged as glimpse.xpi" -ForegroundColor Green

Write-Host "Ready to install in Zen Browser!" -ForegroundColor Cyan
