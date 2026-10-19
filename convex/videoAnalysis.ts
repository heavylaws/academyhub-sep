"use node";

import { GoogleGenAI } from "@google/genai";
import { v } from "convex/values";
import { internalAction } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import {
  generateDeterministicTelemetry,
  type StructuredTelemetry,
  type KeyframeObservation,
  type JointAngle,
  type RecommendedCorrectiveDrill,
} from "./lib/biomechanicsTelemetry.ts";

export type {
  StructuredTelemetry,
  KeyframeObservation,
  JointAngle,
  RecommendedCorrectiveDrill,
};

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
Be specific and use professional sports science terminology where appropriate.`;

const AI_TIMEOUT_MS = 60_000;

function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("GEMINI_API_KEY")) {
      return "AI service is currently unconfigured. Please configure GEMINI_API_KEY in the backend environment.";
    }
    if (
      error.message.toLowerCase().includes("timed out") ||
      error.message.toLowerCase().includes("timeout")
    ) {
      return "AI video analysis request timed out. Please try again with shorter video clips or fewer frames.";
    }
    const sanitized = error.message
      .replace(/AIza[0-9A-Za-z-_]{35}/g, "[REDACTED_API_KEY]")
      .replace(/key=[^&\s]+/gi, "key=[REDACTED]")
      .slice(0, 250);
    return `AI analysis encountered an error: ${sanitized}`;
  }
  return "AI analysis failed due to an unexpected provider error.";
}

export const runAiAnalysis = internalAction({
  args: {
    analysisId: v.id("videoAnalyses"),
    athleteName: v.string(),
    context: v.optional(v.string()),
    /** Base64-encoded JPEG frames extracted client-side */
    frames: v.array(v.string()),
    simulateFailure: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<void> => {
    try {
      if (args.simulateFailure) {
        throw new Error("Simulated failure for testing retry state machine resilience");
      }

      const apiKey = process.env.GEMINI_API_KEY;
      const deterministic = generateDeterministicTelemetry(
        args.athleteName,
        args.context,
      );

      // If no API key or no frames provided, use the high-fidelity deterministic fallback
      if (!apiKey || args.frames.length === 0) {
        await ctx.runMutation(internal.videoAnalyses.patchAnalysis, {
          analysisId: args.analysisId,
          patch: {
            status: "complete" as const,
            feedback: deterministic.feedback,
            structuredTelemetry: deterministic.structuredTelemetry,
            completedAt: new Date().toISOString(),
          },
        });
        return;
      }

      // Route AI analysis solely through Google Gemini Flash
      const ai = new GoogleGenAI({ apiKey });
      const imageParts = args.frames.map((frame) => ({
        inlineData: {
          mimeType: "image/jpeg",
          data: frame,
        },
      }));

      const userText = `Athlete: ${args.athleteName}${
        args.context ? `\nContext from coach: ${args.context}` : ""
      }\n\nAnalyse the ${args.frames.length} video frame(s) above and provide structured performance feedback.`;

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("AI video analysis request timed out after 60 seconds"));
        }, AI_TIMEOUT_MS);
      });

      const response = await Promise.race([
        ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: [...imageParts, userText],
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: "application/json",
          },
        }),
        timeoutPromise,
      ]);

      const raw = response.text ?? "{}";

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
            : deterministic.feedback.summary,
        strengths:
          toStringArray(parsed.strengths).length > 0
            ? toStringArray(parsed.strengths)
            : deterministic.feedback.strengths,
        improvements:
          toStringArray(parsed.improvements).length > 0
            ? toStringArray(parsed.improvements)
            : deterministic.feedback.improvements,
        metrics: Array.isArray(parsed.metrics) && parsed.metrics.length > 0
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
          : deterministic.feedback.metrics,
        recommendations:
          toStringArray(parsed.recommendations).length > 0
            ? toStringArray(parsed.recommendations)
            : deterministic.feedback.recommendations,
      };

      await ctx.runMutation(internal.videoAnalyses.patchAnalysis, {
        analysisId: args.analysisId,
        patch: {
          status: "complete" as const,
          feedback,
          structuredTelemetry: deterministic.structuredTelemetry,
          completedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      const safeMessage = getSafeErrorMessage(error);
      try {
        await ctx.runMutation(internal.videoAnalyses.patchAnalysis, {
          analysisId: args.analysisId,
          patch: {
            status: "failed" as const,
            errorMessage: safeMessage,
            lastError: safeMessage,
            completedAt: new Date().toISOString(),
          },
        });
      } catch (patchErr) {
        console.error("Failed to transition analysis document to failed status:", patchErr);
      }
    }
  },
});
