#!/usr/bin/env node
/**
 * 8x assignment — agent prompt/response capture hook.
 *
 * Wired to two Claude Code lifecycle events in .claude/settings.json:
 *   - UserPromptSubmit  ->  node capture.mjs prompt
 *   - Stop              ->  node capture.mjs stop
 *
 * Both fire automatically. Nothing here has to be remembered or run by hand.
 *
 * What it records, per turn, into .agent-logs/<YYYY-MM-DD_HH-MM-SS_session>.md:
 *   - the prompt, verbatim and in full
 *   - the FINAL assistant response for that turn, in full
 *   - a UTC timestamp for each
 *   - the model name for each
 *
 * What it deliberately does NOT record: thinking, tool calls, tool results,
 * file reads/diffs, or any intermediate assistant text. Only the prompt and
 * the last response of the turn.
 *
 * Log entries are only ever APPENDED. The frontmatter block (counts / times)
 * is the one thing regenerated on each run, because the format requires it to
 * stay accurate. Entry bodies are never edited, reordered, or deleted.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODE = process.argv[2] === "stop" ? "stop" : "prompt";

/* ------------------------------------------------------------------ helpers */

function readStdinSync() {
  const chunks = [];
  const buf = Buffer.alloc(1 << 16);
  try {
    while (true) {
      let n;
      try {
        n = fs.readSync(0, buf, 0, buf.length, null);
      } catch (e) {
        if (e.code === "EAGAIN") continue;
        break; // EOF or not readable
      }
      if (!n) break;
      chunks.push(Buffer.from(buf.subarray(0, n)));
    }
  } catch {
    /* ignore */
  }
  return Buffer.concat(chunks).toString("utf8");
}

function utcStampForName(d) {
  const p = (n) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}` +
    `_${p(d.getUTCHours())}-${p(d.getUTCMinutes())}-${p(d.getUTCSeconds())}`
  );
}

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
      ...JSON.parse(fs.readFileSync(path.join(HERE, "capture.config.json"), "utf8")),
    };
  } catch {
    return base;
  }
}

function readTranscript(p) {
  if (!p || !fs.existsSync(p)) return [];
  const out = [];
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      /* skip partial / non-JSON lines */
    }
  }
  return out;
}

function isRealUserPrompt(e) {
  if (!e || e.type !== "user" || e.isSidechain || e.isMeta) return false;
  const c = e.message && e.message.content;
  let text = "";
  if (typeof c === "string") text = c;
  else if (Array.isArray(c)) {
    if (c.some((b) => b && b.type === "tool_result")) return false;
    text = c.filter((b) => b && b.type === "text").map((b) => b.text || "").join("");
  } else return false;
  const t = text.trim();
  if (!t) return false;
  if (t.startsWith("<command-name>")) return false; // slash-command plumbing
  if (t.startsWith("<local-command-stdout>")) return false;
  return true;
}

function userPromptText(e) {
  const c = e.message.content;
  if (typeof c === "string") return c;
  return c.filter((b) => b && b.type === "text").map((b) => b.text || "").join("");
}

// Last real user prompt in the transcript + its timestamp.
function lastPromptFromTranscript(events) {
  for (let i = events.length - 1; i >= 0; i--) {
    if (isRealUserPrompt(events[i])) {
      return { text: userPromptText(events[i]), ts: events[i].timestamp || null };
    }
  }
  return null;
}

// Final assistant text of the current (last) turn: the text blocks of the LAST
// assistant message that has any text, after the last real user prompt.
// Thinking and tool_use blocks are ignored.
function finalResponseFromTranscript(events, fallbackModel) {
  let start = 0;
  for (let i = events.length - 1; i >= 0; i--) {
    if (isRealUserPrompt(events[i])) {
      start = i;
      break;
    }
  }
  let text = "";
  let model = fallbackModel;
  let ts = null;
  for (let i = start; i < events.length; i++) {
    const e = events[i];
    if (
      e.type === "assistant" &&
      !e.isSidechain &&
      e.message &&
      Array.isArray(e.message.content)
    ) {
      const t = e.message.content
        .filter((b) => b && b.type === "text")
        .map((b) => b.text || "")
        .join("\n\n")
        .trim();
      if (t) {
        text = t;
        model = e.message.model || model;
        ts = e.timestamp || ts;
      }
    }
  }
  return { text, model, ts };
}

function latestModelFromTranscript(events, fallback) {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type === "assistant" && e.message && e.message.model) return e.message.model;
  }
  return fallback;
}

function countMatches(s, re) {
  return (s.match(re) || []).length;
}

function lastEntryType(body) {
  const m = [...body.matchAll(/\[LOG_ENTRY type=(PROMPT|RESPONSE) /g)];
  return m.length ? m[m.length - 1][1] : null;
}

function block(type, num, shortId, iso, model, content) {
  return (
    `[LOG_ENTRY type=${type} num=${num} session=${shortId}]\n` +
    `timestamp: ${iso}\n` +
    `model: ${model}\n\n` +
    `${content}\n\n`
  );
}

function rebuild(filePath, cfg, shortId, appended) {
  // read existing entry body (everything from the first LOG_ENTRY onward)
  let existing = "";
  if (fs.existsSync(filePath)) {
    const cur = fs.readFileSync(filePath, "utf8");
    const idx = cur.indexOf("[LOG_ENTRY ");
    existing = idx >= 0 ? cur.slice(idx) : "";
  }
  let bodyEntries = existing.replace(/\s*$/, "");
  if (bodyEntries) bodyEntries += "\n\n";
  bodyEntries += appended;

  const promptTimes = [
    ...bodyEntries.matchAll(/\[LOG_ENTRY type=PROMPT [^\]]*\]\ntimestamp: (\S+)/g),
  ].map((m) => m[1]);
  const models = [...bodyEntries.matchAll(/\nmodel: (\S+)/g)].map((m) => m[1]);
  const uniqModels = [...new Set(models)];
  const totalExchanges = countMatches(bodyEntries, /\[LOG_ENTRY type=PROMPT /g);
  const firstT = promptTimes[0] || new Date().toISOString();
  const lastT = promptTimes[promptTimes.length - 1] || firstT;
  const dateStr = firstT.slice(0, 10);

  const fm =
    `---\n` +
    `session_id: ${SESSION_ID}\n` +
    `date: ${dateStr}\n` +
    `author: ${cfg.author}\n` +
    `model: ${uniqModels.join(", ") || cfg.default_model}\n` +
    `tool: ${cfg.tool}\n` +
    `project: ${cfg.project}\n` +
    `total_exchanges: ${totalExchanges}\n` +
    `first_prompt_time: ${firstT}\n` +
    `last_prompt_time: ${lastT}\n` +
    `---\n\n` +
    `# Session Log - ${dateStr}\n\n` +
    `Session: \`${shortId}\` | Project: \`${cfg.project}\` | Author: \`${cfg.author}\`\n\n` +
    `---\n\n`;

  fs.writeFileSync(filePath, fm + bodyEntries, "utf8");
}

/* --------------------------------------------------------------------- main */

let SESSION_ID = "unknown-session";

function main() {
  const input = (() => {
    try {
      return JSON.parse(readStdinSync());
    } catch {
      return {};
    }
  })();

  const cfg = loadConfig();
  const projectDir =
    process.env.CLAUDE_PROJECT_DIR || input.cwd || path.resolve(HERE, "..", "..");
  const logDir = path.join(projectDir, ".agent-logs");
  fs.mkdirSync(logDir, { recursive: true });

  SESSION_ID = input.session_id || "unknown-session";
  const shortId = SESSION_ID.slice(0, 8);

  const events = readTranscript(input.transcript_path);
  const now = new Date();
  const nowIso = now.toISOString();

  // locate this session's log file, or name a fresh one
  const found = fs
    .readdirSync(logDir)
    .find((f) => f.endsWith(`_${SESSION_ID}.md`));
  const filePath = found
    ? path.join(logDir, found)
    : path.join(logDir, `${utcStampForName(now)}_${SESSION_ID}.md`);

  // current entry body
  let body = "";
  if (fs.existsSync(filePath)) {
    const cur = fs.readFileSync(filePath, "utf8");
    const idx = cur.indexOf("[LOG_ENTRY ");
    body = idx >= 0 ? cur.slice(idx) : "";
  }
  const nPrompt = countMatches(body, /\[LOG_ENTRY type=PROMPT /g);
  const nResp = countMatches(body, /\[LOG_ENTRY type=RESPONSE /g);

  if (MODE === "prompt") {
    const promptText =
      (typeof input.prompt === "string" && input.prompt) ||
      (typeof input.user_input === "string" && input.user_input) ||
      (typeof input.user_prompt === "string" && input.user_prompt) ||
      "";
    if (!promptText.trim()) return; // nothing to record
    const model = latestModelFromTranscript(events, cfg.default_model);
    const appended = block("PROMPT", nPrompt + 1, shortId, nowIso, model, promptText);
    rebuild(filePath, cfg, shortId, appended);
    return;
  }

  // MODE === "stop"
  // guard against Stop firing again with no new prompt in between
  if (lastEntryType(body) === "RESPONSE" && nPrompt === nResp) return;

  let pieces = "";
  let promptCount = nPrompt;

  // self-heal: if the turn's prompt was never captured (hook enabled mid-turn,
  // or UserPromptSubmit missed), reconstruct it from the transcript first.
  if (nPrompt <= nResp) {
    const p = lastPromptFromTranscript(events);
    if (p) {
      promptCount += 1;
      pieces += block(
        "PROMPT",
        promptCount,
        shortId,
        p.ts || nowIso,
        latestModelFromTranscript(events, cfg.default_model),
        p.text
      );
    }
  }

  let respText = "";
  let respModel = cfg.default_model;
  let respTs = nowIso;

  if (typeof input.last_assistant_message === "string" && input.last_assistant_message.trim()) {
    respText = input.last_assistant_message;
    const f = finalResponseFromTranscript(events, cfg.default_model);
    respModel = f.model || latestModelFromTranscript(events, cfg.default_model);
    respTs = f.ts || nowIso;
  } else {
    const f = finalResponseFromTranscript(events, cfg.default_model);
    respText = f.text;
    respModel = f.model;
    respTs = f.ts || nowIso;
  }

  if (!respText.trim()) {
    respText =
      "(no final text response captured for this turn — it ended on a tool call or was interrupted)";
  }

  pieces += block("RESPONSE", nResp + 1, shortId, respTs, respModel, respText);
  rebuild(filePath, cfg, shortId, pieces);
}

try {
  main();
} catch (e) {
  try {
    process.stderr.write(`[capture.mjs] ${e && e.stack ? e.stack : e}\n`);
  } catch {}
}
process.exit(0);
