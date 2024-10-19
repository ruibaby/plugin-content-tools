import type { ContentWrapper, Post } from "@halo-dev/api-client";
import MarkdownIt from "markdown-it";
import MarkdownItAnchor from "markdown-it-anchor";
import TurndownService from "turndown";
import { mergeMatter, readMatter } from "./matter";

export function convertPostContentToMarkdown(
  post: Post,
  content: ContentWrapper,
  needsFrontMatter?: boolean,
): string {
  if (content.rawType === "markdown") {
    return content.raw || "";
  }

  const turndownService = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
  });
  const rawMarkdown = turndownService.turndown(content.raw || "");

  if (!needsFrontMatter) {
    return rawMarkdown;
  }

  const data = {
    title: post.spec.title,
    slug: post.spec.slug,
    excerpt: post.status?.excerpt,
    cover: post.spec.cover,
    halo: {
      name: post.metadata.name,
      publish: post.spec.publish,
    },
  };

  return mergeMatter(rawMarkdown, data);
}

export function convertPostContentToHTML(content: ContentWrapper): string {
  if (content.rawType === "html") {
    return content.raw || "";
  }

  // Remove matter data
  const markdown = readMatter(content.raw || "").content;

  const markdownIt = new MarkdownIt({
    html: true,
    xhtmlOut: true,
    breaks: true,
    linkify: true,
    typographer: true,
  });

  markdownIt.use(MarkdownItAnchor);

  return markdownIt.render(markdown);
}
