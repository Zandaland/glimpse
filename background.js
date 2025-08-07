// Background script for AI Sidebar
let sidebarState = {
    isOpen: false
};

// Handle messages from sidebar
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);
    
    switch (message.action) {
        case 'getSidebarState':
            console.log('Returning sidebar state:', sidebarState.isOpen);
            sendResponse({ isOpen: sidebarState.isOpen });
            break;
            
        case 'sidebarOpened':
            console.log('📂 Sidebar opened - updating state from', sidebarState.isOpen, 'to true');
            sidebarState.isOpen = true;
            sendResponse({ success: true });
            break;
            
        case 'sidebarClosed':
            console.log('📁 Sidebar closed - updating state from', sidebarState.isOpen, 'to false');
            sidebarState.isOpen = false;
            sendResponse({ success: true });
            break;
            
        case 'setSidebarState':
            sidebarState.isOpen = message.isOpen;
            sendResponse({ success: true });
            break;
    }
    
    return true; // Keep message channel open for async response
});

// Handle browser action (extension icon) clicks to toggle sidebar
if (browser.browserAction && browser.browserAction.onClicked) {
    browser.browserAction.onClicked.addListener(async (tab) => {
        console.log('🖱️ Browser action clicked - toggling sidebar');
        
        try {
            // Toggle the sidebar using the sidebarAction API
            if (browser.sidebarAction) {
                if (sidebarState.isOpen) {
                    // Close the sidebar
                    await browser.sidebarAction.close();
                    sidebarState.isOpen = false;
                    console.log('✅ Sidebar closed via browser action');
                } else {
                    // Open the sidebar
                    await browser.sidebarAction.open();
                    sidebarState.isOpen = true;
                    console.log('✅ Sidebar opened via browser action');
                }
            } else {
                console.log('❌ sidebarAction API not available');
            }
        } catch (error) {
            console.log('❌ Error toggling sidebar:', error.message);
            
            // Fallback: try to use keyboard shortcut simulation
            try {
                if (tab && tab.id) {
                    // Try injecting a keyboard shortcut as fallback
                    browser.tabs.executeScript(tab.id, {
                        code: `
                            // Dispatch F1 key event to toggle sidebar
                            document.dispatchEvent(new KeyboardEvent('keydown', {
                                key: 'F1',
                                code: 'F1',
                                keyCode: 112,
                                bubbles: true,
                                cancelable: true
                            }));
                        `
                    });
                    console.log('🔄 Fallback: F1 key simulation attempted');
                }
            } catch (fallbackError) {
                console.log('❌ Fallback method also failed:', fallbackError.message);
            }
        }
    });
} else if (chrome.action && chrome.action.onClicked) {
    // Chrome/Chromium browsers use chrome.action instead of browserAction
    chrome.action.onClicked.addListener(async (tab) => {
        console.log('🖱️ Chrome action clicked - toggling sidebar');
        
        try {
            if (chrome.sidePanel) {
                // Chrome uses sidePanel API
                if (sidebarState.isOpen) {
                    await chrome.sidePanel.setOptions({ enabled: false });
                    sidebarState.isOpen = false;
                    console.log('✅ Side panel closed via Chrome action');
                } else {
                    await chrome.sidePanel.setOptions({ 
                        enabled: true,
                        path: 'sidebar/sidebar.html'
                    });
                    sidebarState.isOpen = true;
                    console.log('✅ Side panel opened via Chrome action');
                }
            }
        } catch (error) {
            console.log('❌ Error with Chrome side panel:', error.message);
        }
    });
}

// Check initial sidebar state when extension starts
browser.runtime.onStartup.addListener(() => {
    sidebarState.isOpen = false;
    console.log('Extension startup, sidebar state reset');
});

browser.runtime.onInstalled.addListener(() => {
    sidebarState.isOpen = false;
    console.log('Extension installed/updated, sidebar state reset');
});
