#!/usr/bin/env bash
# Client for the Planner third-party Plan API (src/app/api/plan/**) and its
# image server (images/, a Bun server with its own token).
#
# Token: $PLANNER_TOKEN, else the file written by `planner.sh login`.
# `login --clipboard` reads the key the app's Settings → API keys copied, so
# it never has to be typed or pasted anywhere else.
# Base URL: $PLANNER_URL (default http://localhost:3000).
# Image server: its URL and token come from the user's Settings → Image server
# (read through the Plan API, /api/image-server); $PLANNER_IMAGES_URL /
# --images <url> and $PLANNER_IMAGES_TOKEN override them.
# File id: --file <id> or $PLANNER_FILE_ID (needed only when a task id
# exists in more than one file; the API answers 409 otherwise).
# Agent name shown with live progress (`event`): $PLANNER_AGENT (default
# "Cursor" when installed under .cursor/, else "Claude Code").
set -euo pipefail

BASE="${PLANNER_URL:-http://localhost:3000}"
IMAGES="${PLANNER_IMAGES_URL:-}"
IMAGES_TOKEN="${PLANNER_IMAGES_TOKEN:-}"
# Root: this script lives in <root>/.claude/skills/<skill>/scripts/ (or
# <root>/.cursor/skills/<skill>/scripts/), where <root> is $HOME for a global
# install (~/.claude/planner-token) or a repo for a per-project one
# (<repo>/.claude/planner-token).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
case "${BASH_SOURCE[0]}" in
  */.cursor/*) AGENT="${PLANNER_AGENT:-Cursor}" ;;
  *) AGENT="${PLANNER_AGENT:-Claude Code}" ;;
esac
TOKEN_FILE="${PLANNER_TOKEN_FILE:-$ROOT/.claude/planner-token}"
FILE_ID="${PLANNER_FILE_ID:-}"
COMMENT_ID=""
FULL=0

usage() {
  cat <<'EOF'
usage: planner.sh [--file <fileId>] [--base <url>] [--images <url>] [--comment <commentId>] [--full] <command> [args]

  login --clipboard                  save the key from the clipboard (chmod 600), then clear it
  login <token|->                    save an access token given directly
  parse <url|curl>                   print todoId / commentId / fileId / base of a Plan API URL
  thought <todoId>                   read the task's thought (markdown)
  list <todoId> [--open]             read thought + comments, oldest first;
                                     --open leaves out settled ones
  get <todoId> <commentId>           read one comment
  open <todoId> <commentId>          print only the comment's open sections
  add <todoId> <body|->              append a comment (server-generated id)
  put <todoId> <commentId> <body|->  create comment with this id, or replace it
  edit <todoId> <commentId> <body|-> edit an existing comment
  delete <todoId> <commentId>        delete a comment
  event <todoId> <type> [text|-]     report live progress to the app; type is
                                     start | step | ask | done | fail
                                     (--comment marks a run on that comment).
                                     Never fails the caller: a lost event only warns.

  attach <todoId> <path> [alt]       upload an image for the task and append it to
                                     the comment given by --comment, else to the
                                     task's thought
  image upload <path> [todoId]       upload an image (linked to the task if given);
                                     prints {id, url, markdown, …}
  image list [todoId]                list images, newest first (one task's if given)
  image get <image>                  read an image's record
  image download <image> [out]       save its bytes (default: a temp file); prints the path
  image replace <image> <path>       swap its bytes; id and url stay the same
  image rename <image> <name>        rename it
  image delete <image>               delete it (embeds stop loading)

  <image> is an image id or its url / markdown src (…/images/<id>/file).
  PNG, JPEG, GIF, WebP or AVIF, up to 10 MB. Images go to the image server set in
  the user's Settings → Image server (started with `pnpm image-server` in the
  Planner repo); --images / PLANNER_IMAGES_TOKEN override its URL / token.

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
  if [[ -n "${3:-}" ]]; then
    request "$1" "$2" "${4:-.}" -H "Content-Type: application/json" --data-binary "$3"
  else
    request "$1" "$2" "${4:-.}"
  fi
}

is_image_url() { [[ -n "$IMAGES" && "$1" == "${IMAGES%/}"/* ]]; }

# The image server's token for its URLs, the Plan API key for the app's.
auth_token() { if is_image_url "$1"; then printf '%s' "$IMAGES_TOKEN"; else token; fi; }

# Fill IMAGES / IMAGES_TOKEN from the user's Settings unless both are set.
image_server() {
  [[ -n "$IMAGES" && -n "$IMAGES_TOKEN" ]] && return
  local s
  s="$(call GET "$BASE/api/image-server")"
  [[ -n "$IMAGES" ]] || IMAGES="$(jq -r .url <<<"$s")"
  [[ -n "$IMAGES_TOKEN" ]] || IMAGES_TOKEN="$(jq -r .token <<<"$s")"
}

server_of() { # server_of <url> → which server it is, for errors
  if is_image_url "$1"; then echo "the image server at $IMAGES"; else echo "the app at $BASE"; fi
}

request() { # request <method> <url> <jq filter> [curl args…]
  local method="$1" target="$2" filter="$3" out status
  shift 3
  out="$(curl -sS -X "$method" -H "Authorization: Bearer $(auth_token "$target")" -w $'\n%{http_code}' "$@" "$target")" \
    || die "request failed (is $(server_of "$target") running?)"
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

image_id() { # image_id <id | …/images/<id>/file url>
  local v="${1##*/images/}"
  v="${v%%[/?)]*}"
  [[ -n "$v" ]] || die "no image id in: $1"
  printf '%s' "$v"
}

image_url() { printf '%s/images/%s' "${IMAGES%/}" "$(urlencode "$(image_id "$1")")"; }

upload_image() { # upload_image <path> [todoId] → {image}
  local path="$1" u="${IMAGES%/}/images"
  [[ -f "$path" ]] || die "no such file: $path"
  if [[ -n "${2:-}" ]]; then
    u="$u?todoId=$(urlencode "$2")"
    [[ -n "$FILE_ID" ]] && u="$u&fileId=$(urlencode "$FILE_ID")"
  fi
  # Quoted so a name with ; or , survives curl's -F parsing.
  request POST "$u" '.image' -F "file=@\"${path//\"/\\\"}\""
}

while [[ $# -gt 0 && "$1" == --* ]]; do
  case "$1" in
    --file) FILE_ID="${2:?--file needs a value}"; shift 2 ;;
    --base) BASE="${2:?--base needs a value}"; shift 2 ;;
    --images) IMAGES="${2:?--images needs a value}"; shift 2 ;;
    --comment) COMMENT_ID="${2:?--comment needs a value}"; shift 2 ;;
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
    if [[ "$TOKEN_FILE" == "$ROOT"/* ]] && git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1 \
      && ! git -C "$ROOT" check-ignore -q "$TOKEN_FILE"; then
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
    printf 'fileId=%s ' "$(sed -nE 's/.*[?&]fileId=([^&]*).*/\1/p' <<<"$u")"
    printf 'base=%s\n' "$(grep -oE 'https?://[^/"'"'"'[:space:]]+/api/plan/' <<<"$1" | head -n1 | sed 's#/api/plan/$##')"
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
  event)
    [[ $# -eq 2 || $# -eq 3 ]] || usage
    case "$2" in start|step|ask|done|fail) ;; *) usage ;; esac
    text="${3:-}"
    [[ "$text" == "-" ]] && text="$(cat)"
    b="$(jq -n --arg t "$2" --arg x "$text" --arg a "$AGENT" --arg c "$COMMENT_ID" \
      '{type: $t, text: $x, agent: $a} + (if $c == "" then {} else {commentId: $c} end)')"
    u="$BASE/api/plan/$(urlencode "$1")/event"
    [[ -n "$FILE_ID" ]] && u="$u?fileId=$(urlencode "$FILE_ID")"
    # Progress is a nicety: never let it stop the work.
    ( call POST "$u" "$b" '.status' ) || echo "planner: event not recorded; carry on" >&2
    ;;
  attach)
    [[ $# -eq 2 || $# -eq 3 ]] || usage
    image_server
    img="$(upload_image "$2" "$1")"
    md="$(jq -r .markdown <<<"$img")"
    if [[ -n "${3:-}" ]]; then
      alt="${3//[/}"
      md="![${alt//]/}](${md#*](}"
    fi
    if [[ -n "$COMMENT_ID" ]]; then
      cur="$(call GET "$(url "$1" comment "$COMMENT_ID")" "" '.comment' | jq -r .)"
      b="$(jq -n --arg b "${cur:+${cur%$'\n'}$'\n\n'}$md" '{body: $b}')"
      call PATCH "$(url "$1" comment "$COMMENT_ID")" "$b" >/dev/null
      to="comment $COMMENT_ID"
    else
      cur="$(call GET "$(url "$1")" "" '.thought' | jq -r .)"
      b="$(jq -n --arg t "${cur:+${cur%$'\n'}$'\n\n'}$md" '{thought: $t}')"
      call PATCH "$(url "$1")" "$b" >/dev/null
      to="thought"
    fi
    jq --arg to "$to" --arg md "$md" '{id, url, markdown: $md, attachedTo: $to}' <<<"$img"
    ;;
  image)
    sub="${1:-}"; shift || true
    image_server
    case "$sub" in
      upload)  [[ $# -eq 1 || $# -eq 2 ]] || usage; upload_image "$1" "${2:-}" ;;
      list)
        [[ $# -le 1 ]] || usage
        u="${IMAGES%/}/images"
        if [[ $# -eq 1 ]]; then
          u="$u?todoId=$(urlencode "$1")"
          [[ -n "$FILE_ID" ]] && u="$u&fileId=$(urlencode "$FILE_ID")"
        fi
        call GET "$u" "" '.images'
        ;;
      get)     [[ $# -eq 1 ]] || usage; call GET "$(image_url "$1")" "" '.image' ;;
      download)
        [[ $# -eq 1 || $# -eq 2 ]] || usage
        out="${2:-}"
        if [[ -z "$out" ]]; then
          t="$(call GET "$(image_url "$1")" "" '.image.type' | jq -r .)"
          out="${TMPDIR:-/tmp}"
          out="${out%/}/planner-image-$(image_id "$1").${t#image/}"
        fi
        status="$(curl -sS -H "Authorization: Bearer $IMAGES_TOKEN" -o "$out" -w '%{http_code}' \
          "$(image_url "$1")/file")" || die "request failed (is the image server at $IMAGES running?)"
        if [[ "$status" -ge 400 ]]; then
          echo "HTTP $status: $(cat "$out")" >&2
          rm -f "$out"
          exit 1
        fi
        echo "$out"
        ;;
      replace)
        [[ $# -eq 2 ]] || usage
        [[ -f "$2" ]] || die "no such file: $2"
        request PUT "$(image_url "$1")" '.image' -F "file=@\"${2//\"/\\\"}\""
        ;;
      rename)  [[ $# -eq 2 ]] || usage; call PATCH "$(image_url "$1")" "$(jq -n --arg n "$2" '{name: $n}')" '.image' ;;
      delete)  [[ $# -eq 1 ]] || usage; call DELETE "$(image_url "$1")" ;;
      *) usage ;;
    esac
    ;;
  *) usage ;;
esac
