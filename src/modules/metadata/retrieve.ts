import { getConfiguredLLMClient } from "../../utils/llm";
import {
  recognizePDFAttachment,
  type PDFRecognitionResult,
} from "../../utils/pdfMetadata";

export interface MetadataCandidate extends PDFRecognitionResult {
  source: { id: "AI"; attachmentID: number; fetchedAt: string };
}

export async function retrieveFromPDF(
  attachmentID: number,
  parentID: number,
): Promise<MetadataCandidate> {
  const attachment = Zotero.Items.get(attachmentID);
  if (
    !attachment ||
    attachment.deleted ||
    attachment.parentID !== parentID ||
    !attachment.isPDFAttachment()
  )
    throw new Error("metadata-update-no-pdf");
  const result = await recognizePDFAttachment(
    getConfiguredLLMClient(),
    attachmentID,
  );
  if (!result) throw new Error("metadata-update-no-result");
  return {
    ...result,
    source: { id: "AI", attachmentID, fetchedAt: new Date().toISOString() },
  };
}
