export function processHTMLLinks(content: string): string {
  const htmlLinkRegex = /(src|href)=["'](?!http:\/\/|https:\/\/|mailto:|tel:)([^"']+)["']/gi;
  return content.replace(htmlLinkRegex, (_, attr, url) => {
    return `${attr}="${getAbsoluteUrl(url)}"`;
  });
}

export function processMarkdownLinks(content: string): string {
  const markdownLinkRegex = /(!?\[.*?\]\()(?!http:\/\/|https:\/\/|mailto:|tel:)([^)]+)(\))/g;
  return content.replace(markdownLinkRegex, (_, prefix, url, suffix) => {
    return `${prefix}${getAbsoluteUrl(url)}${suffix}`;
  });
}

export function getAbsoluteUrl(url: string): string {
  if (url.startsWith('/')) {
    return `${location.origin}${url}`;
  } else {
    return `${location.origin}/${url}`;
  }
}
