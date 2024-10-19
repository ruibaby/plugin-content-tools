export type ConversionOption = {
  fromType: string;
  toType: string;
  label: string;
};

class ConverterManager {
  private static instance: ConverterManager;
  private conversionMap: Map<string, ConversionOption[]>;

  private constructor() {
    this.conversionMap = new Map();
    this.initializeConverters();
  }

  public static getInstance(): ConverterManager {
    if (!ConverterManager.instance) {
      ConverterManager.instance = new ConverterManager();
    }
    return ConverterManager.instance;
  }

  private initializeConverters(): void {
    this.addConverter("html", "markdown", "转换为 Markdown");
    this.addConverter("markdown", "html", "转换为富文本");
  }

  private addConverter(fromType: string, toType: string, label: string): void {
    const option: ConversionOption = { fromType, toType, label };

    if (!this.conversionMap.has(fromType)) {
      this.conversionMap.set(fromType, []);
    }
    this.conversionMap.get(fromType)!.push(option);
  }

  public getConverterOptions(rawType: string): ConversionOption[] {
    return this.conversionMap.get(rawType.toLowerCase()) || [];
  }

  public hasConverter(fromType: string, toType: string): boolean {
    const options = this.getConverterOptions(fromType);
    return options.some((option) => option.toType === toType);
  }
}

export default ConverterManager;
