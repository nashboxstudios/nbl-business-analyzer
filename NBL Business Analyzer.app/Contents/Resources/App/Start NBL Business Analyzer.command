#!/bin/bash
BASE="$(cd "$(dirname "$0")" && pwd)"
PORTFILE="${TMPDIR:-/tmp}/nbl_business_analyzer_cmd_${$}.url"
rm -f "$PORTFILE"
NBL_NO_BROWSER=1 NBL_PORT_FILE="$PORTFILE" /usr/bin/python3 "$BASE/start_nbl_analyzer.py" &
SERVER_PID=$!
URL=""
for i in {1..20}; do
  if [ -s "$PORTFILE" ]; then URL="$(cat "$PORTFILE")"; break; fi
  /bin/sleep 0.2
done
if [ -n "$URL" ]; then
  if [ -d "/Applications/Google Chrome.app" ]; then /usr/bin/open -a "Google Chrome" "$URL";
  elif [ -d "/Applications/Microsoft Edge.app" ]; then /usr/bin/open -a "Microsoft Edge" "$URL";
  else /usr/bin/open "$URL"; fi
fi
wait "$SERVER_PID"
