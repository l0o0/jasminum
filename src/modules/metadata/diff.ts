import type {
  ZoteroCreator,
  ZoteroItemMetadata,
} from "../../utils/pdfMetadata";

export type FieldValue = string | ZoteroCreator[];
export interface MetadataSnapshot {
  itemType: string;
  fields: Record<string, FieldValue>;
}
export interface FieldChange {
  field: string;
  before: FieldValue;
  after: FieldValue;
  selected: boolean;
}
// Explicit allowlist: never accept library structure or user annotations from a provider.
export const metadataFields = [
  "title",
  "abstractNote",
  "date",
  "language",
  "DOI",
  "url",
  "publicationTitle",
  "volume",
  "issue",
  "pages",
  "ISSN",
  "conferenceName",
  "proceedingsTitle",
  "place",
  "publisher",
  "ISBN",
  "repository",
  "archiveID",
  "university",
  "thesisType",
  "edition",
  "section",
  "creators",
] as const;

export function equalValue(a: FieldValue, b: FieldValue): boolean {
  if (typeof a === "string" || typeof b === "string") return a === b;
  const normalize = (list: ZoteroCreator[]) =>
    list.map((c) => [
      c.creatorType,
      "name" in c ? c.name : c.firstName,
      "name" in c ? "" : c.lastName,
      "name" in c,
    ]);
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

export function buildChanges(
  snapshot: MetadataSnapshot,
  metadata: ZoteroItemMetadata,
): FieldChange[] {
  if (snapshot.itemType !== metadata.itemType)
    throw new Error("metadata-update-type-conflict");
  const changes: FieldChange[] = [];
  for (const field of metadataFields) {
    const value = metadata[field];
    if (value == null || value.length === 0 || !(field in snapshot.fields))
      continue;
    let after: FieldValue = typeof value === "string" ? value.trim() : value;
    if (!after.length) continue;
    const before = snapshot.fields[field];
    // Replace only roles present in the candidate, preserving editors and other roles.
    if (field === "creators" && Array.isArray(after) && Array.isArray(before)) {
      const roles = new Set(after.map((c) => c.creatorType));
      after = [...after, ...before.filter((c) => !roles.has(c.creatorType))];
    }
    if (!equalValue(before, after))
      changes.push({ field, before, after, selected: before.length === 0 });
  }
  return changes;
}
