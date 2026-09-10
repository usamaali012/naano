#!/usr/bin/env node
/**
 * One-shot backfill: reconstruct .agent-logs/ entries for sessions that ran
 * BEFORE the capture hook was installed, straight from their Claude Code
 * transcripts.
 *
 *   node .claude/hooks/backfill.mjs <transcript.jsonl> [<transcript.jsonl> ...]
 *
 * Output matches the live capture format, with `backfilled: true` in the
 * frontmatter and a note recording that it was reconstructed after the fact.
 * Prompt/response text, timestamps and model come verbatim from the
 * transcript. The only thing removed from prompts is harness-injected
 * <ide_opened_file> / <ide_selection> / <ide_diagnostics> wrappers, which the
 * user never typed and which the live UserPromptSubmit hook also never sees.
 *
 * This is NOT wired to any hook. It is run by hand, once.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR =
  process.env.CLAUDE_PROJECT_DIR || path.resolve(HERE, "..", "..");
const LOG_DIR = path.join(PROJECT_DIR, ".agent-logs");
const SENTINEL = "<!-- capture.mjs: entries below are append-only -->";

function loadConfig() {
  const base = {
    author: "unknown",
    project: "naano-rebuild",
    tool: "claude-code",
    default_model: "claude-sonnet-5",
  };
  try {
    return {
      ...base,
      ...JSON.parse(
        fs.readFileSync(path.join(HERE, "capture.config.json"), "utf8")
      ),
    };
  } catch {
    return base;
  }
}
const cfg = loadConfig();

function utcNameStamp(d) {
  const p = (n) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}` +
    `_${p(d.getUTCHours())}-${p(d.getUTCMinutes())}-${p(d.getUTCSeconds())}`
  );
}

// Harness-injected wrappers removed — used ONLY to decide whether a user
// message actually carries a human prompt. Logged prompt text stays verbatim.
function promptCore(s) {
  return (s || "")
    .replace(/<ide_opened_file>[\s\S]*?<\/ide_opened_file>/g, "")
    .replace(/<ide_selection>[\s\S]*?<\/ide_selection>/g, "")
    .replace(/<ide_diagnostics>[\s\S]*?<\/ide_diagnostics>/g, "")
    .replace(/<task-notification>[\s\S]*?<\/task-notification>/g, "")
    .trim();
}

function carriesPrompt(rawText) {
  const core = promptCore(rawText);
  if (!core) return false;
  if (core.startsWith("<command-name>")) return false;
  if (core.startsWith("<local-command-stdout>")) return false;
  return true;
}

function userText(e) {
  const c = e.message && e.message.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return c
      .filter((b) => b && b.type === "text")
      .map((b) => b.text || "")
      .join("");
  }
  return "";
}

function readTranscript(p) {
  const out = [];
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      /* skip */
    }
  }
  return out;
}

function buildTurns(events) {
  const turns = [];
  let cur = null;
  let lastModel = cfg.default_model;
  for (const e of events) {
    if (e.type === "user" && !e.isSidechain && !e.isMeta) {
      const c = e.message && e.message.content;
      const isToolResult =
        Array.isArray(c) && c.some((b) => b && b.type === "tool_result");
      if (isToolResult) continue; // mid-turn, not a boundary
      const raw = userText(e);
      if (carriesPrompt(raw)) {
        if (cur) turns.push(cur);
        cur = {
          pText: raw.trim(), // verbatim, wrappers and all
          pTs: e.timestamp || null,
          rText: "",
          rModel: null,
          rTs: null,
        };
      } else {
        // interstitial: task-notification, slash-command plumbing, empty.
        // Not a prompt. Close the current turn so a trailing ack does not
        // get mis-attributed to it.
        if (cur) {
          turns.push(cur);
          cur = null;
        }
      }
      continue;
    }
    if (
      e.type === "assistant" &&
      !e.isSidechain &&
      e.message &&
      Array.isArray(e.message.content)
    ) {
      if (e.message.model) lastModel = e.message.model;
      if (!cur) continue;
      const t = e.message.content
        .filter((b) => b && b.type === "text")
        .map((b) => b.text || "")
        .join("\n\n")
        .trim();
      if (t) {
        cur.rText = t;
        cur.rModel = e.message.model || lastModel;
        cur.rTs = e.timestamp || null;
      }
    }
  }
  if (cur) turns.push(cur);
  return turns;
}

function render(sessionId, turns, sourceName) {
  const shortId = sessionId.slice(0, 8);
  const models = [...new Set(turns.map((t) => t.rModel).filter(Boolean))];
  if (!models.length) models.push(cfg.default_model);
  const first = turns[0].pTs || new Date().toISOString();
  const last = turns[turns.length - 1].pTs || first;
  const date = first.slice(0, 10);

  let out =
    `---\n` +
    `session_id: ${sessionId}\n` +
    `date: ${date}\n` +
    `author: ${cfg.author}\n` +
    `model: ${models.join(", ")}\n` +
    `tool: ${cfg.tool}\n` +
    `project: ${cfg.project}\n` +
    `total_exchanges: ${turns.length}\n` +
    `first_prompt_time: ${first}\n` +
    `last_prompt_time: ${last}\n` +
    `backfilled: true\n` +
    `backfill_source: ${sourceName}\n` +
    `backfill_generated_at: ${new Date().toISOString()}\n` +
    `---\n\n` +
    `# Session Log - ${date}\n\n` +
    `Session: \`${shortId}\` | Project: \`${cfg.project}\` | Author: \`${cfg.author}\`\n\n` +
    `> Reconstructed after the fact from the Claude Code transcript\n` +
    `> \`${sourceName}\`. The capture hook did not exist when this session ran.\n` +
    `> Prompt and response text, timestamps and model are verbatim from the\n` +
    `> transcript (IDE-injected <ide_opened_file> wrappers included, as the\n` +
    `> live hook keeps them too). Messages carrying no human prompt at all —\n` +
    `> bare IDE events, background <task-notification> pings — are not logged\n` +
    `> as exchanges.\n\n` +
    `${SENTINEL}\n\n`;

  turns.forEach((t, i) => {
    const n = i + 1;
    const fallbackModel = t.rModel || models[0];
    out +=
      `[LOG_ENTRY type=PROMPT num=${n} session=${shortId}]\n` +
      `timestamp: ${t.pTs}\n` +
      `model: ${fallbackModel}\n\n` +
      `${t.pText}\n\n`;
    out +=
      `[LOG_ENTRY type=RESPONSE num=${n} session=${shortId}]\n` +
      `timestamp: ${t.rTs || t.pTs}\n` +
      `model: ${fallbackModel}\n\n` +
      `${
        t.rText ||
        "(no assistant text response recorded in the transcript for this turn)"
      }\n\n`;
  });

  return out;
}

function main() {
  const inputs = process.argv.slice(2);
  if (!inputs.length) {
    process.stderr.write("usage: node backfill.mjs <transcript.jsonl> ...\n");
    process.exit(1);
  }
  fs.mkdirSync(LOG_DIR, { recursive: true });

  for (const inPath of inputs) {
    if (!fs.existsSync(inPath)) {
      process.stderr.write(`skip (missing): ${inPath}\n`);
      continue;
    }
    const events = readTranscript(inPath);
    const sessionId =
      events.find((e) => e && e.sessionId)?.sessionId ||
      path.basename(inPath).replace(/\.jsonl$/, "");
    const turns = buildTurns(events);
    if (!turns.length) {
      process.stderr.write(`skip (no real prompts): ${inPath}\n`);
      continue;
    }
    const sourceName = path.basename(inPath);
    const first = new Date(turns[0].pTs || Date.now());
    const outName = `${utcNameStamp(first)}_${sessionId}.md`;
    const outPath = path.join(LOG_DIR, outName);
    fs.writeFileSync(outPath, render(sessionId, turns, sourceName), "utf8");
    process.stdout.write(
      `wrote ${outName}  (${turns.length} exchange${turns.length === 1 ? "" : "s"})\n`
    );
  }
}

main();
