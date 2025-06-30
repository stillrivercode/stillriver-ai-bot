#!/bin/bash

# Create GitHub issue and detailed technical specification document in unified workflow
# Usage: ./shared-commands/commands/create-spec.sh --title "TITLE" [OPTIONS]

set -e

# Get script directory and source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/common-utils.sh"
source "$SCRIPT_DIR/../lib/github-utils.sh"
source "$SCRIPT_DIR/../lib/github-integration.sh"
source "$SCRIPT_DIR/../lib/markdown-utils.sh"

# Generate issue reference section for unified workflow
generate_issue_reference_unified() {
    local issue_number="$1"
    local issue_title="$2"
    local issue_body="$3"
    local issue_url="$4"
    local labels="$5"

    cat << EOF
## Issue Reference

**GitHub Issue**: [#$issue_number - $issue_title]($issue_url)

### Original Description

${issue_body:-No description provided}

### Labels

EOF

    if [[ -n "$labels" ]]; then
        # Convert comma-separated labels to list
        echo "$labels" | tr ',' '\n' | while read -r label; do
            label=$(echo "$label" | xargs)  # Trim whitespace
            if [[ -n "$label" ]]; then
                echo "- \`$label\`"
            fi
        done
    else
        echo "- None"
    fi

    echo
    echo "### Workflow Integration"
    echo
    if [[ "$labels" == *"ai-task"* ]]; then
        echo "- ✅ **AI Task**: This issue will trigger automated AI implementation"
        echo "- 📊 **Monitoring**: Track progress in GitHub Actions tab"
        echo "- 🔄 **Automation**: PR will be created automatically when implementation is complete"
    else
        echo "- 📝 **Manual**: Add 'ai-task' label to trigger AI implementation"
        echo "- 👥 **Assignment**: Assign to team members for manual implementation"
        echo "- 📋 **Tracking**: Add to project boards and milestones"
    fi

    echo
}

# Command configuration

COMMAND_NAME="create-spec"
DESCRIPTION="Creates a GitHub issue and detailed technical specification document in a unified workflow."

# Parse command line arguments
if ! parse_unified_args "$@"; then
    exit 1
fi

# Show help if requested
if [[ "$PARSED_HELP" == "true" ]]; then
    extra_options="Spec-specific Options:
  --user-story-issue NUM    Link to related user story issue"
    show_unified_help "$COMMAND_NAME" "$DESCRIPTION" "$extra_options"
    exit 0
fi

# Validate required arguments
if [[ -z "$PARSED_TITLE" ]] && [[ -z "$PARSED_ISSUE" ]]; then
    log_error "Either --title or --issue is required"
    show_unified_help "$COMMAND_NAME" "$DESCRIPTION"
    exit 1
fi

# Set up variables
title="$PARSED_TITLE"
body="${PARSED_BODY:-}"
labels="$PARSED_LABELS"
assignee="${PARSED_ASSIGNEE:-}"
user_story_issue="${PARSED_USER_STORY_ISSUE:-}"
issue_number="${PARSED_ISSUE:-}"
ai_task="${PARSED_AI_TASK:-false}"
dry_run="${PARSED_DRY_RUN:-false}"

# If issue number is provided, fetch title and body
if [[ -n "$issue_number" ]] && [[ -z "$title" ]]; then
    log_info "Fetching details for issue #$issue_number..."
    issue_data=$(gh issue view "$issue_number" --json title,body)
    title=$(echo "$issue_data" | jq -r '.title')
    body=$(echo "$issue_data" | jq -r '.body')
fi

# Add ai-task to labels if requested
if [[ "$ai_task" == "true" ]]; then
    labels=$(add_default_labels "technical-spec" "$labels")
    if [[ "$labels" != *"ai-task"* ]]; then
        labels="$labels,ai-task"
    fi
else
    labels=$(add_default_labels "technical-spec" "$labels")
fi

# Main execution
main() {
    log_info "Creating technical specification: $title"
    echo

    # Validate GitHub setup
    if ! check_github_cli; then
        exit 1
    fi

    # Validate user story issue if provided
    if [[ -n "$user_story_issue" ]]; then
        log_info "Validating related user story issue #$user_story_issue..."
        if ! verify_issue_exists "$user_story_issue"; then
            log_warning "User story issue #$user_story_issue may not exist"
        else
            log_success "User story issue #$user_story_issue verified"
        fi
        echo
    fi

    # Validate labels
    validate_github_labels "$labels"
    echo

    # Create GitHub issue
    log_info "Step 1: Creating GitHub issue..."
    local issue_number
    if ! issue_number=$(create_github_issue "$title" "$body" "$labels" "$assignee" "$dry_run"); then
        log_error "Failed to create GitHub issue"
        exit 1
    fi

    echo
    log_info "Step 2: Generating technical specification document..."

    # Create output directory
    ensure_directory "specs"

    # Generate filename using issue number
    local sanitized_title filename issue_url
    sanitized_title=$(sanitize_filename "$title")
    filename="specs/issue-${issue_number}-${sanitized_title}.md"

    # Get issue URL
    if [[ "$dry_run" != "true" ]]; then
        issue_url=$(get_issue_url "$issue_number")
    else
        issue_url="https://github.com/owner/repo/issues/$issue_number"
    fi

    # Generate technical specification document
    if [[ "$dry_run" == "true" ]]; then
        log_info "DRY RUN - Would create: $filename"
    else
        generate_spec_document > "$filename"
    fi

    log_success "Technical specification created: $filename"

    # Check for related user story
    if [[ -n "$user_story_issue" ]]; then
        local user_story_title user_story_sanitized user_story_file
        if [[ "$dry_run" != "true" ]]; then
            user_story_title=$(gh issue view "$user_story_issue" --json title | jq -r '.title' 2>/dev/null || echo "$title")
        else
            user_story_title="$title"
        fi
        user_story_sanitized=$(sanitize_filename "$user_story_title")
        user_story_file="user-stories/issue-${user_story_issue}-${user_story_sanitized}.md"

        echo
        if [[ -f "$user_story_file" ]]; then
            log_info "Related user story found: $user_story_file"
        else
            log_info "💡 Related user story not found. Consider creating with:"
            log_info "   ./shared-commands/commands/create-user-story.sh --title \"$user_story_title\""
        fi
    else
        local potential_user_story="user-stories/issue-${issue_number}-${sanitized_title}.md"
        echo
        if [[ -f "$potential_user_story" ]]; then
            log_info "Related user story found: $potential_user_story"
        else
            log_info "💡 Consider creating a related user story with:"
            log_info "   ./shared-commands/commands/create-user-story.sh --title \"$title Story\""
        fi
    fi

    # Add cross-reference comment to user story issue if provided
    if [[ -n "$user_story_issue" && "$dry_run" != "true" ]]; then
        local comment="📋 **Technical Specification Created**

Technical specification has been created for this user story:
- **Issue**: #$issue_number
- **Document**: [Technical Specification]($issue_url)
- **File**: \`$filename\`

This spec provides detailed implementation guidance for the user story requirements."

        if add_issue_comment "$user_story_issue" "$comment"; then
            log_success "Added cross-reference comment to user story issue #$user_story_issue"
        fi
    fi

    # Show completion summary
    echo
    log_success "✅ Unified workflow completed!"
    echo
    echo "📋 **Created:**"
    echo "   • GitHub Issue #$issue_number: $issue_url"
    echo "   • Technical Spec: $filename"
    if [[ -n "$user_story_issue" ]]; then
        echo "   • Cross-referenced with User Story Issue #$user_story_issue"
    fi
    echo

    if [[ "$ai_task" == "true" ]]; then
        echo "🤖 **AI Workflow:**"
        echo "   • AI implementation will start automatically"
        echo "   • Monitor progress in GitHub Actions"
        echo "   • Review generated PR when ready"
        echo
    fi

    echo "📚 **Next Steps:**"
    if [[ "$ai_task" != "true" ]]; then
        echo "   • Add 'ai-task' label to trigger AI implementation"
    fi
    if [[ -z "$user_story_issue" ]]; then
        echo "   • Create related user story if needed"
    fi
    echo "   • Assign issue to team members"
    echo "   • Add to project boards for tracking"
}

# Generate the complete technical specification document
generate_spec_document() {
    # Document header
    generate_header 1 "Technical Specification: $title"

    # Metadata
    generate_metadata "$issue_number" "$title" "$issue_url" "$(get_current_date)" "Technical Specification"

    # Table of contents
    generate_toc "Overview" "System Architecture" "Detailed Design" "API Specifications" "Database Design" "Security Considerations" "Performance Requirements" "Testing Strategy" "Deployment Plan" "Monitoring & Observability" "Related Documents" "Issue Reference"

    # Overview
    generate_header 2 "Overview"

    cat << EOF
### Problem Statement

${body:-This technical specification was generated from GitHub issue requirements. Please customize the problem statement with specific technical challenges and requirements.}

### Solution Summary

[Provide a high-level summary of the proposed technical solution]

### Goals and Objectives

- **Primary Goal**: [Main technical objective]
- **Secondary Goals**: [Additional objectives]
- **Success Criteria**: [How technical success will be measured]

### Assumptions and Constraints

- **Assumptions**: [List key technical assumptions]
- **Constraints**: [Technical, business, or resource constraints]
- **Dependencies**: [External dependencies and integrations]

EOF

    # System Architecture
    generate_header 2 "System Architecture"

    cat << EOF
### High-Level Architecture

\`\`\`mermaid
graph TD
    A[User] --> B[Frontend]
    B --> C[API Gateway]
    C --> D[Backend Service]
    D --> E[Database]
\`\`\`

### Component Overview

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| Frontend | User interface | [Technology] |
| Backend | Business logic | [Technology] |
| Database | Data persistence | [Technology] |

### Data Flow

1. [Step 1 description]
2. [Step 2 description]
3. [Step 3 description]

EOF

    # Detailed Design
    generate_header 2 "Detailed Design"

    cat << EOF
### Core Components

#### Component 1: [Name]

**Purpose**: [Component purpose]

**Responsibilities**:
- [Responsibility 1]
- [Responsibility 2]

**Interfaces**:
- [Interface 1]
- [Interface 2]

#### Component 2: [Name]

**Purpose**: [Component purpose]

**Responsibilities**:
- [Responsibility 1]
- [Responsibility 2]

### Algorithms and Logic

#### Algorithm 1: [Name]

\`\`\`pseudo
function algorithmName(input):
    // Algorithm description
    return result
\`\`\`

### Error Handling

- **Error Type 1**: [Handling strategy]
- **Error Type 2**: [Handling strategy]

EOF

    # API Specifications
    generate_header 2 "API Specifications"

    cat << EOF
### REST Endpoints

#### GET /api/resource

**Description**: [Endpoint description]

**Parameters**:
- \`param1\` (string, required): [Description]
- \`param2\` (integer, optional): [Description]

**Response**:
\`\`\`json
{
  "status": "success",
  "data": {
    "example": "response"
  }
}
\`\`\`

**Error Responses**:
- \`400\`: Bad Request
- \`404\`: Resource Not Found
- \`500\`: Internal Server Error

#### POST /api/resource

**Description**: [Endpoint description]

**Request Body**:
\`\`\`json
{
  "field1": "value1",
  "field2": "value2"
}
\`\`\`

**Response**:
\`\`\`json
{
  "status": "success",
  "data": {
    "id": 123,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
\`\`\`

### GraphQL Schema (if applicable)

\`\`\`graphql
type Resource {
  id: ID!
  name: String!
  createdAt: DateTime!
}

type Query {
  getResource(id: ID!): Resource
}

type Mutation {
  createResource(input: ResourceInput!): Resource
}
\`\`\`

EOF

    # Database Design
    generate_header 2 "Database Design"

    cat << EOF
### Entity Relationship Diagram

\`\`\`mermaid
erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    PRODUCT ||--o{ LINE-ITEM : ordered
\`\`\`

### Table Schemas

#### users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | User identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |

#### products

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Product identifier |
| name | VARCHAR(255) | NOT NULL | Product name |
| price | DECIMAL(10,2) | NOT NULL | Product price |

### Indexes

- \`idx_users_email\` on \`users(email)\`
- \`idx_products_name\` on \`products(name)\`

### Migrations

#### Migration 001: Create initial tables

\`\`\`sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
\`\`\`

EOF

    # Security Considerations
    generate_header 2 "Security Considerations"

    cat << EOF
### Authentication & Authorization

- **Authentication Method**: [JWT, OAuth2, etc.]
- **Authorization Model**: [RBAC, ABAC, etc.]
- **Token Management**: [Token lifecycle, refresh strategy]

### Data Protection

- **Encryption at Rest**: [Encryption strategy]
- **Encryption in Transit**: [TLS configuration]
- **Sensitive Data Handling**: [PII, secrets management]

### Security Controls

- **Input Validation**: [Validation strategy]
- **Output Encoding**: [XSS prevention]
- **SQL Injection Prevention**: [Parameterized queries, ORM]
- **CSRF Protection**: [CSRF token strategy]

### Compliance Requirements

- **GDPR**: [Data protection measures]
- **SOC2**: [Security controls]
- **PCI DSS**: [Payment card security - if applicable]

EOF

    # Performance Requirements
    generate_header 2 "Performance Requirements"

    cat << EOF
### Performance Targets

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Response Time | < 200ms | API response time |
| Throughput | 1000 req/sec | Load testing |
| Availability | 99.9% | Uptime monitoring |

### Scalability Considerations

- **Horizontal Scaling**: [Auto-scaling strategy]
- **Database Scaling**: [Read replicas, sharding]
- **Caching Strategy**: [Redis, CDN, application cache]

### Optimization Strategies

- **Database Optimization**: [Query optimization, indexing]
- **Application Optimization**: [Connection pooling, async processing]
- **Infrastructure Optimization**: [Load balancing, CDN]

EOF

    # Testing Strategy
    generate_header 2 "Testing Strategy"

    cat << EOF
### Unit Testing

- **Framework**: [Testing framework]
- **Coverage Target**: 80%+
- **Test Categories**: [Business logic, data access, utilities]

### Integration Testing

- **API Testing**: [REST/GraphQL endpoint testing]
- **Database Testing**: [Database integration tests]
- **External Service Testing**: [Mocked external dependencies]

### End-to-End Testing

- **User Journey Testing**: [Critical user paths]
- **Browser Testing**: [Cross-browser compatibility]
- **Mobile Testing**: [Responsive design testing]

### Performance Testing

- **Load Testing**: [Normal load scenarios]
- **Stress Testing**: [Peak load scenarios]
- **Endurance Testing**: [Long-running scenarios]

EOF

    # Deployment Plan
    generate_header 2 "Deployment Plan"

    cat << EOF
### Deployment Strategy

- **Strategy Type**: [Blue-green, rolling, canary]
- **Rollback Plan**: [Rollback procedures]
- **Health Checks**: [Application health monitoring]

### Environments

| Environment | Purpose | Configuration |
|-------------|---------|---------------|
| Development | Development work | [Config details] |
| Staging | Pre-production testing | [Config details] |
| Production | Live system | [Config details] |

### Infrastructure Requirements

- **Compute**: [CPU, memory requirements]
- **Storage**: [Database, file storage needs]
- **Network**: [Bandwidth, security groups]

EOF

    # Monitoring & Observability
    generate_header 2 "Monitoring & Observability"

    cat << EOF
### Metrics

- **Application Metrics**: [Response time, error rate, throughput]
- **Business Metrics**: [User activity, feature usage]
- **Infrastructure Metrics**: [CPU, memory, disk usage]

### Logging

- **Log Levels**: [DEBUG, INFO, WARN, ERROR]
- **Log Format**: [Structured logging format]
- **Log Retention**: [Retention policy]

### Alerting

- **Critical Alerts**: [System down, high error rate]
- **Warning Alerts**: [Performance degradation]
- **Notification Channels**: [Email, Slack, PagerDuty]

### Dashboards

- **Operational Dashboard**: [System health overview]
- **Business Dashboard**: [Key business metrics]
- **Debug Dashboard**: [Troubleshooting tools]

EOF

    # Related documents
    generate_header 2 "Related Documents"

    cat << EOF
### User Stories

EOF

    if [[ -n "$user_story_issue" ]]; then
        local user_story_title user_story_sanitized
        if [[ "$dry_run" != "true" ]]; then
            user_story_title=$(gh issue view "$user_story_issue" --json title | jq -r '.title' 2>/dev/null || echo "$title")
        else
            user_story_title="$title"
        fi
        user_story_sanitized=$(sanitize_filename "$user_story_title")
        echo "- [User Story for Issue #$user_story_issue](../user-stories/issue-$user_story_issue-$user_story_sanitized.md)"
    else
        echo "- [Related user stories]"
    fi

    cat << EOF

### Architecture Documents

- [System Architecture Overview](../docs/architecture.md)
- [API Design Guidelines](../docs/api-guidelines.md)

### Operational Documents

- [Deployment Guide](../docs/deployment.md)
- [Monitoring Guide](../docs/monitoring.md)

EOF

    # Issue reference
    generate_issue_reference_unified "$issue_number" "$title" "$body" "$issue_url" "$labels"

    # Footer
    cat << EOF
---

**Generated**: $(get_current_date)
**Tool**: $COMMAND_NAME
**Repository**: $(get_repository_name 2>/dev/null || echo "Unknown")
**Workflow**: Unified Issue & Documentation Creation
EOF
}

# Execute main function
main "$@"
