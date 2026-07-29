export class MetadataSourceSelectionError extends Error {
  constructor() {
    super("At least one metadata source must be selected.");
    this.name = "MetadataSourceSelectionError";
  }
}

export function updateMetadataSources(
  currentSources: string[],
  value: string,
  checked: boolean,
): string[] {
  const nextSources = checked
    ? currentSources.includes(value)
      ? currentSources
      : [...currentSources, value]
    : currentSources.filter((source) => source !== value);

  if (nextSources.length === 0) {
    throw new MetadataSourceSelectionError();
  }

  return nextSources;
}
