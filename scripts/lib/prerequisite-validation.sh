#!/bin/bash

# Comprehensive Prerequisite Validation Library
# Validates all prerequisites before executing AI operations
#
# Features:
# - Network connectivity validation
# - Authentication credential verification
# - Environment variable validation
# - CLI tool availability checks
# - System resource validation
# - Configuration validation

set -euo pipefail

# Validation result codes
readonly VALIDATION_SUCCESS=0
readonly VALIDATION_CRITICAL_FAILURE=1
readonly VALIDATION_WARNING=2

# Minimum system requirements
MIN_DISK_SPACE_MB=100
MIN_MEMORY_MB=512
MAX_LOAD_AVERAGE=10.0

# Required environment variables for different operations
REQUIRED_ENV_VARS_AI="OPENROUTER_API_KEY"
REQUIRED_ENV_VARS_GITHUB="GITHUB_TOKEN"
REQUIRED_ENV_VARS_COST="AI_COST_LIMIT_DAILY AI_COST_LIMIT_MONTHLY"

# Validation state tracking
VALIDATION_ERRORS=()
VALIDATION_WARNINGS=()
VALIDATION_INFO=()

# Main prerequisite validation function
validate_all_prerequisites() {
    local operation_types=("$@")
    local overall_result=$VALIDATION_SUCCESS

    echo "🔍 Starting comprehensive prerequisite validation..."
    echo "   Operation types: ${operation_types[*]:-all}"
    echo "   Timestamp: $(date)"

    # Check if running in test mode
    if [[ "${VALIDATION_TEST_MODE:-}" == "true" ]]; then
        echo "   🧪 Running in TEST MODE - API validation disabled"
    fi
    echo ""

    # Clear previous validation state
    VALIDATION_ERRORS=()
    VALIDATION_WARNINGS=()
    VALIDATION_INFO=()

    # Run all validation checks
    validate_environment_variables "${operation_types[@]}"
    validate_authentication_credentials "${operation_types[@]}"
    validate_cli_tools "${operation_types[@]}"
    validate_system_resources
    validate_configuration "${operation_types[@]}"
    validate_permissions

    # Generate validation report
    generate_validation_report

    # Determine overall result
    if [[ ${#VALIDATION_ERRORS[@]} -gt 0 ]]; then
        overall_result=$VALIDATION_CRITICAL_FAILURE
    elif [[ ${#VALIDATION_WARNINGS[@]} -gt 0 ]]; then
        overall_result=$VALIDATION_WARNING
    fi

    return $overall_result
}

# Validate required environment variables
validate_environment_variables() {
    local operation_types=("$@")

    echo "📋 Validating environment variables..."

    # Check common environment variables
    check_env_var "HOME" "User home directory"
    check_env_var "PATH" "System PATH"
    check_env_var "USER" "Current user" "$(whoami)"

    # Check operation-specific environment variables
    for op_type in "${operation_types[@]}"; do
        case "$op_type" in
            "ai_operations"|"all")
                validate_openrouter_api_key
                ;;
            "github_operations"|"all")
                validate_github_token
                ;;
            "cost_monitoring"|"all")
                validate_cost_monitoring_vars
                ;;
        esac
    done

    # Check CI/CD specific variables
    if [[ -n "${CI:-}" ]]; then
        echo "   🤖 CI/CD environment detected"
        check_env_var "GITHUB_ACTIONS" "GitHub Actions environment"
        check_env_var "GITHUB_REPOSITORY" "Repository name"
        check_env_var "GITHUB_SHA" "Commit SHA"
    fi

    echo "   ✅ Environment variable validation completed"
    echo ""
}

# Validate Anthropic API key
validate_anthropic_api_key() {
    local api_key="${ANTHROPIC_API_KEY:-}"

    if [[ -z "$api_key" ]]; then
        add_validation_error "ANTHROPIC_API_KEY environment variable is not set"
        return 1
    fi

    # Basic format validation (allow test keys in test mode)
    if [[ "${VALIDATION_TEST_MODE:-}" == "true" && "$api_key" == "test_key" ]]; then
        add_validation_info "Test API key detected in test mode"
    elif [[ ! "$api_key" =~ ^sk- ]]; then
        add_validation_error "ANTHROPIC_API_KEY appears to be in incorrect format (should start with 'sk-')"
        return 1
    fi

    # Length validation (skip for test keys)
    if [[ "${VALIDATION_TEST_MODE:-}" != "true" && ${#api_key} -lt 50 ]]; then
        add_validation_warning "ANTHROPIC_API_KEY appears to be too short (${#api_key} characters)"
    fi

    # Test API key with a simple request (skip in test mode)
    if [[ "${VALIDATION_TEST_MODE:-}" == "true" ]]; then
        add_validation_info "ANTHROPIC_API_KEY format validation passed (test mode)"
    elif command -v curl >/dev/null 2>&1; then
        echo "   🔑 Testing Anthropic API key validity..."
        local test_response
        test_response=$(curl -s -w "%{http_code}" -o /dev/null \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $api_key" \
            -H "anthropic-version: 2023-06-01" \
            --max-time 10 \
            https://api.anthropic.com/v1/messages \
            -d '{"model":"claude-3-haiku-20240307","max_tokens":1,"messages":[{"role":"user","content":"test"}]}' \
            2>/dev/null || echo "000")

        case "$test_response" in
            200|400)  # 200 = success, 400 = bad request but valid auth
                add_validation_info "ANTHROPIC_API_KEY is valid and functional"
                ;;
            401)
                add_validation_error "ANTHROPIC_API_KEY is invalid or expired"
                ;;
            429)
                add_validation_warning "ANTHROPIC_API_KEY is valid but rate limited"
                ;;
            *)
                add_validation_warning "Cannot verify ANTHROPIC_API_KEY (network or API issue)"
                ;;
        esac
    else
        add_validation_warning "Cannot test ANTHROPIC_API_KEY (curl not available)"
    fi
}

# Validate GitHub token
validate_github_token() {
    local github_token="${GITHUB_TOKEN:-}"

    if [[ -z "$github_token" ]]; then
        add_validation_warning "GITHUB_TOKEN environment variable is not set (may be optional)"
        return 0
    fi

    # Basic format validation - allow GitHub Actions tokens
    if [[ ! "$github_token" =~ ^(gh[ospru]_|github_pat_|ghs_) ]]; then
        add_validation_warning "GITHUB_TOKEN format appears non-standard"
    fi

    # Test token with GitHub API (skip in test mode or CI environments)
    if [[ "${VALIDATION_TEST_MODE:-}" == "true" ]] || [[ -n "${GITHUB_ACTIONS:-}" ]] || [[ -n "${CI:-}" ]] || [[ -n "${SKIP_GITHUB_TOKEN_VALIDATION:-}" ]]; then
        add_validation_info "GITHUB_TOKEN validation skipped in test/CI environment"
    elif command -v curl >/dev/null 2>&1; then
        echo "   🔑 Testing GitHub token validity..."
        local test_response
        test_response=$(curl -s -w "%{http_code}" -o /dev/null \
            -H "Authorization: Bearer $github_token" \
            --max-time 10 \
            https://api.github.com/user \
            2>/dev/null || echo "000")

        case "$test_response" in
            200)
                add_validation_info "GITHUB_TOKEN is valid and functional"
                ;;
            401)
                add_validation_error "GITHUB_TOKEN is invalid or expired"
                ;;
            403)
                add_validation_warning "GITHUB_TOKEN has insufficient permissions or is rate limited"
                ;;
            *)
                add_validation_warning "Cannot verify GITHUB_TOKEN (network or API issue)"
                ;;
        esac
    fi
}

# Validate cost monitoring variables
validate_cost_monitoring_vars() {
    local daily_limit="${AI_COST_LIMIT_DAILY:-}"
    local monthly_limit="${AI_COST_LIMIT_MONTHLY:-}"

    if [[ -n "$daily_limit" ]]; then
        if [[ ! "$daily_limit" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
            add_validation_error "AI_COST_LIMIT_DAILY must be a valid number, got: $daily_limit"
        fi
    fi

    if [[ -n "$monthly_limit" ]]; then
        if [[ ! "$monthly_limit" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
            add_validation_error "AI_COST_LIMIT_MONTHLY must be a valid number, got: $monthly_limit"
        fi
    fi

    # Validate relationship between daily and monthly limits
    if [[ -n "$daily_limit" && -n "$monthly_limit" ]]; then
        local daily_times_30=$(echo "$daily_limit * 30" | bc -l 2>/dev/null || echo "0")
        if command -v bc >/dev/null 2>&1 && [[ $(echo "$daily_times_30 > $monthly_limit" | bc -l) -eq 1 ]]; then
            add_validation_warning "Daily limit × 30 ($daily_times_30) exceeds monthly limit ($monthly_limit)"
        fi
    fi
}


# Validate authentication credentials
validate_authentication_credentials() {
    local operation_types=("$@")

    echo "🔐 Validating authentication credentials..."

    # Check if running in GitHub Actions
    if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
        echo "   🤖 GitHub Actions environment detected"

        # Validate GitHub Actions token
        if [[ -n "${GITHUB_TOKEN:-}" ]]; then
            add_validation_info "GitHub Actions token is available"
        else
            add_validation_warning "GitHub Actions token not available (may affect some operations)"
        fi
    fi

    # Validate specific authentication requirements
    for op_type in "${operation_types[@]}"; do
        case "$op_type" in
            "ai_operations"|"all")
                # Skip API key validation in test environments
                if [[ -n "${GITHUB_ACTIONS:-}" ]] || [[ -n "${CI:-}" ]] || [[ -n "${SKIP_API_KEY_VALIDATION:-}" ]]; then
                    add_validation_info "AI API key validation skipped in test/CI environment"
                elif [[ -z "${OPENROUTER_API_KEY:-}" ]]; then
                    add_validation_error "AI operations require OPENROUTER_API_KEY"
                fi
                ;;
            "github_operations"|"all")
                if command -v gh >/dev/null 2>&1; then
                    if gh auth status >/dev/null 2>&1; then
                        add_validation_info "GitHub CLI is authenticated"
                    else
                        # In GitHub Actions, CLI might not be authenticated but GITHUB_TOKEN is available
                        if [[ -n "${GITHUB_ACTIONS:-}" && -n "${GITHUB_TOKEN:-}" ]]; then
                            add_validation_info "GitHub Actions environment with GITHUB_TOKEN available"
                        else
                            add_validation_warning "GitHub CLI is not authenticated"
                        fi
                    fi
                fi
                ;;
        esac
    done

    echo "   ✅ Authentication validation completed"
    echo ""
}

# Validate CLI tools availability
validate_cli_tools() {
    local operation_types=("$@")

    echo "🔧 Validating CLI tools availability..."

    # Common tools
    check_cli_tool "bash" "Shell interpreter" true
    check_cli_tool "git" "Version control" true
    check_cli_tool "curl" "HTTP client" false
    check_cli_tool "jq" "JSON processor" false

    # Operation-specific tools
    for op_type in "${operation_types[@]}"; do
        case "$op_type" in
            "ai_operations"|"all")
                validate_claude_cli
                ;;
            "github_operations"|"all")
                check_cli_tool "gh" "GitHub CLI" false
                ;;
        esac
    done

    echo "   ✅ CLI tools validation completed"
    echo ""
}

# Validate Claude CLI specifically
validate_claude_cli() {
    echo "   🤖 Validating Claude CLI..."

    # Skip Claude CLI validation in test environments
    if [[ -n "${GITHUB_ACTIONS:-}" ]] || [[ -n "${CI:-}" ]] || [[ -n "${SKIP_CLAUDE_CLI_VALIDATION:-}" ]]; then
        add_validation_info "Claude CLI validation skipped in test/CI environment"
        return 0
    fi

    local claude_cmd=""

    # Check for various Claude CLI commands
    if command -v claude-code >/dev/null 2>&1; then
        claude_cmd="claude-code"
    elif command -v claude >/dev/null 2>&1; then
        claude_cmd="claude"
    elif command -v npx >/dev/null 2>&1; then
        claude_cmd="npx @anthropic-ai/claude-code"
    else
        add_validation_error "No Claude CLI found (claude-code, claude, or npx)"
        return 1
    fi

    add_validation_info "Claude CLI found: $claude_cmd"

    # Test Claude CLI version
    local version_output
    if version_output=$($claude_cmd --version 2>&1); then
        add_validation_info "Claude CLI version: $version_output"
    else
        add_validation_warning "Cannot determine Claude CLI version"
    fi

    # Check for dangerous permissions flag support
    if $claude_cmd --help 2>&1 | grep -q "dangerously-skip-permissions"; then
        add_validation_info "Claude CLI supports --dangerously-skip-permissions flag"
    else
        add_validation_warning "Claude CLI may not support --dangerously-skip-permissions flag"
    fi
}

# Validate system resources
validate_system_resources() {
    echo "💻 Validating system resources..."

    # Check available disk space
    local available_space_mb
    if command -v df >/dev/null 2>&1; then
        available_space_mb=$(df . | awk 'NR==2 {print int($4/1024)}')

        if [[ $available_space_mb -lt $MIN_DISK_SPACE_MB ]]; then
            add_validation_error "Insufficient disk space: ${available_space_mb}MB available (minimum ${MIN_DISK_SPACE_MB}MB required)"
        else
            add_validation_info "Disk space: ${available_space_mb}MB available"
        fi
    else
        add_validation_warning "Cannot check disk space (df command not available)"
    fi

    # Check available memory
    if [[ -f /proc/meminfo ]]; then
        local available_memory_mb
        available_memory_mb=$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo "0")

        if [[ $available_memory_mb -gt 0 ]]; then
            if [[ $available_memory_mb -lt $MIN_MEMORY_MB ]]; then
                add_validation_warning "Low available memory: ${available_memory_mb}MB (recommended minimum ${MIN_MEMORY_MB}MB)"
            else
                add_validation_info "Available memory: ${available_memory_mb}MB"
            fi
        fi
    fi

    # Check system load
    if command -v uptime >/dev/null 2>&1; then
        local load_average
        load_average=$(uptime | grep -o "load average: [0-9.]*" | cut -d' ' -f3 | cut -d',' -f1)

        if [[ -n "$load_average" ]]; then
            if command -v bc >/dev/null 2>&1 && [[ $(echo "$load_average > $MAX_LOAD_AVERAGE" | bc -l) -eq 1 ]]; then
                add_validation_warning "High system load: $load_average (maximum recommended: $MAX_LOAD_AVERAGE)"
            else
                add_validation_info "System load: $load_average"
            fi
        fi
    fi

    echo "   ✅ System resources validation completed"
    echo ""
}

# Validate configuration files and settings
validate_configuration() {
    local operation_types=("$@")

    echo "⚙️  Validating configuration..."

    # Check git configuration
    if command -v git >/dev/null 2>&1; then
        local git_user_name=$(git config user.name 2>/dev/null || echo "")
        local git_user_email=$(git config user.email 2>/dev/null || echo "")

        # In GitHub Actions, git config might not be set but commits can still work with GITHUB_ACTOR
        if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
            if [[ -z "$git_user_name" && -n "${GITHUB_ACTOR:-}" ]]; then
                add_validation_info "Git user.name not configured, but GitHub Actions will use GITHUB_ACTOR: ${GITHUB_ACTOR}"
            elif [[ -z "$git_user_name" ]]; then
                add_validation_warning "Git user.name not configured"
            fi

            if [[ -z "$git_user_email" && -n "${GITHUB_ACTOR:-}" ]]; then
                add_validation_info "Git user.email not configured, but GitHub Actions will use default"
            elif [[ -z "$git_user_email" ]]; then
                add_validation_warning "Git user.email not configured"
            fi
        else
            if [[ -z "$git_user_name" ]]; then
                add_validation_warning "Git user.name not configured"
            fi

            if [[ -z "$git_user_email" ]]; then
                add_validation_warning "Git user.email not configured"
            fi
        fi

        if [[ -n "$git_user_name" && -n "$git_user_email" ]]; then
            add_validation_info "Git configured for user: $git_user_name <$git_user_email>"
        fi
    fi

    # Check if we're in a git repository
    if git rev-parse --git-dir >/dev/null 2>&1; then
        add_validation_info "Current directory is a git repository"

        # Check for uncommitted changes
        if ! git diff --quiet 2>/dev/null; then
            add_validation_warning "Repository has uncommitted changes"
        fi
    else
        add_validation_warning "Current directory is not a git repository"
    fi

    echo "   ✅ Configuration validation completed"
    echo ""
}

# Validate file and directory permissions
validate_permissions() {
    echo "🔒 Validating permissions..."

    # Check write permissions in current directory
    if [[ -w "." ]]; then
        add_validation_info "Write access to current directory: OK"
    else
        add_validation_error "No write access to current directory"
    fi

    # Check temp directory access
    if [[ -w "/tmp" ]]; then
        add_validation_info "Write access to /tmp: OK"
    else
        add_validation_warning "No write access to /tmp directory"
    fi

    # Check home directory access
    if [[ -w "$HOME" ]]; then
        add_validation_info "Write access to home directory: OK"
    else
        add_validation_warning "No write access to home directory"
    fi

    echo "   ✅ Permissions validation completed"
    echo ""
}

# Helper functions for validation state management
add_validation_error() {
    VALIDATION_ERRORS+=("$1")
    echo "   ❌ ERROR: $1"
}

add_validation_warning() {
    VALIDATION_WARNINGS+=("$1")
    echo "   ⚠️  WARNING: $1"
}

add_validation_info() {
    VALIDATION_INFO+=("$1")
    echo "   ℹ️  INFO: $1"
}

# Check if environment variable is set
check_env_var() {
    local var_name="$1"
    local description="$2"
    local default_value="${3:-}"

    local var_value="${!var_name:-}"

    if [[ -n "$var_value" ]]; then
        add_validation_info "$description ($var_name): Set"
    elif [[ -n "$default_value" ]]; then
        add_validation_info "$description ($var_name): Using default ($default_value)"
    else
        add_validation_warning "$description ($var_name): Not set"
    fi
}

# Check if CLI tool is available
check_cli_tool() {
    local tool_name="$1"
    local description="$2"
    local required="$3"

    if command -v "$tool_name" >/dev/null 2>&1; then
        local tool_path=$(which "$tool_name")
        add_validation_info "$description ($tool_name): Available at $tool_path"
    else
        if [[ "$required" == "true" ]]; then
            add_validation_error "$description ($tool_name): Required but not found"
        else
            add_validation_warning "$description ($tool_name): Not available (optional)"
        fi
    fi
}

# Generate comprehensive validation report
generate_validation_report() {
    echo ""
    echo "📊 PREREQUISITE VALIDATION REPORT"
    echo "═════════════════════════════════════════════════"
    echo "Timestamp: $(date)"
    echo ""

    # Summary
    local total_checks=$((${#VALIDATION_ERRORS[@]} + ${#VALIDATION_WARNINGS[@]} + ${#VALIDATION_INFO[@]}))
    echo "Total checks performed: $total_checks"
    echo "Errors: ${#VALIDATION_ERRORS[@]}"
    echo "Warnings: ${#VALIDATION_WARNINGS[@]}"
    echo "Information items: ${#VALIDATION_INFO[@]}"
    echo ""

    # Errors section
    if [[ ${#VALIDATION_ERRORS[@]} -gt 0 ]]; then
        echo "🚨 CRITICAL ERRORS (must be resolved):"
        for error in "${VALIDATION_ERRORS[@]}"; do
            echo "   ❌ $error"
        done
        echo ""
    fi

    # Warnings section
    if [[ ${#VALIDATION_WARNINGS[@]} -gt 0 ]]; then
        echo "⚠️  WARNINGS (should be addressed):"
        for warning in "${VALIDATION_WARNINGS[@]}"; do
            echo "   ⚠️  $warning"
        done
        echo ""
    fi

    # Overall status
    if [[ ${#VALIDATION_ERRORS[@]} -eq 0 ]]; then
        if [[ ${#VALIDATION_WARNINGS[@]} -eq 0 ]]; then
            echo "✅ VALIDATION RESULT: PASSED - All prerequisites met"
        else
            echo "⚠️  VALIDATION RESULT: PASSED WITH WARNINGS - Review warnings above"
        fi
    else
        echo "❌ VALIDATION RESULT: FAILED - Critical errors must be resolved"
        echo ""
        echo "🔧 RECOMMENDED ACTIONS:"
        echo "1. Resolve all critical errors listed above"
        echo "2. Address warnings to improve reliability"
        echo "3. Re-run prerequisite validation"
        echo "4. Consult documentation for specific error resolution"
    fi

    echo "═════════════════════════════════════════════════"
}

# Export main validation function
export -f validate_all_prerequisites
