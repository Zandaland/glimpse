# Firefox Installation Guide for Glimpse

## Method 1: Temporary Installation (Development Mode)

### For Testing/Development:
1. Open Firefox
2. Type `about:debugging` in the address bar
3. Click "This Firefox" on the left sidebar
4. Click "Load Temporary Add-on..."
5. Navigate to your extension folder and select the `manifest.json` file
6. The extension will be loaded temporarily (until Firefox restarts)

## Method 2: Permanent Installation (Recommended)

### Option A: Create a Signed XPI Package

1. **Package the extension:**
   - Zip all your extension files (including manifest.json, background.js, sidebar folder, icons folder)
   - Rename the .zip file to .xpi (e.g., `glimpse.xpi`)

2. **Sign the extension (for permanent installation):**
   - Go to [Mozilla Add-on Developer Hub](https://addons.mozilla.org/developers/)
   - Create an account if you don't have one
   - Submit your extension for review (this can take several days)

### Option B: Developer Edition Installation (Immediate)

1. **Download Firefox Developer Edition** (if you don't have it):
   - Go to https://www.mozilla.org/firefox/developer/
   - Install Firefox Developer Edition

2. **Enable unsigned extensions:**
   - In Firefox Developer Edition, type `about:config` in the address bar
   - Search for `xpinstall.signatures.required`
   - Double-click to set it to `false`

3. **Install your extension:**
   - Package your extension as a .xpi file (zip all files and rename to .xpi)
   - Drag and drop the .xpi file into Firefox Developer Edition
   - Click "Add" when prompted

### Option C: Local Development Setup

1. **Enable extension debugging:**
   - Type `about:config` in Firefox address bar
   - Set `extensions.experiments.enabled` to `true`
   - Set `xpinstall.signatures.required` to `false` (Developer Edition only)

2. **Install web-ext tool:**
   ```bash
   npm install -g web-ext
   ```

3. **Run the extension:**
   ```bash
   cd "c:\Users\moham\Desktop\Ai-sidebar"
   web-ext run
   ```

## Method 3: Quick Installation Script

Create a batch file to automate the packaging:

1. Save this as `package-extension.bat` in your extension folder:

```batch
@echo off
echo Packaging Glimpse Extension...
powershell -command "Compress-Archive -Path .\* -DestinationPath glimpse.zip -Force"
ren glimpse.zip glimpse.xpi
echo Extension packaged as glimpse.xpi
echo.
echo To install:
echo 1. Open Firefox
echo 2. Drag and drop the .xpi file into Firefox
echo 3. Click 'Add' when prompted
pause
```

## Troubleshooting

### If the extension doesn't work:
1. Check the Browser Console (F12 → Console) for errors
2. Verify all files are in the correct structure:
   ```
   Ai-sidebar/
   ├── manifest.json
   ├── background.js
   ├── icons/
   │   └── icon-96.svg
   └── sidebar/
       ├── sidebar.html
       ├── sidebar.js
       ├── sidebar.css
       └── retry.css
   ```

### If sidebar doesn't appear:
1. Right-click on the toolbar
2. Select "Customize"
3. Look for the Glimpse button and drag it to the toolbar
4. Or use Ctrl+Shift+Y to toggle sidebar

### Common Issues:
- **CSP Errors**: The manifest includes the necessary permissions for external APIs
- **Icon not showing**: Make sure `icons/icon-96.svg` exists
- **Sidebar not loading**: Check that `sidebar/sidebar.html` path is correct

## Recommended Approach

For daily use, I recommend **Method 2, Option B** (Firefox Developer Edition) as it:
- Allows unsigned extensions
- Provides better debugging tools
- Gives you the full extension experience
- Doesn't require submission to Mozilla

The extension will then be permanently installed and survive browser restarts!
