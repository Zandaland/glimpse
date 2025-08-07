# Firefox Add-on Publishing Guide

## Pre-Publishing Checklist

### 1. Code Review & Cleanup
- ✅ Remove debug code and console.log statements
- ✅ Ensure all file paths are correct
- ✅ Test extension thoroughly in Firefox
- ✅ Remove temporary/test files
- ✅ Add proper error handling

### 2. Legal & Privacy Requirements
- ✅ Create Privacy Policy (required for extensions that collect data)
- ✅ Ensure compliance with Mozilla's Add-on Policies
- ✅ No copyrighted content without permission
- ✅ Transparent about data usage (API keys, chat history)

### 3. Manifest Updates for AMO
- ✅ Add proper description and developer info
- ✅ Ensure version follows semantic versioning (1.0.0)
- ✅ Add homepage_url and update_url if needed
- ✅ Review permissions - only request what you need

## Publishing Steps

### Step 1: Create Mozilla Developer Account
1. Go to [Mozilla Add-on Developer Hub](https://addons.mozilla.org/developers/)
2. Sign in with Firefox Account (create one if needed)
3. Complete developer profile

### Step 2: Prepare Extension Package
```bash
# Use our packaging script
PowerShell -ExecutionPolicy Bypass -c "Compress-Archive -Path manifest.json,background.js,sidebar.html,sidebar.css,sidebar.js,retry.css,icon-48.svg,icon-96.svg -DestinationPath ai-chat-sidebar-release.zip -Force"
```

### Step 3: Submit for Review
1. Go to [Submit a New Add-on](https://addons.mozilla.org/developers/addon/submit/)
2. Upload your ZIP file
3. Choose "On this site" (AMO) for distribution
4. Fill out all required information:
   - Name: "Glimpse"
   - Summary: Brief description
   - Description: Detailed features
   - Categories: Productivity, Developer Tools
   - Tags: AI, chat, sidebar, productivity
   - Screenshots (required)
   - Privacy Policy (required)

### Step 4: Review Process
- **Automated Review**: 10-15 minutes for basic checks
- **Human Review**: 1-10 days for full review
- **Listed Status**: Can take 2-4 weeks for full listing

### Step 5: Post-Approval
- Extension becomes available on AMO
- Users can install directly from Firefox
- You can push updates through the same process

## Requirements for AMO

### Required Files
- ✅ `manifest.json` - Properly configured
- ✅ Source code files
- ✅ Icons (48x48, 96x96 minimum)

### Required Information
- ✅ Privacy Policy
- ✅ Screenshots (1280x800 recommended)
- ✅ Detailed description
- ✅ Version notes

### Content Guidelines
- ✅ No malicious code
- ✅ No data collection without disclosure
- ✅ Proper permission usage
- ✅ User-friendly functionality

## Common Rejection Reasons
1. **Missing Privacy Policy**: Required even if no data collected
2. **Excessive Permissions**: Only request what you actually use
3. **Poor Code Quality**: Minified/obfuscated code issues
4. **Missing Screenshots**: Need visual examples
5. **Vague Descriptions**: Must clearly explain functionality

## Tips for Approval
- Test extension in clean Firefox profile
- Provide clear, honest descriptions
- Include helpful screenshots
- Respond quickly to reviewer feedback
- Keep first version simple and stable

## Post-Launch
- Monitor reviews and ratings
- Respond to user feedback
- Regular updates for bug fixes
- Build user community
