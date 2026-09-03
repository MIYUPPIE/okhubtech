#!/bin/sh
set -eu

# Applies pending migrations against the SQLite file at DATABASE_URL before
# the server starts. Safe to run on every container start for a
# single-instance deploy like this one: `prisma migrate deploy` only ever
# applies migrations that aren't already recorded, so a restart with nothing
# new to apply is a no-op.
#
# Run straight off node_modules/prisma/build/index.js, the CLI's real entry
# point (the Dockerfile deliberately does not COPY node_modules/.bin/prisma:
# that path is a symlink, and Docker's COPY dereferences a symlink into a
# flat file at the destination, which breaks the CLI's own relative lookup
# of its .wasm asset — it ends up looking next to .bin/ instead of next to
# node_modules/prisma/build/, where the file actually is).
node node_modules/prisma/build/index.js migrate deploy

exec node server.js
