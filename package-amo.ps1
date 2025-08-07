Write-Host "Packaging Glimpse for Firefox AMO Submission..." -ForegroundColor Green

# Remove old packages
if (Test-Path "glimpse-amo.zip") { Remove-Item "glimpse-amo.zip" -Force }
if (Test-Path "ai-chat-sidebar-amo.zip") { Remove-Item "ai-chat-sidebar-amo.zip" -Force }

# Create the AMO package with all required files
Compress-Archive -Path manifest.json,background.js,sidebar.html,sidebar.css,sidebar.js,retry.css,icon-48.png,icon-96.png,PRIVACY-POLICY.md,README.md -DestinationPath "glimpse-amo.zip" -Force

Write-Host "✅ AMO package created as glimpse-amo.zip" -ForegroundColor Green

Write-Host "`n📋 Before submitting to AMO:" -ForegroundColor Yellow
Write-Host "  1. Update manifest.json with your actual details (author, homepage)"
Write-Host "  2. Take screenshots of the extension in action"
Write-Host "  3. Create Mozilla Developer account"
Write-Host "  4. Test extension thoroughly in clean Firefox profile"

Write-Host "`n🚀 Ready for AMO submission!" -ForegroundColor Cyan
Write-Host "   Upload glimpse-amo.zip to https://addons.mozilla.org/developers/addon/submit/"
