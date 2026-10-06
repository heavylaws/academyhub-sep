"use node";

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

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error(
          "GEMINI_API_KEY is not configured in the environment. Set GEMINI_API_KEY for Google AI Studio inference.",
        );
      }

      // Route AI analysis solely through the Gemini API using gemini-2.0-flash
      const ai = new GoogleGenAI({ apiKey });
      const imageParts = args.frames.map((frame) => ({
        inlineData: {
          mimeType: "image/jpeg",
          data: frame,
        },
      }));

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [...imageParts, userText],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
        },
      });

      raw = response.text ?? "{}";

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
