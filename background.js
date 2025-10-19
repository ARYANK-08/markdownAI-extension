chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "extractMarkdown",
    title: "Extract Markdown",
    contexts: ["selection", "page"]
  });

  chrome.contextMenus.create({
    id: "copyMarkdown",
    parentId: "extractMarkdown",
    title: "Copy Markdown",
    contexts: ["selection", "page"]
  });


  chrome.contextMenus.create({
    id: "openChatGPT",
    parentId: "extractMarkdown",
    title: "Open in ChatGPT",
    contexts: ["selection", "page"]
  });

  chrome.contextMenus.create({
    id: "downloadMD",
    parentId: "extractMarkdown",
    title: "Download .md",
    contexts: ["selection", "page"]
  });

    chrome.contextMenus.create({
        id: "previewMarkdown",
        parentId: "extractMarkdown",
        title: "Preview Markdown",
        contexts: ["page", "selection"]
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    // First try to send message to existing content script
    await chrome.tabs.sendMessage(tab.id, {
      action: info.menuItemId,
      selectedText: info.selectionText || null
    });
  } catch (error) {
    console.log('Content script not ready, injecting...');
    
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      await chrome.tabs.sendMessage(tab.id, {
        action: info.menuItemId,
        selectedText: info.selectionText || null
      });
    } catch (injectionError) {
      console.error('Failed to inject and execute:', injectionError);
    }
  }
});