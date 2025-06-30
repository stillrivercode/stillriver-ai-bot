#!/bin/bash
set -x

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../scripts/lib/common.sh"
source "$SCRIPT_DIR/../scripts/lib/retry-utils.sh"
source "$SCRIPT_DIR/../scripts/lib/error-handling.sh"
source "$SCRIPT_DIR/../scripts/lib/circuit-breaker-integration.sh"
source "$SCRIPT_DIR/../scripts/lib/prerequisite-validation.sh"
source "$SCRIPT_DIR/../scripts/lib/openrouter-client.sh"
source "$SCRIPT_DIR/../scripts/lib/cost-estimator.sh"

log_info "This is a test"
