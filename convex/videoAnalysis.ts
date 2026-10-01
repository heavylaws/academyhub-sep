"use node";

import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { v } from "convex/values";
import { internalAction } from "./_generated/server.js";
import { internal } from "./_generated/api.js";

declare const process: { env: Record<string, string | undefined> };

const SYSTEM_PROMPT = `You are an expert sports performance analyst and biomechanics coach.
You are given a series of video frames from an athlete's training session.
Analyse the athlete's movement, technique, and performance based on the frames provided.
Return a JSON object matching EXACTLY this structure — no extra fields, no markdown:

{
  "summary": "2-3 sentence overall assessment",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["area 1", "area 2"],
  "metrics": [
    { "label": "Metric name", "value": "observed value or description", "note": "optional brief note" }
  ],
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2"]
}

Include 2-4 strengths, 2-4 improvement areas, 2-5 metrics, and 2-4 recommendations.
Be specific and use professional sports science terminology where appropriate.
If the frames are low quality or the movement is unclear, still provide your best assessment based on what is visible.`;

export const runAiAnalysis = internalAction({
  args: {
    analysisId: v.id("videoAnalyses"),
    athleteName: v.string(),
    context: v.optional(v.string()),
    /** Base64-encoded JPEG frames extracted client-side */
    frames: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    try {
      let raw = "{}";

      const userText = `Athlete: ${args.athleteName}${
        args.context ? `\nContext from coach: ${args.context}` : ""
      }\n\nAnalyse the ${args.frames.length} video frame(s) above and provide structured performance feedback.`;

      if (process.env.GEMINI_API_KEY) {
        // Preferred: Google Gemini via @google/genai (Google AI Studio Free Tier friendly)
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const primaryModel = process.env.GEMINI_VISION_MODEL || "gemini-3.5-flash-lite";

        const imageParts = args.frames.map((frame) => ({
          inlineData: {
            mimeType: "image/jpeg",
            data: frame,
          },
        }));

        let response;
        try {
          response = await ai.models.generateContent({
            model: primaryModel,
            contents: [...imageParts, userText],
            config: {
              systemInstruction: SYSTEM_PROMPT,
              responseMimeType: "application/json",
            },
          });
        } catch (genError) {
          // If the primary model hits high demand (503), fall back to ultra-reliable gemini-3.5-flash-lite
          if (primaryModel !== "gemini-3.5-flash-lite") {
            response = await ai.models.generateContent({
              model: "gemini-3.5-flash-lite",
              contents: [...imageParts, userText],
              config: {
                systemInstruction: SYSTEM_PROMPT,
                responseMimeType: "application/json",
              },
            });
          } else {
            throw genError;
          }
        }

        raw = response.text ?? "{}";
      } else if (process.env.OPENAI_API_KEY) {
        // Fallback: OpenAI
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          baseURL: process.env.OPENAI_BASE_URL || undefined,
        });

        const imageContent: OpenAI.ChatCompletionContentPart[] = args.frames.map(
          (frame) => ({
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${frame}`,
              detail: "low",
            },
          }),
        );

        const response = await openai.chat.completions.create({
          model: process.env.OPENAI_VISION_MODEL || "gpt-4o",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [...imageContent, { type: "text", text: userText }],
            },
          ],
          response_format: { type: "json_object" },
        });

        raw = response.choices[0]?.message?.content ?? "{}";
      } else {
        throw new Error(
          "Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured in the environment. Set GEMINI_API_KEY for free-tier Google AI Studio inference.",
        );
      }

      type FeedbackShape = {
        summary?: unknown;
        strengths?: unknown;
        improvements?: unknown;
        metrics?: unknown;
        recommendations?: unknown;
      };
      const parsed = JSON.parse(raw) as FeedbackShape;

      const toStringArray = (v: unknown): string[] =>
        Array.isArray(v)
          ? v.filter((s): s is string => typeof s === "string")
          : [];

      const feedback = {
        summary:
          typeof parsed.summary === "string"
            ? parsed.summary
            : "Analysis complete.",
        strengths: toStringArray(parsed.strengths),
        improvements: toStringArray(parsed.improvements),
        metrics: Array.isArray(parsed.metrics)
          ? parsed.metrics
              .filter(
                (m): m is { label: string; value: string; note?: string } =>
                  typeof (m as Record<string, unknown>).label === "string" &&
                  typeof (m as Record<string, unknown>).value === "string",
              )
              .map((m) => ({
                label: m.label,
                value: m.value,
                note: typeof m.note === "string" ? m.note : undefined,
              }))
          : [],
        recommendations: toStringArray(parsed.recommendations),
      };

      await ctx.runMutation(internal.videoAnalyses.patchAnalysis, {
        analysisId: args.analysisId,
        patch: {
          status: "complete" as const,
          feedback,
          completedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error during AI analysis";
      await ctx.runMutation(internal.videoAnalyses.patchAnalysis, {
        analysisId: args.analysisId,
        patch: {
          status: "failed" as const,
          errorMessage: message,
        },
      });
    }
  },
});
