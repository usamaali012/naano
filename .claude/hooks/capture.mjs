#!/usr/bin/env node
/**
 * 8x assignment — automatic agent prompt/response capture.
 *
 * Wired to two Claude Code lifecycle events in .claude/settings.json:
 *   UserPromptSubmit -> node capture.mjs prompt
 *   Stop             -> node capture.mjs stop
 * Both fire on their own. Nothing here is ever run by hand.
 *
 * Per turn it records, into
 *   .agent-logs/<YYYY-MM-DD_HH-MM-SS>_<session-id>.md
 * exactly:
 *   - the prompt, verbatim and in full
 *   - the FINAL assistant response of that turn, in full
 *   - a UTC timestamp and the model name for each
 * and nothing else: no thinking, no tool calls, no tool results, no
 * intermediate assistant text.
 *
 * Design notes
 * ------------
 * - Entries are APPEND-ONLY. They are never edited, reordered or deleted.
 * - Counts / timestamps / model list live in a sidecar state file under
 *   .claude/hooks/.state/ (gitignored), NOT by re-parsing the .md. This
 *   matters because a prompt can itself contain text that looks like a log
 *   entry (this assignment's own format example does), and re-parsing the
 *   log would miscount.
 * - The frontmatter block is regenerated from state on every write, because
 *   the format requires total_exchanges / *_time to stay accurate. The
 *   opening "---" is byte 0 and its closing "---" is the next column-0
 *   "---" line, so pasted "---" inside an entry can't confuse the split.
 * - The entries section is delimited by a sentinel comment; everything after
 *   the first sentinel occurrence is preserved verbatim on rewrite.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODE = process.argv[2] === "stop" ? "stop" : "prompt";
const SENTINEL = "<!-- capture.mjs: entries below are append-only -->";

/* --------------------------------------------------------------- utilities */

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
        break;
      }
      if (!n) break;
      chunks.push(Buffer.from(buf.subarray(0, n)));
    }
  } catch {
    /* ignore */
  }
  return Buffer.concat(chunks).toString("utf8");
}

function utcNameStamp(d) {
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
    const c = JSON.parse(
      fs.readFileSync(path.join(HERE, "capture.config.json"), "utf8")
    );
    return { ...base, ...c };
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
      /* skip partial lines */
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
    text = c
      .filter((b) => b && b.type === "text")
      .map((b) => b.text || "")
      .join("");
  } else return false;
  const t = text.trim();
  if (!t) return false;
  if (t.startsWith("<command-name>")) return false;
  if (t.startsWith("<local-command-stdout>")) return false;
  return true;
}

function userPromptText(e) {
  const c = e.message.content;
  if (typeof c === "string") return c;
  return c
    .filter((b) => b && b.type === "text")
    .map((b) => b.text || "")
    .join("");
}

function lastPromptFromTranscript(events) {
  for (let i = events.length - 1; i >= 0; i--) {
    if (isRealUserPrompt(events[i])) {
      return { text: userPromptText(events[i]), ts: events[i].timestamp || null };
    }
  }
  return null;
}

// Final assistant text of the current turn: the text blocks of the LAST
// assistant message that has any text, at/after the last real user prompt.
// thinking / tool_use blocks are ignored.
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
    if (e.type === "assistant" && e.message && e.message.model) {
      return e.message.model;
    }
  }
  return fallback;
}

/* --------------------------------------------------------------- rendering */

function frontmatter(state, cfg) {
  const models = [...new Set(state.models)].filter(Boolean);
  const first = state.first_prompt_time || new Date().toISOString();
  const last = state.last_prompt_time || first;
  const date = first.slice(0, 10);
  const shortId = state.session_id.slice(0, 8);
  return (
    `---\n` +
    `session_id: ${state.session_id}\n` +
    `date: ${date}\n` +
    `author: ${cfg.author}\n` +
    `model: ${models.join(", ") || cfg.default_model}\n` +
    `tool: ${cfg.tool}\n` +
    `project: ${cfg.project}\n` +
    `total_exchanges: ${state.prompts}\n` +
    `first_prompt_time: ${first}\n` +
    `last_prompt_time: ${last}\n` +
    `---\n\n` +
    `# Session Log - ${date}\n\n` +
    `Session: \`${shortId}\` | Project: \`${cfg.project}\` | Author: \`${cfg.author}\`\n\n` +
    `${SENTINEL}\n\n`
  );
}

function entryBlock(type, num, shortId, iso, model, content) {
  return (
    `[LOG_ENTRY type=${type} num=${num} session=${shortId}]\n` +
    `timestamp: ${iso}\n` +
    `model: ${model}\n\n` +
    `${content}\n\n`
  );
}

function writeLog(filePath, state, cfg, newEntries) {
  let tail = "";
  if (fs.existsSync(filePath)) {
    const cur = fs.readFileSync(filePath, "utf8");
    const idx = cur.indexOf(SENTINEL);
    if (idx >= 0) {
      tail = cur.slice(idx + SENTINEL.length).replace(/^\s+/, "");
    }
  }
  tail = tail.replace(/\s*$/, "");
  const body = (tail ? tail + "\n\n" : "") + newEntries.replace(/\s*$/, "") + "\n";
  fs.writeFileSync(filePath, frontmatter(state, cfg) + body, "utf8");
}

/* ------------------------------------------------------------------- state */

function stateDir() {
  return path.join(HERE, ".state");
}

function loadState(sessionId) {
  const f = path.join(stateDir(), `${sessionId}.json`);
  try {
    return JSON.parse(fs.readFileSync(f, "utf8"));
  } catch {
    return {
      session_id: sessionId,
      prompts: 0,
      responses: 0,
      models: [],
      first_prompt_time: null,
      last_prompt_time: null,
      name_stamp: null,
    };
  }
}

// Recover counts from an existing .md if the sidecar state was lost. Only
// column-0 entry markers count as real (the format example in a pasted prompt
// is indented, so it is ignored).
function reseedFromLog(state, filePath) {
  if (state.prompts || state.responses || !fs.existsSync(filePath)) return state;
  const cur = fs.readFileSync(filePath, "utf8");
  const idx = cur.indexOf(SENTINEL);
  const body = idx >= 0 ? cur.slice(idx + SENTINEL.length) : "";
  state.prompts = (body.match(/^\[LOG_ENTRY type=PROMPT /gm) || []).length;
  state.responses = (body.match(/^\[LOG_ENTRY type=RESPONSE /gm) || []).length;
  return state;
}

function addModel(state, model) {
  if (model && !state.models.includes(model)) state.models.push(model);
}

function saveState(state) {
  fs.mkdirSync(stateDir(), { recursive: true });
  fs.writeFileSync(
    path.join(stateDir(), `${state.session_id}.json`),
    JSON.stringify(state, null, 2),
    "utf8"
  );
}

/* -------------------------------------------------------------------- main */

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

  const sessionId = input.session_id || "unknown-session";
  const shortId = sessionId.slice(0, 8);
  const events = readTranscript(input.transcript_path);
  const now = new Date();
  const nowIso = now.toISOString();

  let state = loadState(sessionId);

  // resolve the log file path (stable for the life of the session)
  const found = fs
    .readdirSync(logDir)
    .find((f) => f.endsWith(`_${sessionId}.md`));
  if (found) {
    state.name_stamp = found.slice(0, found.indexOf(`_${sessionId}.md`));
  }
  if (!state.name_stamp) {
    let seedTs = null;
    for (const e of events) {
      if (isRealUserPrompt(e) && e.timestamp) {
        seedTs = e.timestamp;
        break;
      }
    }
    const d = seedTs ? new Date(seedTs) : now;
    state.name_stamp = utcNameStamp(Number.isNaN(d.getTime()) ? now : d);
  }
  const filePath = path.join(logDir, `${state.name_stamp}_${sessionId}.md`);
  state = reseedFromLog(state, filePath);

  if (MODE === "prompt") {
    const promptText =
      (typeof input.prompt === "string" && input.prompt) ||
      (typeof input.user_input === "string" && input.user_input) ||
      (typeof input.user_prompt === "string" && input.user_prompt) ||
      "";
    if (!promptText.trim()) return;

    const model = latestModelFromTranscript(events, cfg.default_model);
    state.prompts += 1;
    addModel(state, model);
    if (!state.first_prompt_time) state.first_prompt_time = nowIso;
    state.last_prompt_time = nowIso;

    const block = entryBlock(
      "PROMPT",
      state.prompts,
      shortId,
      nowIso,
      model,
      promptText
    );
    writeLog(filePath, state, cfg, block);
    saveState(state);
    return;
  }

  /* MODE === "stop" */

  // Stop fired again with nothing new since the last response -> ignore.
  if (state.responses >= state.prompts && state.prompts > 0) return;

  let pieces = "";

  // Self-heal: the turn's prompt was never captured (hook enabled mid-turn,
  // or UserPromptSubmit did not run). Rebuild it from the transcript.
  if (state.prompts <= state.responses || state.prompts === 0) {
    const p = lastPromptFromTranscript(events);
    if (p) {
      const model = latestModelFromTranscript(events, cfg.default_model);
      state.prompts += 1;
      addModel(state, model);
      if (!state.first_prompt_time) {
        state.first_prompt_time = p.ts || nowIso;
      }
      state.last_prompt_time = p.ts || nowIso;
      pieces += entryBlock(
        "PROMPT",
        state.prompts,
        shortId,
        p.ts || nowIso,
        model,
        p.text
      );
    }
  }

  // final response text
  let respText = "";
  let respModel = cfg.default_model;
  let respTs = nowIso;
  const f = finalResponseFromTranscript(events, cfg.default_model);
  if (
    typeof input.last_assistant_message === "string" &&
    input.last_assistant_message.trim()
  ) {
    respText = input.last_assistant_message;
    respModel = f.model || latestModelFromTranscript(events, cfg.default_model);
    respTs = f.ts || nowIso;
  } else {
    respText = f.text;
    respModel = f.model;
    respTs = f.ts || nowIso;
  }
  if (!respText.trim()) {
    respText =
      "(no final text response captured for this turn — it ended on a tool call or was interrupted)";
  }

  state.responses += 1;
  addModel(state, respModel);
  pieces += entryBlock(
    "RESPONSE",
    state.responses,
    shortId,
    respTs,
    respModel,
    respText
  );

  writeLog(filePath, state, cfg, pieces);
  saveState(state);
}

try {
  main();
} catch (e) {
  try {
    process.stderr.write(`[capture.mjs] ${e && e.stack ? e.stack : e}\n`);
  } catch {}
}
process.exit(0);
