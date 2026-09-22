import {
  PDF_METADATA_FIELD_DESCRIPTIONS,
  PDF_FILENAME_SYSTEM_PROMPT,
  PDF_PAGE_RECOGNITION_PROMPT,
  PDF_PAGE_RECOGNITION_SYSTEM_PROMPT,
  createPDFFilenamePrompt,
} from "./prompts";
import { getPref } from "./prefs";
import { getString } from "./locale";

function getConfiguredLLMClient(
  options: OpenAIClientOptions = {
    baseURL: getPref("llmBaseURL"),
    apiKey: getPref("llmApiKey"),
    model: getPref("llmModel"),
  },
): OpenAIClient {
  const baseURL = options.baseURL.trim().replace(/\/+$/, "");
  const apiKey = options.apiKey.trim();
  const model = options.model.trim();
  if (!baseURL || !apiKey || !model) {
    throw new Error(getString("ai-config-required"));
  }
  let url: URL;
  try {
    url = new URL(baseURL);
  } catch {
    throw new Error(getString("ai-config-invalid-url"));
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(getString("ai-config-invalid-url"));
  }
  return new OpenAIClient({ baseURL, apiKey, model });
}

type JSONSchema = Record<string, unknown>;

// Validate the schema subset used by our filename and PDF recognition requests.
function validateJSON(value: unknown, schema: JSONSchema, path = "$"): void {
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  const valid = types.some((type) =>
    type === "null"
      ? value === null
      : type === "array"
        ? Array.isArray(value)
        : type === "object"
          ? value !== null && typeof value === "object" && !Array.isArray(value)
          : type === "integer"
            ? Number.isInteger(value)
            : typeof value === type,
  );
  if (
    !valid ||
    (Array.isArray(schema.enum) && !schema.enum.includes(value)) ||
    (typeof value === "number" &&
      typeof schema.minimum === "number" &&
      value < schema.minimum)
  ) {
    throw new Error(`LLM returned invalid JSON field: ${path}`);
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      validateJSON(entry, schema.items as JSONSchema, `${path}[${index}]`),
    );
  } else if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    const properties = schema.properties as Record<string, JSONSchema>;
    for (const key of (schema.required as string[]) ?? []) {
      if (!Object.hasOwn(object, key))
        throw new Error(`LLM JSON is missing field: ${path}.${key}`);
    }
    for (const [key, entry] of Object.entries(object)) {
      if (Object.hasOwn(properties, key))
        validateJSON(entry, properties[key], `${path}.${key}`);
      else if (schema.additionalProperties === false)
        throw new Error(`LLM JSON contains unexpected field: ${path}.${key}`);
    }
  }
}

type ImageMimeType = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

type ImageDetail = "auto" | "low" | "high";

type LLMImage =
  | {
      data: Uint8Array | ArrayBuffer;
      mimeType: ImageMimeType;
      detail?: ImageDetail;
    }
  | {
      url: string;
      detail?: ImageDetail;
    };

interface OpenAIClientOptions {
  baseURL: string;
  apiKey: string;
  model: string;
}

interface StructuredResponseFormat {
  name: string;
  schema: JSONSchema;
}

interface JSONCompletionOptions {
  timeout?: number;
  systemPrompt: string;
  prompt: string;
  images?: LLMImage[];
  responseFormat: StructuredResponseFormat;
}

interface PDFFilenameResponse {
  title: string;
  author: string;
}

type SupportedPDFItemType =
  | "journalArticle"
  | "conferencePaper"
  | "preprint"
  | "newspaperArticle"
  | "thesis"
  | "unknown";

interface PDFCreator {
  creatorType: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
}

interface RecognizedPDFMetadata {
  itemType: SupportedPDFItemType;
  title: string | null;
  creators: PDFCreator[];
  abstractNote: string | null;
  date: string | null;
  language: string | null;
  DOI: string | null;
  url: string | null;
  publicationTitle: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  ISSN: string | null;
  conferenceName: string | null;
  proceedingsTitle: string | null;
  place: string | null;
  publisher: string | null;
  ISBN: string | null;
  repository: string | null;
  archiveID: string | null;
  university: string | null;
  thesisType: string | null;
  edition: string | null;
  section: string | null;
}

interface PDFOutlineEntry {
  number: string | null;
  title: string;
  level: number;
  page: number | null;
}

interface PDFMetadataEvidence {
  field: string;
  page: number;
  text: string;
}

interface PDFPageRecognitionResult {
  metadata: RecognizedPDFMetadata;
  outline: PDFOutlineEntry[];
  evidence: PDFMetadataEvidence[];
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

const PDF_FILENAME_SCHEMA: JSONSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    author: { type: "string" },
  },
  required: ["title", "author"],
  additionalProperties: false,
};

const nullableString = { type: ["string", "null"] };

const PDF_PAGE_RECOGNITION_SCHEMA: JSONSchema = {
  type: "object",
  properties: {
    metadata: {
      type: "object",
      properties: {
        itemType: {
          type: "string",
          enum: [
            "journalArticle",
            "conferencePaper",
            "preprint",
            "newspaperArticle",
            "thesis",
            "unknown",
          ],
        },
        language: {
          ...nullableString,
          description: PDF_METADATA_FIELD_DESCRIPTIONS.language,
        },
        title: {
          ...nullableString,
          description: PDF_METADATA_FIELD_DESCRIPTIONS.title,
        },
        creators: {
          type: "array",
          description: PDF_METADATA_FIELD_DESCRIPTIONS.creators,
          items: {
            type: "object",
            properties: {
              creatorType: { type: "string" },
              firstName: nullableString,
              lastName: nullableString,
              name: nullableString,
            },
            required: ["creatorType", "firstName", "lastName", "name"],
            additionalProperties: false,
          },
        },
        abstractNote: {
          ...nullableString,
          description: PDF_METADATA_FIELD_DESCRIPTIONS.abstractNote,
        },
        date: nullableString,
        DOI: nullableString,
        url: nullableString,
        publicationTitle: {
          ...nullableString,
          description: PDF_METADATA_FIELD_DESCRIPTIONS.publicationTitle,
        },
        volume: nullableString,
        issue: nullableString,
        pages: nullableString,
        ISSN: nullableString,
        conferenceName: nullableString,
        proceedingsTitle: nullableString,
        place: nullableString,
        publisher: nullableString,
        ISBN: nullableString,
        repository: nullableString,
        archiveID: nullableString,
        university: nullableString,
        thesisType: nullableString,
        edition: nullableString,
        section: nullableString,
      },
      required: [
        "itemType",
        "title",
        "creators",
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
      ],
      additionalProperties: false,
    },
    outline: {
      type: "array",
      items: {
        type: "object",
        properties: {
          number: nullableString,
          title: { type: "string" },
          level: { type: "integer", minimum: 1 },
          page: { type: ["integer", "null"], minimum: 1 },
        },
        required: ["number", "title", "level", "page"],
        additionalProperties: false,
      },
    },
    evidence: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: { type: "string" },
          page: { type: "integer", minimum: 1 },
          text: { type: "string" },
        },
        required: ["field", "page", "text"],
        additionalProperties: false,
      },
    },
  },
  required: ["metadata", "outline", "evidence"],
  additionalProperties: false,
};

function bytesToDataURL(
  data: Uint8Array | ArrayBuffer,
  mimeType: ImageMimeType,
): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    );
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function imageToContentPart(image: LLMImage) {
  return {
    type: "image_url",
    image_url: {
      url:
        "url" in image ? image.url : bytesToDataURL(image.data, image.mimeType),
      detail: image.detail ?? "auto",
    },
  };
}

function parseJSONContent<T>(content: string): T {
  const normalized = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(normalized) as T;
  } catch (error) {
    throw new Error("LLM returned invalid JSON", { cause: error });
  }
}

class OpenAIClient {
  private readonly baseURL: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(options: OpenAIClientOptions) {
    this.baseURL = options.baseURL.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.model = options.model;
  }

  async createJSONCompletion<T>(options: JSONCompletionOptions): Promise<T> {
    const systemPrompt = `${options.systemPrompt}\nReturn only a JSON object conforming to this JSON Schema. Do not invent missing information.\n${JSON.stringify(options.responseFormat.schema)}`;
    const userContent = options.images?.length
      ? [
          { type: "text", text: options.prompt },
          ...options.images.map(imageToContentPart),
        ]
      : options.prompt;
    const response = await Zotero.HTTP.request(
      "POST",
      `${this.baseURL}/chat/completions`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          response_format: { type: "json_object" },
        }),
        responseType: "text",
        timeout: options.timeout ?? 120000,
      },
    );
    const responseBody = JSON.parse(
      response.responseText,
    ) as ChatCompletionResponse;
    const content = responseBody.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("LLM response does not contain message content");
    }
    const result = parseJSONContent<T>(content);
    validateJSON(result, options.responseFormat.schema);
    return result;
  }

  async parsePDFFilename(filename: string): Promise<SearchOption | null> {
    const result = await this.createJSONCompletion<PDFFilenameResponse>({
      systemPrompt: PDF_FILENAME_SYSTEM_PROMPT,
      prompt: createPDFFilenamePrompt(filename),
      responseFormat: {
        name: "pdf_search_info",
        schema: PDF_FILENAME_SCHEMA,
      },
    });
    const title = result.title.trim();
    if (!title) {
      return null;
    }
    return {
      title,
      author: result.author.trim(),
    };
  }

  recognizePDFPages(images: LLMImage[]): Promise<PDFPageRecognitionResult> {
    return this.createJSONCompletion<PDFPageRecognitionResult>({
      systemPrompt: PDF_PAGE_RECOGNITION_SYSTEM_PROMPT,
      prompt: PDF_PAGE_RECOGNITION_PROMPT,
      images: images.map((image) => ({
        ...image,
        detail: image.detail ?? "high",
      })),
      responseFormat: {
        name: "pdf_page_recognition",
        schema: PDF_PAGE_RECOGNITION_SCHEMA,
      },
    });
  }
}

export {
  getConfiguredLLMClient,
  OpenAIClient,
  PDF_FILENAME_SCHEMA,
  PDF_PAGE_RECOGNITION_SCHEMA,
  bytesToDataURL,
};

export type {
  ImageDetail,
  ImageMimeType,
  JSONCompletionOptions,
  JSONSchema,
  LLMImage,
  OpenAIClientOptions,
  PDFCreator,
  PDFMetadataEvidence,
  PDFOutlineEntry,
  PDFPageRecognitionResult,
  PDFFilenameResponse,
  RecognizedPDFMetadata,
  StructuredResponseFormat,
  SupportedPDFItemType,
};
