import { config } from "../../../package.json";
import type { OpenAIClient } from "../../utils/llm";

interface ImageTestResult {
  text: string;
  petalColor: string;
}

export async function testImageConnection(
  client: OpenAIClient,
): Promise<boolean> {
  // Use a resource request: getBinaryContentsAsync only accepts filesystem paths.
  // Packed XPI resources can return status 0 via a jar channel.
  const response = await Zotero.HTTP.request(
    "GET",
    `chrome://${config.addonRef}/content/icons/jasminum-vision-test.png`,
    { responseType: "arraybuffer", successCodes: [0, 200] },
  );
  const data = new Uint8Array(response.response);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (
    data.length < signature.length ||
    signature.some((byte, i) => data[i] !== byte)
  ) {
    throw new Error("Unable to read the bundled PNG test image");
  }
  const result = await client.createJSONCompletion<ImageTestResult>({
    systemPrompt:
      "Inspect the supplied image. Report only what you can actually see. If you cannot view the image, return empty strings.",
    prompt:
      "Transcribe all printed text in the image into text, including Chinese characters, in reading order. In petalColor, give the main color of the flower petals as a single English color word.",
    images: [{ data, mimeType: "image/png", detail: "low" }],
    timeout: 120000,
    responseFormat: {
      name: "image_connection_test",
      schema: {
        type: "object",
        properties: {
          text: { type: "string" },
          petalColor: { type: "string" },
        },
        required: ["text", "petalColor"],
        additionalProperties: false,
      },
    },
  });
  // Expected answers stay local, never in the request or JSON schema.
  return (
    result.text.trim().replace(/\s+/g, "").toUpperCase() ===
      "JASMINUM4729茉莉花" && result.petalColor.trim().toLowerCase() === "white"
  );
}
