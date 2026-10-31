#!/bin/bash
# TESTS ONLY: stands in for heavy.sh (<label> <command…>) and simply runs the command. The take agent's live mode
# refuses --heavy, so this can never replace heavy.sh in the demo user.
shift
exec "$@"
