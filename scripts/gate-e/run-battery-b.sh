#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
if [ "$(git branch --show-current)" != 'test/gate-e-negative-20261012' ]; then echo 'BLOQUEADO: branch incorreta'; exit 2; fi
node --check scripts/gate-e/validate-intake-pr.cjs
node --test tests/regression/*.test.cjs
printf '\nBATERIA B LOCAL: regressao concluida; sem GitHub real ou merge.\n'
