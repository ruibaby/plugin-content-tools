function createAndSelectElement(content: string, isHtml: boolean): HTMLElement {
  const element = document.createElement(isHtml ? 'div' : 'textarea');
  if (isHtml) {
    element.innerHTML = content;
    element.style.position = 'absolute';
    element.style.left = '-9999px';
  } else {
    (element as HTMLTextAreaElement).value = content;
    element.style.top = '0';
    element.style.left = '0';
    element.style.position = 'fixed';
  }
  document.body.appendChild(element);
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
  return element;
}

async function copyUsingExecCommand(content: string, isHtml: boolean): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const element = createAndSelectElement(content, isHtml);
    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (error) {
      console.error('Failed to copy text using document.execCommand', error);
    }
    document.body.removeChild(element);
    if (window.getSelection()) {
      window.getSelection()?.removeAllRanges();
    }
    resolve(success);
  });
}

export const copyHtmlAsRichText = (function () {
  if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
    return async function (htmlString: string): Promise<boolean> {
      try {
        const blob = new Blob([htmlString], { type: 'text/html' });
        const clipboardItem = new ClipboardItem({ 'text/html': blob });
        await navigator.clipboard.write([clipboardItem]);
        return true;
      } catch (error) {
        console.error('Failed to copy text using Clipboard API', error);
        return false;
      }
    };
  } else {
    return (htmlString: string) => copyUsingExecCommand(htmlString, true);
  }
})();

export const copyText = (function () {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return async function (text: string): Promise<boolean> {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        console.error('Failed to copy text using Clipboard API', error);
        return false;
      }
    };
  } else {
    return (text: string) => copyUsingExecCommand(text, false);
  }
})();
