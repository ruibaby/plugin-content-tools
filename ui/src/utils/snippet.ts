export function getSnippetTextPreview(html: string, maxLength = 120) {
  const element = document.createElement('div');
  element.innerHTML = html;
  const text = (element.textContent || '').replace(/\s+/g, ' ').trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}…`;
}
