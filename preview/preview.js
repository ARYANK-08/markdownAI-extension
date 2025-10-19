const editor = document.getElementById('markdown-editor');
const preview = document.getElementById('markdown-preview');
const copyBtn = document.getElementById('copy-btn');

// Simple markdown parser
function parseMarkdown(md) {
  let html = md
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Code blocks (must be before inline code)
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Headers
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Blockquotes
    .replace(/^&gt; (.+)$/gim, '<blockquote>$1</blockquote>')
    // Lists
    .replace(/^\- (.+)$/gim, '<li>$1</li>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  // Wrap lists
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  return '<p>' + html + '</p>';
}

// Update preview on input
editor.addEventListener('input', updatePreview);

function updatePreview() {
  const markdownText = editor.value;
  if (markdownText.trim()) {
    preview.innerHTML = parseMarkdown(markdownText);
  } else {
    preview.innerHTML = '<p style="color: #71717a; font-style: italic;">Preview will appear here...</p>';
  }
}

// Get markdown from chrome storage
chrome.storage.local.get(['tempMarkdown'], (result) => {
  if (result.tempMarkdown) {
    editor.value = result.tempMarkdown;
    updatePreview();
    // Clear the temporary storage after loading
    chrome.storage.local.remove(['tempMarkdown']);
  }
});

// Copy markdown to clipboard
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(editor.value);
    copyBtn.textContent = 'Copied!';
    copyBtn.style.background = '#22c55e';
    
    setTimeout(() => {
      copyBtn.textContent = 'Copy Markdown';
      copyBtn.style.background = '#3b82f6';
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
});