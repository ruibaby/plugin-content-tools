import {
  ContentConverter,
  HtmlToMarkdownConverter,
  MarkdownToHtmlConverter,
} from './contentConverter';
import ConverterManager from './converterManager';

export class ConverterFactory {
  static getConverter(fromType: string, toType: string): ContentConverter {
    const manager = ConverterManager.getInstance();

    if (!manager.hasConverter(fromType, toType)) {
      throw new Error(`Unsupported conversion from ${fromType} to ${toType}`);
    }

    if (fromType === 'markdown' && toType === 'html') {
      return new MarkdownToHtmlConverter();
    } else if (fromType === 'html' && toType === 'markdown') {
      return new HtmlToMarkdownConverter();
    }

    throw new Error('Converter not implemented');
  }
}
