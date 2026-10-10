#!/usr/bin/env node
// Chat with Gemini about a Planner task, letting it call the Plan API.
//
// The AI Studio playground shows function calls but cannot run them; this
// script runs them against the Plan API and feeds the results back, with the
// same system instructions and function declarations as the playground.
//
//   node skills/planner-for-gemini/run.mjs ['<pasted curl or message>']
//
// Env: GEMINI_API_KEY (required; aistudio.google.com → Get API key),
// GEMINI_MODEL (default gemini-flash-latest), PLANNER_URL (default
// http://localhost:3000), PLANNER_TOKEN or PLANNER_TOKEN_FILE (default
// .claude/planner-token under the current directory, as written by
// `planner.sh login --clipboard`). Needs Node 18+. No dependencies.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";

const here = new URL(".", import.meta.url);
const systemText = readFileSync(new URL("system-instructions.md", here), "utf8");
const functionDeclarations = JSON.parse(
  readFileSync(new URL("function-declarations.json", here), "utf8"),
);

const geminiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
const base = (process.env.PLANNER_URL || "http://localhost:3000").replace(/\/+$/, "");

function die(message) {
  console.error(`planner-gemini: ${message}`);
  process.exit(1);
}

function plannerToken() {
  if (process.env.PLANNER_TOKEN) {
    return process.env.PLANNER_TOKEN.trim();
  }
  const file = resolve(process.env.PLANNER_TOKEN_FILE || ".claude/planner-token");
  try {
    return readFileSync(file, "utf8").trim();
  } catch {
    die(
      `no Planner token: set PLANNER_TOKEN or run 'planner.sh login --clipboard' (looked in ${file})`,
    );
  }
}

if (!geminiKey) {
  die("set GEMINI_API_KEY");
}
const token = plannerToken();
const rl = createInterface({ input: process.stdin, output: process.stdout });
let isClosed = false;
const closed = new Promise((done) =>
  rl.once("close", () => {
    isClosed = true;
    done(null);
  }),
);
// The answer, or null once stdin has ended.
const ask = (prompt) => (isClosed ? closed : Promise.race([rl.question(prompt), closed]));

// Function name → [method, path parts, sends a body].
const routes = {
  get_thought: ["GET", (a) => [a.todo_id]],
  list_comments: ["GET", (a) => [a.todo_id, "comment"]],
  get_comment: ["GET", (a) => [a.todo_id, "comment", a.comment_id]],
  add_comment: ["POST", (a) => [a.todo_id, "comment"], true],
  put_comment: ["PUT", (a) => [a.todo_id, "comment", a.comment_id], true],
  edit_comment: ["PATCH", (a) => [a.todo_id, "comment", a.comment_id], true],
  delete_comment: ["DELETE", (a) => [a.todo_id, "comment", a.comment_id]],
};

async function callPlanner(name, args) {
  const route = routes[name];
  if (!route) {
    return { error: `Unknown function ${name}.` };
  }
  const [method, parts, hasBody] = route;
  const segments = parts(args);
  if (segments.some((s) => !s)) {
    return { error: "Missing todo_id or comment_id." };
  }
  if (name === "delete_comment") {
    const answer = await ask(`Delete comment ${args.comment_id} on task ${args.todo_id}? [y/N] `);
    if (answer?.trim().toLowerCase() !== "y") {
      return { error: "The user declined the delete." };
    }
  }
  const url = new URL(`${base}/api/plan/${segments.map(encodeURIComponent).join("/")}`);
  if (args.file_id) {
    url.searchParams.set("fileId", args.file_id);
  }
  if (name === "list_comments" && args.open) {
    url.searchParams.set("open", "1");
  }
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(hasBody && { "Content-Type": "application/json" }),
      },
      body: hasBody ? JSON.stringify({ body: args.body ?? "" }) : undefined,
    });
  } catch {
    return { error: `Request failed: is the app running at ${base}?` };
  }
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { text };
  }
  if (!res.ok) {
    return { status: res.status, error: json?.error ?? text };
  }
  return { status: res.status, ...(json ?? {}) };
}

async function generate(contents) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        tools: [{ functionDeclarations }],
        contents,
      }),
    },
  );
  const json = await res.json();
  if (!res.ok) {
    die(`Gemini ${res.status}: ${json?.error?.message ?? JSON.stringify(json)}`);
  }
  const content = json.candidates?.[0]?.content;
  if (!content) {
    die(
      `Gemini returned no content (${json.candidates?.[0]?.finishReason ?? json.promptFeedback?.blockReason ?? "unknown"})`,
    );
  }
  return content;
}

// One user turn: keep answering function calls until Gemini replies in text.
async function turn(contents, userText) {
  // A pasted curl may carry a key (or a shell may have expanded $(cat …)).
  const text = userText
    .replaceAll(token, "<redacted>")
    .replace(/Bearer\s+[^"'\s]+/g, "Bearer <redacted>");
  contents.push({ role: "user", parts: [{ text }] });
  for (;;) {
    const content = await generate(contents);
    // Kept whole so Gemini's thought signatures go back with the calls.
    contents.push(content);
    const calls = (content.parts ?? []).filter((p) => p.functionCall).map((p) => p.functionCall);
    if (calls.length === 0) {
      const text = (content.parts ?? [])
        .map((p) => p.text ?? "")
        .join("")
        .trim();
      console.log(`\n${text}\n`);
      return;
    }
    const parts = [];
    for (const call of calls) {
      const args = call.args ?? {};
      console.log(`→ ${call.name}(${[args.todo_id, args.comment_id].filter(Boolean).join(", ")})`);
      const response = await callPlanner(call.name, args);
      if (response.error) {
        console.log(`  ${response.status ? `HTTP ${response.status}: ` : ""}${response.error}`);
      }
      parts.push({
        functionResponse: { name: call.name, ...(call.id && { id: call.id }), response },
      });
    }
    contents.push({ role: "user", parts });
  }
}

const contents = [];
let input = process.argv.slice(2).join(" ").trim();
for (;;) {
  if (!input) {
    input = (await ask("you> "))?.trim();
    if (!input) {
      break;
    }
  }
  await turn(contents, input);
  input = "";
}
rl.close();
