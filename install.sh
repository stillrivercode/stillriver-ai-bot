#!/bin/bash

# Agentic Workflow Template Installation Script
# This script sets up the complete AI workflow automation environment
# Usage: ./install.sh [--dev] [--skip-labels] [--skip-claude] [--auto-yes] [--anthropic-key KEY] [--gh-pat TOKEN]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DEV=false
SKIP_LABELS=false
SKIP_CLAUDE=false
AUTO_YES=false
ANTHROPIC_KEY=""
GH_PAT=""
REPO_NAME=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            INSTALL_DEV=true
            shift
            ;;
        --skip-labels)
            SKIP_LABELS=true
            shift
            ;;
        --skip-claude)
            SKIP_CLAUDE=true
            shift
            ;;
        --auto-yes)
            AUTO_YES=true
            shift
            ;;
        --anthropic-key)
            ANTHROPIC_KEY="$2"
            shift 2
            ;;
        --gh-pat)
            GH_PAT="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --dev               Install development dependencies"
            echo "  --skip-labels       Skip GitHub labels setup"
            echo "  --skip-claude       Skip Claude Code CLI installation"
            echo "  --auto-yes          Automatically answer yes to prompts (non-interactive)"
            echo "  --anthropic-key KEY Set Anthropic API key automatically"
            echo "  --gh-pat TOKEN      Set GitHub Personal Access Token automatically"
            echo "  -h, --help          Show this help message"
            echo ""
            echo "Environment Variables (more secure than command-line):"
            echo "  ANTHROPIC_API_KEY   Anthropic API key (alternative to --anthropic-key)"
            echo "  GH_PAT              GitHub Personal Access Token (alternative to --gh-pat)"
            echo ""
            echo "Example:"
            echo "  export ANTHROPIC_API_KEY=sk-..."
            echo "  ./install.sh --auto-yes"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

check_command() {
    if command -v "$1" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

prompt_user() {
    local message="$1"
    local default="${2:-y}"

    if [[ "$AUTO_YES" == true ]]; then
        echo -e "${BLUE}?${NC} $message ${YELLOW}[auto-yes]${NC}"
        return 0
    fi

    echo -n -e "${BLUE}?${NC} $message [y/N]: "
    # Add timeout of 60 seconds for user input
    if read -t 60 -r response; then
        case "$response" in
            [yY][eE][sS]|[yY])
                return 0
                ;;
            *)
                return 1
                ;;
        esac
    else
        log_warning "Timeout waiting for user input (60s). Assuming 'No'."
        return 1
    fi
}

check_python_version() {
    if check_command python3; then
        local version=$(python3 --version 2>&1 | grep -oE '[0-9]+\.[0-9]+')
        local major=$(echo $version | cut -d. -f1)
        local minor=$(echo $version | cut -d. -f2)

        if [[ $major -eq 3 && $minor -ge 12 ]]; then
            return 0
        fi
    fi
    return 1
}

create_venv() {
    log_info "Creating Python virtual environment..."

    if [[ -d "venv" ]]; then
        if prompt_user "Virtual environment already exists. Recreate it?"; then
            log_info "Removing existing virtual environment..."
            rm -rf venv
        else
            log_warning "Using existing virtual environment"
            return 0
        fi
    fi

    python3 -m venv venv
    log_success "Virtual environment created"
}

activate_venv() {
    log_info "Activating virtual environment..."

    if [[ -f "venv/bin/activate" ]]; then
        source venv/bin/activate
        log_success "Virtual environment activated"
    else
        log_error "Virtual environment not found"
        return 1
    fi
}

install_node_deps() {
    log_info "Installing Node.js dependencies..."

    if check_command npm; then
        # Check for package-lock.json to ensure consistent dependencies
        if [[ -f "package-lock.json" ]]; then
            log_info "Found package-lock.json, using npm ci for faster, consistent install"
            if [[ "$INSTALL_DEV" == true ]]; then
                npm ci --include=dev
            else
                npm ci --production
            fi
        else
            log_warning "No package-lock.json found, using npm install"
            if [[ "$INSTALL_DEV" == true ]]; then
                npm install --include=dev
            else
                npm install --production
            fi
        fi

        # Run security audit
        log_info "Running security audit..."
        npm audit || log_warning "Some vulnerabilities found. Run 'npm audit fix' to address them."

        log_success "Dependencies installed"
    else
        log_error "npm not found. Please install Node.js and npm"
        return 1
    fi
}

setup_precommit() {
    if [[ "$INSTALL_DEV" == true ]]; then
        log_info "Setting up pre-commit hooks..."

        if check_command pre-commit; then
            pre-commit install
            log_success "Pre-commit hooks installed"
        else
            log_warning "pre-commit not available, skipping hook setup"
        fi
    fi
}

install_claude_cli() {
    if [[ "$SKIP_CLAUDE" == true ]]; then
        log_info "Skipping Claude Code CLI installation (--skip-claude)"
        return 0
    fi

    log_info "Installing Claude Code CLI..."

    if [[ -f "dev-scripts/install-claude.sh" ]]; then
        chmod +x dev-scripts/install-claude.sh
        ./dev-scripts/install-claude.sh
    else
        log_warning "Claude installation script not found, installing manually..."
        if check_command npm; then
            npm install -g @anthropic-ai/claude-code || log_warning "Claude CLI installation failed"
        else
            log_warning "npm not found, skipping Claude CLI installation"
        fi
    fi
}

setup_github_labels() {
    if [[ "$SKIP_LABELS" == true ]]; then
        log_info "Skipping GitHub labels setup (--skip-labels)"
        return 0
    fi

    log_info "Setting up GitHub labels..."

    if ! check_command gh; then
        log_warning "GitHub CLI not found, skipping labels setup"
        log_info "Install GitHub CLI: https://cli.github.com/"
        return 0
    fi

    # Check if we're in a Git repository
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
        log_warning "Not in a Git repository, skipping labels setup"
        return 0
    fi

    # Check if we have a remote repository
    if ! git remote get-url origin >/dev/null 2>&1; then
        log_warning "No Git remote found, skipping labels setup"
        return 0
    fi

    if [[ -f "scripts/setup-labels.sh" ]]; then
        chmod +x scripts/setup-labels.sh
        ./scripts/setup-labels.sh
    else
        log_warning "Labels setup script not found"
    fi
}

setup_template_upstream() {
    log_info "Setting up template upstream remote..."

    # Check if we're in a git repository (already checked earlier, but being safe)
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
        log_warning "Not in a git repository, skipping upstream setup"
        return 0
    fi

    local template_url="https://github.com/stillrivercode/agentic-workflow-template.git"
    local upstream_name="template"

    # Check if upstream remote already exists
    if git remote get-url "$upstream_name" >/dev/null 2>&1; then
        local existing_url=$(git remote get-url "$upstream_name")
        if [ "$existing_url" = "$template_url" ]; then
            log_success "Template upstream remote already configured correctly"
        else
            log_warning "Upstream remote '$upstream_name' exists but points to different URL"
            log_info "Current: $existing_url"
            log_info "Expected: $template_url"
            log_info "You can update it later with: git remote set-url $upstream_name $template_url"
        fi
    else
        git remote add "$upstream_name" "$template_url"
        log_success "Added template upstream remote"
    fi

    # Fetch latest changes from template
    log_info "Fetching latest template changes..."
    if git fetch "$upstream_name" >/dev/null 2>&1; then
        log_success "Template changes fetched"
    else
        log_warning "Could not fetch template changes (network issue?)"
    fi
}

setup_github_secrets() {
    log_info "Setting up GitHub repository secrets..."

    if ! check_command gh; then
        log_warning "GitHub CLI not found, cannot set secrets"
        return 0
    fi

    if ! git remote get-url origin >/dev/null 2>&1; then
        log_warning "No Git remote found, skipping secrets setup"
        return 0
    fi

    # Check environment variables if not provided via command line
    if [[ -z "$ANTHROPIC_KEY" && -n "$ANTHROPIC_API_KEY" ]]; then
        log_info "Using ANTHROPIC_API_KEY from environment"
        ANTHROPIC_KEY="$ANTHROPIC_API_KEY"
    fi

    # Set secrets if provided via parameters
    local secrets_set=false

    if [[ -n "$ANTHROPIC_KEY" ]]; then
        log_info "Setting ANTHROPIC_API_KEY from parameter..."
        # Basic validation for Anthropic API key format
        if [[ ! "$ANTHROPIC_KEY" =~ ^sk-[A-Za-z0-9_-]{32,}$ ]]; then
            log_warning "API key format may be invalid. Anthropic keys typically start with 'sk-'"
        fi
        if echo "$ANTHROPIC_KEY" | gh secret set ANTHROPIC_API_KEY; then
            log_success "ANTHROPIC_API_KEY secret set"
            secrets_set=true
        else
            log_error "Failed to set ANTHROPIC_API_KEY secret"
        fi
    fi

    if [[ -n "$GH_PAT" ]]; then
        log_info "Setting GH_PAT from parameter..."
        if echo "$GH_PAT" | gh secret set GH_PAT; then
            log_success "GH_PAT secret set"
            secrets_set=true
        else
            log_error "Failed to set GH_PAT secret"
        fi
    fi

    # Check existing secrets
    local secrets_missing=false

    if gh secret list | grep -q "ANTHROPIC_API_KEY"; then
        log_success "ANTHROPIC_API_KEY secret found"
    else
        log_warning "ANTHROPIC_API_KEY secret not found"
        secrets_missing=true
    fi

    if gh secret list | grep -q "GH_PAT"; then
        log_success "GH_PAT secret found"
    else
        log_warning "GH_PAT secret not found"
        secrets_missing=true
    fi

    # Offer to set secrets interactively if missing and not provided
    if [[ "$secrets_missing" == true && "$secrets_set" == false ]]; then
        echo ""
        if prompt_user "Would you like to set up GitHub secrets now?"; then
            if [[ -z "$ANTHROPIC_KEY" ]] && ! gh secret list | grep -q "ANTHROPIC_API_KEY"; then
                echo "Enter your Anthropic API key (get one at https://console.anthropic.com):"
                read -r -s anthropic_key
                if [[ -n "$anthropic_key" ]]; then
                    if echo "$anthropic_key" | gh secret set ANTHROPIC_API_KEY; then
                        log_success "ANTHROPIC_API_KEY secret set"
                    else
                        log_error "Failed to set ANTHROPIC_API_KEY secret"
                    fi
                fi
            fi

            if [[ -z "$GH_PAT" ]] && ! gh secret list | grep -q "GH_PAT"; then
                echo "Enter your GitHub Personal Access Token:"
                echo "Create one at: https://github.com/settings/tokens"
                echo "Required scopes: repo, workflow, write:packages"
                read -r -s gh_pat
                if [[ -n "$gh_pat" ]]; then
                    if echo "$gh_pat" | gh secret set GH_PAT; then
                        log_success "GH_PAT secret set"
                    else
                        log_error "Failed to set GH_PAT secret"
                    fi
                fi
            fi
        else
            echo ""
            echo "Manual setup instructions:"
            echo "1. Get Anthropic API key: https://console.anthropic.com"
            echo "2. Create GitHub Personal Access Token: https://github.com/settings/tokens"
            echo "   - Required scopes: repo, workflow, write:packages"
            echo "3. Set secrets:"
            echo "   gh secret set ANTHROPIC_API_KEY"
            echo "   gh secret set GH_PAT"
            echo "4. Or via GitHub web interface: Settings > Secrets and variables > Actions"
            echo ""
        fi
    fi
}

verify_installation() {
    log_info "Verifying installation..."

    # Check Node.js environment
    if [[ -f "package.json" ]]; then
        if check_command npm; then
            log_success "Node.js environment verified"
        else
            log_error "npm not found but package.json exists"
        fi
    fi

    # Check if npm dependencies are installed
    if [[ -d "node_modules" ]]; then
        log_success "Node.js dependencies installed"
    else
        log_warning "node_modules directory not found"
    fi

    # Check if scripts are executable
    if [[ -x "scripts/setup-labels.sh" ]]; then
        log_success "Scripts are executable"
    else
        log_warning "Some scripts may need chmod +x"
    fi
}

print_next_steps() {
    echo ""
    echo -e "${GREEN}🎉 Installation completed!${NC}"
    echo ""
    echo "Next steps:"

    if [[ "$SKIP_CLAUDE" == false ]]; then
        echo "1. Verify Claude Code CLI: claude --version"
    fi

    # Check for missing secrets
    local missing_secrets=""
    if ! gh secret list | grep -q "ANTHROPIC_API_KEY" 2>/dev/null; then
        missing_secrets="ANTHROPIC_API_KEY " # pragma: allowlist secret
    fi
    if ! gh secret list | grep -q "GH_PAT" 2>/dev/null; then
        missing_secrets="${missing_secrets}GH_PAT "
    fi

    if [[ -n "$missing_secrets" ]]; then
        echo "2. Set up repository secrets: gh secret set [${missing_secrets% }]"
    fi

    echo "3. Create your first AI task issue on GitHub"
    echo "4. Review the documentation: docs/simplified-architecture.md"
    echo ""
    echo "For development:"
    echo "- Run tests: npm test"
    echo "- Run linting: npm run lint"
    echo ""
    echo "Template updates:"
    echo "- Check for updates: git log --oneline template/main ^HEAD"
    echo "- Update scripts: ./dev-scripts/update-from-template.sh"
    echo ""
    echo "Non-interactive installation:"
    echo "- ./install.sh --auto-yes --anthropic-key YOUR_KEY --gh-pat YOUR_TOKEN"
    echo "- Or more securely with environment variables:"
    echo "  export ANTHROPIC_API_KEY=sk-..."
    echo "  ./install.sh --auto-yes"
    echo ""
}

main() {
    echo -e "${BLUE}🤖 Agentic Workflow Template Installer${NC}"
    echo "Setting up AI-powered development workflow automation..."
    echo ""

    # Security warning for command-line secrets
    if [[ -n "$ANTHROPIC_KEY" || -n "$GH_PAT" ]]; then
        log_warning "Passing secrets via command line may expose them in shell history"
        log_info "Consider using environment variables instead: export ANTHROPIC_API_KEY=..."
        echo ""
    fi

    # Prerequisites check
    log_info "Checking prerequisites..."

    if ! check_command node; then
        log_error "Node.js is required"
        log_info "Install Node.js: https://nodejs.org/"
        exit 1
    fi
    log_success "Node.js found"

    if ! check_command npm; then
        log_error "npm is required"
        log_info "npm should come with Node.js installation"
        exit 1
    fi
    log_success "npm found"

    if ! check_command git; then
        log_error "Git is required"
        exit 1
    fi
    log_success "Git found"

    # Main installation steps
    install_node_deps
    setup_precommit
    install_claude_cli
    setup_github_labels
    setup_template_upstream
    setup_github_secrets
    verify_installation
    print_next_steps
}

# Run main function
main "$@"
