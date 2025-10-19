
if (window.markdownExtensionLoaded) {
  // Already loaded, exit silently
} else {
  window.markdownExtensionLoaded = true;

  // =================== CONSTANTS ===================
  const IGNORED_TAGS = [
    'script', 'noscript', 'style', 'svg', 'button', 
    'input', 'label', 'nav', 'form', 'audio', 'video', 
    'footer', 'header'
  ];

  const CONTENT_TAGS = [
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
    'li', 'blockquote', 'pre', 'code', 'article', 
    'section', 'main'
  ];

  const IGNORED_CLASSES = [
    'navigation', 'nav', 'menu', 'footer'
  ];

  const URLS = {
    CHATGPT_BASE: 'https://chat.openai.com/',
    MAX_URL_LENGTH: 2000
  };

  const MAIN_CONTENT_SELECTORS = [
    'main', 
    'article', 
    '[role="main"]', 
    '.content', 
    '#content'
  ];

  // =================== UTILITY FUNCTIONS ===================
  
  function shouldIgnoreNode(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    
    const tag = node.tagName.toLowerCase();
    const style = window.getComputedStyle(node);
    const role = node.getAttribute('role');
    
    return (
      IGNORED_TAGS.includes(tag) ||
      style?.display === 'none' ||
      style?.visibility === 'hidden' ||
      role === 'navigation' ||
      IGNORED_CLASSES.some(cls => node.classList.contains(cls))
    );
  }

  function isContentNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent.trim().length > 0;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    
    const tag = node.tagName.toLowerCase();
    return CONTENT_TAGS.includes(tag);
  }

  function getFormattedText(node) {
    let codeContent = node.textContent;
    const newLineIndex = codeContent.indexOf('\n');
    if (newLineIndex === -1 || newLineIndex > 100) {
      codeContent = node.innerText;
    }
    return codeContent.trim();
  }

  function sanitizeMarkdown(content) {
    return content
      .replace(/\n{4,}/g, '\n\n\n')           // Remove excessive newlines
      .replace(/\t/g, '  ')                   // Remove tabs
      .replace(/\s+$/gm, '')                  // Remove trailing spaces
      .replace(/\[\]\([^)]+\)/g, '')          // Remove inline links without text
      .replace(/  +/g, ' ')                   // Clean up multiple spaces
      .replace(/^\s*[\*\-_]+\s*$/gm, '')      // Remove lines with only markdown symbols
      .trim();
  }

  function copyToClipboard(text) {
    return navigator.clipboard.writeText(text);
  }

  function extractDomainName(url) {
    try {
      const hostname = new URL(url).hostname;
      const domainParts = hostname.split('.');
      return domainParts.length > 1 ? domainParts[domainParts.length - 2] : hostname;
    } catch (error) {
      return 'webpage';
    }
  }

  function createDownloadLink(content, filename) {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    return { element: a, url };
  }

  // =================== MARKDOWN CONVERSION ===================

  function formatLink(node, children) {
    const href = node.getAttribute('href');
    if (!href || href === '#' || !children) return '';
    
    let fullUrl = href;
    if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
      try {
        fullUrl = new URL(href, window.location.href).href;
      } catch (error) {
        fullUrl = href;
      }
    }
    
    return `[${children}](${fullUrl})`;
  }

  function formatImage(node) {
    const alt = node.getAttribute('alt') || '';
    const src = node.getAttribute('src') || '';
    
    if (!src) return '';
    
    let fullSrc = src;
    if (src.startsWith('/') || src.startsWith('./') || src.startsWith('../')) {
      try {
        fullSrc = new URL(src, window.location.href).href;
      } catch (error) {
        fullSrc = src;
      }
    }
    
    return `![${alt}](${fullSrc})`;
  }

  function formatMarkdownByTag(tag, node, children) {
    const formatters = {
      h1: () => `\n\n# ${node.textContent.trim()}\n\n`,
      h2: () => `\n\n## ${node.textContent.trim()}\n\n`,
      h3: () => `\n\n### ${node.textContent.trim()}\n\n`,
      h4: () => `\n\n#### ${node.textContent.trim()}\n\n`,
      h5: () => `\n\n##### ${node.textContent.trim()}\n\n`,
      h6: () => `\n\n###### ${node.textContent.trim()}\n\n`,
      p: () => children ? `\n${children}\n` : '',
      article: () => children ? `\n${children}\n` : '',
      section: () => children ? `\n${children}\n` : '',
      main: () => children ? `\n${children}\n` : '',
      div: () => children ? `${children}\n` : '',
      strong: () => children ? `**${children}**` : '',
      b: () => children ? `**${children}**` : '',
      i: () => children ? `*${children}*` : '',
      em: () => children ? `*${children}*` : '',
      a: () => formatLink(node, children),
      blockquote: () => `\n> ${node.textContent.trim()}\n\n`,
      ul: () => children ? `\n${children}\n` : '',
      ol: () => children ? `\n${children}\n` : '',
      li: () => children ? `- ${children}\n` : '',
      code: () => children ? `\`${children}\`` : '',
      pre: () => `\n\`\`\`\n${getFormattedText(node)}\n\`\`\`\n\n`,
      br: () => '\n',
      hr: () => '\n---\n\n',
      img: () => formatImage(node),
      table: () => children ? `\n${children}\n` : '',
      tr: () => children ? `${children}\n` : '',
      td: () => children ? `| ${children} ` : '| ',
      th: () => children ? `| **${children}** ` : '| '
    };

    return formatters[tag] ? formatters[tag]() : children;
  }

  function convertNode(node, depth = 0) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      return text.length > 0 ? text + ' ' : '';
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }
    
    if (shouldIgnoreNode(node)) return '';

    const tag = node.tagName.toLowerCase();
    const children = Array.from(node.childNodes)
      .map(child => convertNode(child, depth + 1))
      .join('')
      .trim();

    if (!children && !isContentNode(node)) return '';

    return formatMarkdownByTag(tag, node, children);
  }

  function handleSelectedText(selectedText) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = document.createElement('div');
      container.appendChild(range.cloneContents());
      return convertNode(container);
    }
    return selectedText || '';
  }

  function handleFullPage() {
    const mainContent = document.querySelector(MAIN_CONTENT_SELECTORS.join(', ')) || document.body;
    return convertNode(mainContent);
  }

  function convertToMarkdown(selectedText = null) {
    let markdown = '';
    
    try {
      if (selectedText) {
        markdown = handleSelectedText(selectedText);
      } else {
        markdown = handleFullPage();
      }
      
      return sanitizeMarkdown(markdown);
    } catch (error) {
      console.error('Error converting to markdown:', error);
      return selectedText || 'Error converting content to markdown';
    }
  }

  // =================== ACTION HANDLERS ===================

  let isDownloading = false;

  async function handleCopyMarkdown(selectedText, sendResponse) {
    try {
      const markdown = convertToMarkdown(selectedText);
      await copyToClipboard(markdown);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Copy failed:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  function handlePreviewMarkdown(selectedText, sendResponse) {
    try {
      const markdown = convertToMarkdown(selectedText);
      chrome.storage.local.set({ tempMarkdown: markdown }, () => {
        window.open(chrome.runtime.getURL('preview/preview.html'), '_blank');
        sendResponse({ success: true });
      });
    } catch (error) {
      console.error('Preview failed:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  function handleDownloadMD(selectedText, sendResponse) {
    if (isDownloading) {
      sendResponse({ success: false, error: "Download already in progress" });
      return;
    }
    
    isDownloading = true;
    
    try {
      const markdown = convertToMarkdown(selectedText);
      const domainName = extractDomainName(window.location.href);
      const filename = `${domainName}.md`;
      const { element: downloadLink, url } = createDownloadLink(markdown, filename);
      
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
            
      setTimeout(() => {
        URL.revokeObjectURL(url);
        isDownloading = false;
      }, 100);
      
      sendResponse({ success: true });
    } catch (error) {
      console.error('Download failed:', error);
      isDownloading = false;
      sendResponse({ success: false, error: error.message });
    }
  }

  async function handleOpenChatGPT(selectedText, sendResponse) {
    try {
      const markdown = convertToMarkdown(selectedText);
      const promptText = `Please analyze this markdown content:\n\n${markdown}`;
      
      if (promptText.length < URLS.MAX_URL_LENGTH) {
        const encodedMarkdown = encodeURIComponent(promptText);
        window.open(`${URLS.CHATGPT_BASE}?q=${encodedMarkdown}`, '_blank');
      } else {
        await copyToClipboard(promptText);
        const message = 'Content copied to clipboard - Ctrl+V to paste';
        window.open(`${URLS.CHATGPT_BASE}?q=${message}`, '_blank');
      }
      
      sendResponse({ success: true });
    } catch (error) {
      console.error('ChatGPT open failed:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // =================== MESSAGE LISTENER ===================

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const { action, selectedText } = request;
    
    const actionHandlers = {
      copyMarkdown: () => handleCopyMarkdown(selectedText, sendResponse),
      previewMarkdown: () => handlePreviewMarkdown(selectedText, sendResponse),
      downloadMD: () => handleDownloadMD(selectedText, sendResponse),
      openChatGPT: () => handleOpenChatGPT(selectedText, sendResponse)
    };

    const handler = actionHandlers[action];
    if (handler) {
      handler();
      return true; 
    } else {
      sendResponse({ success: false, error: 'Unknown action' });
    }
  });

}