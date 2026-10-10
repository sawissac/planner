#!/usr/bin/env bash
# Client for the Planner third-party Plan API (src/app/api/plan/**).
#
# Token: $PLANNER_TOKEN, else the file written by `planner.sh login`.
# `login --clipboard` reads the key the app's Settings → API keys copied, so
# it never has to be typed or pasted anywhere else.
# Base URL: $PLANNER_URL (default http://localhost:3000).
# File id: --file <id> or $PLANNER_FILE_ID (needed only when a task id
# exists in more than one file; the API answers 409 otherwise).
set -euo pipefail

BASE="${PLANNER_URL:-http://localhost:3000}"
# Repo root: this script lives in <root>/.claude/skills/<skill>/scripts/.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
TOKEN_FILE="${PLANNER_TOKEN_FILE:-$ROOT/.claude/planner-token}"
FILE_ID="${PLANNER_FILE_ID:-}"
FULL=0

usage() {
  cat <<'EOF'
usage: planner.sh [--file <fileId>] [--base <url>] [--full] <command> [args]

  login --clipboard                  save the key from the clipboard (chmod 600), then clear it
  login <token|->                    save an access token given directly
  parse <url|curl>                   print todoId / commentId / fileId of a Plan API URL
  thought <todoId>                   read the task's thought (markdown)
  list <todoId> [--open]             read thought + comments, oldest first;
                                     --open leaves out settled ones
  get <todoId> <commentId>           read one comment
  open <todoId> <commentId>          print only the comment's open sections
  add <todoId> <body|->              append a comment (server-generated id)
  put <todoId> <commentId> <body|->  create comment with this id, or replace it
  edit <todoId> <commentId> <body|-> edit an existing comment
  delete <todoId> <commentId>        delete a comment

A body of "-" is read from stdin. Output is the JSON response; get/add/put/edit
drop the echoed "thought" unless --full is given.
EOF
  exit 2
}

die() { echo "planner: $*" >&2; exit 1; }

token() {
  if [[ -n "${PLANNER_TOKEN:-}" ]]; then
    printf '%s' "$PLANNER_TOKEN"
  elif [[ -s "$TOKEN_FILE" ]]; then
    tr -d '[:space:]' <"$TOKEN_FILE"
  else
    die "no token: set PLANNER_TOKEN or run 'planner.sh login <token>'"
  fi
}

urlencode() { jq -rn --arg v "$1" '$v|@uri'; }

clip_read() {
  if command -v pbpaste >/dev/null; then pbpaste
  elif command -v wl-paste >/dev/null; then wl-paste -n
  elif command -v xclip >/dev/null; then xclip -selection clipboard -o
  elif command -v xsel >/dev/null; then xsel -b -o
  else die "no clipboard tool found (pbpaste, wl-paste, xclip or xsel)"
  fi
}

clip_clear() {
  if command -v pbcopy >/dev/null; then printf '' | pbcopy
  elif command -v wl-copy >/dev/null; then wl-copy --clear
  elif command -v xclip >/dev/null; then printf '' | xclip -selection clipboard
  elif command -v xsel >/dev/null; then xsel -bc
  fi
}

# The token in "<token>", "Bearer <token>" or an old curl that carried one.
# Never echoes its input: it may be a secret.
extract_token() {
  local t
  t="$(grep -oE 'Bearer[[:space:]]+[^"[:space:]]+' <<<"$1" | head -n1 | sed -E 's/^Bearer[[:space:]]+//')" || true
  [[ -n "$t" ]] || t="$(tr -d '[:space:]' <<<"$1")"
  [[ "$t" == pln_* || "$t" =~ ^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$ ]] \
    || die "that is not a Plan API key: copy one from Settings → API keys"
  printf '%s' "$t"
}

# Sections of a comment that still ask for work: each line that is only a
# bold heading (**Bug**, **Fix**, …) plus what follows it, unless the heading
# is "(Resolved)" or one an agent writes for itself. A "(Partly resolved)"
# section keeps its **Resolved Message**, which says what is still open. Same
# rule as isSettledComment in src/lib/plan-api.ts.
open_sections() {
  awk '
    function trim(s) { gsub(/^[ \t\r]+|[ \t\r]+$/, "", s); return s }
    {
      t = trim($0)
      if (t ~ /^\*\*[^*]+\*\*$/) {
        h = tolower(trim(substr(t, 3, length(t) - 4)))
        if (h == "resolved message") {
          live = partly
        } else {
          partly = h ~ /\(partly resolved\)$/
          live = !(h ~ /\(resolved\)$/ || h == "done")
        }
        if (live) { if (n++) print ""; printf "%s  (line %d)\n", t, NR }
        body = 0; gap = 0
        next
      }
      if (!live) next
      if (t == "") { gap = 1; next }
      if (gap && body) print ""
      print; body = 1; gap = 0
    }
    END { if (!n) print "no open sections" }
  '
}

url() { # url <todoId> [comment [commentId]]
  local u="$BASE/api/plan/$(urlencode "$1")"
  [[ -n "${2:-}" ]] && u="$u/comment"
  [[ -n "${3:-}" ]] && u="$u/$(urlencode "$3")"
  [[ -n "$FILE_ID" ]] && u="$u?fileId=$(urlencode "$FILE_ID")"
  [[ -n "${QUERY:-}" ]] && u="$u$([[ "$u" == *\?* ]] && echo '&' || echo '?')$QUERY"
  printf '%s' "$u"
}

body_json() { # body_json <text|->
  local text="$1"
  [[ "$text" == "-" ]] && text="$(cat)"
  [[ -n "${text//[[:space:]]/}" ]] || die "comment body is empty"
  jq -n --arg b "$text" '{body: $b}'
}

call() { # call <method> <url> [json] [jq filter]
  local method="$1" target="$2" data="${3:-}" filter="${4:-.}" out status
  local args=(-sS -X "$method" -H "Authorization: Bearer $(token)" -w $'\n%{http_code}')
  [[ -n "$data" ]] && args+=(-H "Content-Type: application/json" --data-binary "$data")
  out="$(curl "${args[@]}" "$target")" || die "request failed (is the app running at $BASE?)"
  status="${out##*$'\n'}"
  out="${out%$'\n'*}"
  if [[ "$status" -ge 400 ]]; then
    echo "HTTP $status: $out" >&2
    exit 1
  fi
  if [[ -n "$out" ]]; then
    printf '%s\n' "$out" | jq "$filter" 2>/dev/null || printf '%s\n' "$out"
  else
    echo "{\"status\": $status}"
  fi
}

while [[ $# -gt 0 && "$1" == --* ]]; do
  case "$1" in
    --file) FILE_ID="${2:?--file needs a value}"; shift 2 ;;
    --base) BASE="${2:?--base needs a value}"; shift 2 ;;
    --full) FULL=1; shift ;;
    *) usage ;;
  esac
done

cmd="${1:-}"; shift || true
brief='del(.thought)'; [[ "$FULL" == 1 ]] && brief='.'

case "$cmd" in
  login)
    [[ $# -eq 1 ]] || usage
    case "$1" in
      --clipboard) t="$(extract_token "$(clip_read)")"; clip_clear ;;
      -) t="$(extract_token "$(cat)")" ;;
      *) t="$(extract_token "$1")" ;;
    esac
    if [[ "$TOKEN_FILE" == "$ROOT"/* ]] && ! git -C "$ROOT" check-ignore -q "$TOKEN_FILE"; then
      die "$TOKEN_FILE is not git-ignored; refusing to save a key there"
    fi
    mkdir -p "$(dirname "$TOKEN_FILE")"
    (umask 077; printf '%s\n' "$t" >"$TOKEN_FILE")
    echo "token saved to ${TOKEN_FILE#"$ROOT"/}${t:+ (…${t: -4})}"
    [[ "$1" == --clipboard ]] && echo "clipboard cleared"
    ;;
  parse)
    [[ $# -eq 1 ]] || usage
    u="$(grep -oE '/api/plan/[^"'"'"'[:space:]]+' <<<"$1" | head -n1)" || true
    [[ -n "$u" ]] || die "no /api/plan/ URL found"
    printf '%s' "${u%%\?*}" | sed -nE 's#^/api/plan/([^/]+)(/comment/([^/]+))?/?$#todoId=\1 commentId=\3 #p' | tr -d '\n'
    printf 'fileId=%s\n' "$(sed -nE 's/.*[?&]fileId=([^&]*).*/\1/p' <<<"$u")"
    ;;
  thought) [[ $# -eq 1 ]] || usage; call GET "$(url "$1")" ;;
  list)
    [[ $# -eq 1 || ( $# -eq 2 && "$2" == --open ) ]] || usage
    [[ $# -eq 2 ]] && QUERY=open=1
    call GET "$(url "$1" comment)"
    ;;
  get)     [[ $# -eq 2 ]] || usage; call GET "$(url "$1" comment "$2")" "" "$brief" ;;
  open)
    [[ $# -eq 2 ]] || usage
    c="$(call GET "$(url "$1" comment "$2")" "" '.comment')"
    jq -r . <<<"$c" | open_sections
    ;;
  add)     [[ $# -eq 2 ]] || usage; b="$(body_json "$2")"; call POST "$(url "$1" comment)" "$b" "$brief" ;;
  put)     [[ $# -eq 3 ]] || usage; b="$(body_json "$3")"; call PUT "$(url "$1" comment "$2")" "$b" "$brief" ;;
  edit)    [[ $# -eq 3 ]] || usage; b="$(body_json "$3")"; call PATCH "$(url "$1" comment "$2")" "$b" "$brief" ;;
  delete)  [[ $# -eq 2 ]] || usage; call DELETE "$(url "$1" comment "$2")" ;;
  *) usage ;;
esac
