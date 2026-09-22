import {
  OpenAIClient,
  type PDFCreator,
  type PDFMetadataEvidence,
  type PDFOutlineEntry,
  type RecognizedPDFMetadata,
  type SupportedPDFItemType,
} from "./llm";
import { renderFirstPDFPagesAsPNG } from "./pdfImage";

type ZoteroPDFItemType = Exclude<SupportedPDFItemType, "unknown">;
type ZoteroMetadataField = Exclude<
  keyof RecognizedPDFMetadata,
  "itemType" | "title" | "creators"
>;

type ZoteroCreator =
  | {
      creatorType: string;
      firstName: string;
      lastName: string;
    }
  | {
      creatorType: string;
      name: string;
    };

type ZoteroItemMetadata = {
  itemType: ZoteroPDFItemType;
  title: string;
  creators?: ZoteroCreator[];
} & Partial<Record<ZoteroMetadataField, string>>;

interface PDFRecognitionResult {
  metadata: ZoteroItemMetadata;
  outline: PDFOutlineEntry[];
  evidence: PDFMetadataEvidence[];
}

function normalizeCreator(
  creator: PDFCreator,
  itemTypeID: number,
): ZoteroCreator | null {
  const creatorType = creator.creatorType.trim();
  const creatorTypeID = Zotero.CreatorTypes.getID(creatorType);
  if (
    !creatorTypeID ||
    !Zotero.CreatorTypes.isValidForItemType(creatorTypeID, itemTypeID)
  ) {
    return null;
  }

  const name = creator.name?.trim();
  if (name) {
    return { creatorType, name };
  }
  const firstName = creator.firstName?.trim() ?? "";
  const lastName = creator.lastName?.trim() ?? "";
  if (!firstName && !lastName) {
    return null;
  }
  return { creatorType, firstName, lastName };
}

function toZoteroMetadata(
  metadata: RecognizedPDFMetadata,
): ZoteroItemMetadata | null {
  if (
    ![
      "journalArticle",
      "conferencePaper",
      "preprint",
      "newspaperArticle",
      "thesis",
    ].includes(metadata.itemType)
  ) {
    return null;
  }
  const title = metadata.title?.trim();
  if (!title) {
    return null;
  }
  const itemTypeID = Zotero.ItemTypes.getID(metadata.itemType);
  if (!itemTypeID) {
    return null;
  }

  const fields: Partial<Record<ZoteroMetadataField, string>> = {};
  for (const [field, rawValue] of Object.entries(metadata)) {
    if (
      field === "itemType" ||
      field === "title" ||
      field === "creators" ||
      typeof rawValue !== "string"
    ) {
      continue;
    }
    const value = rawValue.trim();
    const fieldID = Zotero.ItemFields.getFieldIDFromTypeAndBase(
      itemTypeID,
      field,
    );
    if (value && fieldID) {
      fields[Zotero.ItemFields.getName(fieldID) as ZoteroMetadataField] = value;
    }
  }

  const creators = metadata.creators
    .map((creator) => normalizeCreator(creator, itemTypeID))
    .filter((creator): creator is ZoteroCreator => creator !== null);

  return {
    itemType: metadata.itemType as ZoteroPDFItemType,
    title,
    ...(creators.length ? { creators } : {}),
    ...fields,
  };
}

async function recognizePDFAttachment(
  client: OpenAIClient,
  attachmentID: number,
): Promise<PDFRecognitionResult | null> {
  const images = await renderFirstPDFPagesAsPNG(attachmentID, "auto");
  const recognition = await client.recognizePDFPages(images);
  const metadata = toZoteroMetadata(recognition.metadata);
  if (!metadata) {
    return null;
  }
  return {
    metadata,
    outline: recognition.outline,
    evidence: recognition.evidence,
  };
}

export { recognizePDFAttachment, toZoteroMetadata };
export type {
  PDFRecognitionResult,
  ZoteroCreator,
  ZoteroItemMetadata,
  ZoteroPDFItemType,
};
