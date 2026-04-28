import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { requireWebUser } from "../../../../../lib/webAuth";
import { getTeamRecentMessages } from "../../../../../lib/appData";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  loadEnvConfig(process.cwd());
  const { userId } = await requireWebUser();

  const { slug } = await ctx.params;
  const teamSlug = decodeURIComponent(slug);

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GEMINI_API_KEY in env." },
      { status: 500 }
    );
  }

  const msgs = await getTeamRecentMessages(userId, teamSlug, 80);
  const transcript = msgs
    .slice()
    .reverse()
    .map((m) => {
      const who = m.userId ? `user:${m.userId}` : "user:unknown";
      const scope = m.scope ? ` scope:${m.scope}` : "";
      const ts = m.timestamp ? ` ts:${m.timestamp}` : "";
      const content = (m.content ?? "").replace(/\s+/g, " ").trim();
      return `${who}${scope}${ts}: ${content}`.slice(0, 600);
    })
    .join("\n");

  const prompt = [
    "You are an assistant summarizing a Discord project team channel.",
    "Write a crisp, high-signal summary for a dashboard.",
    "",
    "Return markdown with these sections, only if you have evidence:",
    "- Status (2-4 bullets)",
    "- Decisions (bullets)",
    "- Action items (with owner if inferable) (bullets)",
    "- Risks / blockers (bullets)",
    "- Open questions (bullets)",
    "",
    "Be honest when the transcript lacks info. Do not invent facts.",
    "",
    `Team: ${teamSlug}`,
    "",
    "Transcript (newest last):",
    transcript || "(no messages)"
  ].join("\n");

  const ai = new GoogleGenAI({ apiKey });
  const resp = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  });

  const text =
    resp.text ??
    resp.candidates?.[0]?.content?.parts?.map((p) => ("text" in p ? p.text : "")).join("") ??
    "";

  return NextResponse.json({
    teamSlug,
    model,
    generatedAt: new Date().toISOString(),
    summary: text.trim()
  });
}

