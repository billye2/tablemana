import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

/**
 * AI menu ingestion (PLAN.md §5.1): menu photo/PDF → structured menu, plus a
 * tasteful pick from the curated templates. Calls the Claude API directly via
 * the official SDK with structured outputs, so the response is guaranteed to
 * match the schema.
 */

export const ingestSchema = z.object({
  cuisine: z.string(),
  description: z.string(),
  theme: z.enum(["classic", "bistro", "bold"]),
  accentHex: z.string().regex(/^#[0-9a-f]{6}$/i),
  sections: z
    .array(
      z.object({
        name: z.string(),
        items: z
          .array(
            z.object({
              name: z.string(),
              description: z.string().optional(),
              priceCents: z.number().int(),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

export type IngestedMenu = z.infer<typeof ingestSchema>;

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["cuisine", "description", "theme", "accentHex", "sections"],
  properties: {
    cuisine: {
      type: "string",
      description: "Short cuisine label, e.g. 'Thai', 'California-Mediterranean'",
    },
    description: {
      type: "string",
      description:
        "One warm, appetizing sentence for the website hero, written in the restaurant's voice. No hype words like 'best'.",
    },
    theme: {
      type: "string",
      enum: ["classic", "bistro", "bold"],
      description:
        "classic: warm/traditional/family spots. bistro: upscale, wine bars, steakhouses, date-night. bold: fast-casual, tacos, burgers, bright youthful spots.",
    },
    accentHex: {
      type: "string",
      description:
        "Six-digit lowercase hex color like #b45309, matching the cuisine's character; must read as text on white and stay tasteful — avoid neon.",
    },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "items"],
        properties: {
          name: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "priceCents"],
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                priceCents: {
                  type: "integer",
                  description:
                    "Price in cents, e.g. $12.50 → 1250. If a price is unreadable, best guess from context.",
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function fileBlock(file: {
  data: Uint8Array;
  mediaType: string;
}): Anthropic.ContentBlockParam {
  const data = Buffer.from(file.data).toString("base64");
  if (file.mediaType === "application/pdf") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data },
    };
  }
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: file.mediaType as ImageMediaType,
      data,
    },
  };
}

export async function ingestMenu(
  file: { data: Uint8Array; mediaType: string },
  restaurantName: string,
): Promise<IngestedMenu> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 16000,
    output_config: {
      format: { type: "json_schema", schema: OUTPUT_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `This is the menu of the restaurant "${restaurantName}". Extract the full menu faithfully — every section and item you can read, with exact prices. Then choose the site template and accent color that best fit this restaurant's character.`,
          },
          fileBlock(file),
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Model declined to process this menu");
  }
  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  return ingestSchema.parse(JSON.parse(text));
}
