#!/usr/bin/env python3
"""
Security Results Formatter
Converts raw security scan results (JSON) into readable markdown tables/charts
"""

import json
import os


def format_bandit_results(json_file):
    """Format Bandit JSON results into a readable markdown table"""
    if not os.path.exists(json_file):
        return "No Bandit results found."

    try:
        with open(json_file) as f:
            data = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return "Invalid or missing Bandit results file."

    if not data.get("results"):
        return "✅ **No security issues found by Bandit**"

    results = data["results"]

    # Summary statistics
    severity_counts = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    confidence_counts = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}

    for result in results:
        severity = result.get("issue_severity", "UNKNOWN")
        confidence = result.get("issue_confidence", "UNKNOWN")
        if severity in severity_counts:
            severity_counts[severity] += 1
        if confidence in confidence_counts:
            confidence_counts[confidence] += 1

    total_issues = len(results)

    markdown = f"""## 🔍 Bandit Security Scan Results

### Summary
- **Total Issues**: {total_issues}
- **High Severity**: {severity_counts['HIGH']} issues
- **Medium Severity**: {severity_counts['MEDIUM']} issues
- **Low Severity**: {severity_counts['LOW']} issues

### Severity Distribution
```
High   │{'█' * severity_counts['HIGH']}{'░' * (10 - min(10, severity_counts['HIGH']))} │ {severity_counts['HIGH']}
Medium │{'█' * severity_counts['MEDIUM']}{'░' * (10 - min(10, severity_counts['MEDIUM']))} │ {severity_counts['MEDIUM']}
Low    │{'█' * severity_counts['LOW']}{'░' * (10 - min(10, severity_counts['LOW']))} │ {severity_counts['LOW']}
```

### Issues Found

| Severity | Confidence | Test ID | File | Line | Issue |
|----------|------------|---------|------|------|-------|
"""

    # Sort by severity (HIGH first)
    severity_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    sorted_results = sorted(
        results,
        key=lambda x: (
            severity_order.get(x.get("issue_severity", "LOW"), 3),
            -x.get("line_number", 0),
        ),
    )

    for result in sorted_results:
        severity = result.get("issue_severity", "UNKNOWN")
        confidence = result.get("issue_confidence", "UNKNOWN")
        test_id = result.get("test_id", "N/A")
        filename = result.get("filename", "N/A")
        line_number = result.get("line_number", "N/A")
        issue_text = result.get("issue_text", "N/A").replace("\n", " ").strip()

        # Truncate long filenames
        if len(filename) > 30:
            filename = "..." + filename[-27:]

        # Truncate long issue text
        if len(issue_text) > 60:
            issue_text = issue_text[:57] + "..."

        # Severity emoji
        severity_emoji = {"HIGH": "🚨", "MEDIUM": "⚠️", "LOW": "💡"}.get(severity, "❓")

        markdown += f"| {severity_emoji} {severity} | {confidence} | {test_id} | `{filename}` | {line_number} | {issue_text} |\n"

    return markdown


def format_safety_results(json_file):
    """Format Safety JSON results into a readable markdown table"""
    if not os.path.exists(json_file):
        return "No Safety results found."

    try:
        with open(json_file) as f:
            data = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return "Invalid or missing Safety results file."

    if not data:
        return "✅ **No vulnerable dependencies found by Safety**"

    markdown = f"""## 🛡️ Safety Dependency Check Results

### Summary
- **Total Vulnerabilities**: {len(data)}

### Vulnerable Dependencies

| Package | Version | Vulnerability | CVE | Severity |
|---------|---------|---------------|-----|----------|
"""

    for vuln in data:
        package = vuln.get("package", "N/A")
        version = vuln.get("installed_version", "N/A")
        vuln_text = vuln.get("vulnerability", "N/A").replace("\n", " ").strip()
        cve = vuln.get("vulnerability_id", "N/A")

        # Estimate severity from vulnerability text
        severity = "MEDIUM"
        if any(
            word in vuln_text.lower()
            for word in ["critical", "remote code execution", "rce"]
        ):
            severity = "HIGH"
        elif any(word in vuln_text.lower() for word in ["low", "minor"]):
            severity = "LOW"

        severity_emoji = {"HIGH": "🚨", "MEDIUM": "⚠️", "LOW": "💡"}.get(severity, "❓")

        if len(vuln_text) > 50:
            vuln_text = vuln_text[:47] + "..."

        markdown += f"| `{package}` | {version} | {vuln_text} | {cve} | {severity_emoji} {severity} |\n"

    return markdown


def format_semgrep_results(json_file):
    """Format Semgrep JSON results into a readable markdown table"""
    if not os.path.exists(json_file):
        return "No Semgrep results found."

    try:
        with open(json_file) as f:
            data = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return "Invalid or missing Semgrep results file."

    results = data.get("results", [])

    if not results:
        return "✅ **No security issues found by Semgrep**"

    # Count by severity
    severity_counts = {"ERROR": 0, "WARNING": 0, "INFO": 0}
    for result in results:
        severity = result.get("extra", {}).get("severity", "INFO").upper()
        if severity in severity_counts:
            severity_counts[severity] += 1

    total_issues = len(results)

    markdown = f"""## ⚡ Semgrep Security Scan Results

### Summary
- **Total Issues**: {total_issues}
- **Errors**: {severity_counts['ERROR']} issues
- **Warnings**: {severity_counts['WARNING']} issues
- **Info**: {severity_counts['INFO']} issues

### Issues Found

| Severity | Rule | File | Line | Message |
|----------|------|------|------|---------|
"""

    # Sort by severity
    severity_order = {"ERROR": 0, "WARNING": 1, "INFO": 2}
    sorted_results = sorted(
        results,
        key=lambda x: (
            severity_order.get(x.get("extra", {}).get("severity", "INFO").upper(), 3),
            x.get("path", ""),
            x.get("start", {}).get("line", 0),
        ),
    )

    for result in sorted_results:
        severity = result.get("extra", {}).get("severity", "INFO").upper()
        rule_id = result.get("check_id", "N/A")
        path = result.get("path", "N/A")
        line = result.get("start", {}).get("line", "N/A")
        message = (
            result.get("extra", {}).get("message", "N/A").replace("\n", " ").strip()
        )

        # Truncate long paths
        if len(path) > 30:
            path = "..." + path[-27:]

        # Truncate long messages
        if len(message) > 60:
            message = message[:57] + "..."

        # Severity emoji
        severity_emoji = {"ERROR": "🚨", "WARNING": "⚠️", "INFO": "💡"}.get(severity, "❓")

        markdown += f"| {severity_emoji} {severity} | `{rule_id}` | `{path}` | {line} | {message} |\n"

    return markdown


def format_npm_audit_results(json_file):
    """Format npm audit JSON results into a readable markdown table"""
    if not os.path.exists(json_file):
        return "No npm audit results found."

    try:
        with open(json_file) as f:
            data = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return "Invalid or missing npm audit results file."

    vulnerabilities = data.get("vulnerabilities", {})

    if not vulnerabilities:
        return "✅ **No vulnerabilities found by npm audit**"

    # Count by severity
    severity_counts = {"critical": 0, "high": 0, "moderate": 0, "low": 0}
    total_vulns = 0

    for _package, vuln_data in vulnerabilities.items():
        severity = vuln_data.get("severity", "low")
        if severity in severity_counts:
            severity_counts[severity] += 1
        total_vulns += 1

    markdown = f"""## 📦 NPM Audit Results

### Summary
- **Total Vulnerabilities**: {total_vulns}
- **Critical**: {severity_counts['critical']} packages
- **High**: {severity_counts['high']} packages
- **Moderate**: {severity_counts['moderate']} packages
- **Low**: {severity_counts['low']} packages

### Vulnerable Packages

| Severity | Package | Via | More Info |
|----------|---------|-----|-----------|
"""

    # Sort by severity
    severity_order = {"critical": 0, "high": 1, "moderate": 2, "low": 3}
    sorted_vulns = sorted(
        vulnerabilities.items(),
        key=lambda x: (severity_order.get(x[1].get("severity", "low"), 4), x[0]),
    )

    for package, vuln_data in sorted_vulns:
        severity = vuln_data.get("severity", "low")
        via = ", ".join(vuln_data.get("via", [])[:3])  # Limit to first 3
        if len(vuln_data.get("via", [])) > 3:
            via += "..."

        more_info = vuln_data.get("url", "N/A")

        # Severity emoji
        severity_emoji = {
            "critical": "🚨",
            "high": "⚠️",
            "moderate": "💡",
            "low": "📝",
        }.get(severity, "❓")

        markdown += f"| {severity_emoji} {severity.title()} | `{package}` | {via} | {more_info} |\n"

    return markdown


def main():
    """Main function to format all security results"""
    output_file = "security-report.md"

    # Start with header
    with open(output_file, "w") as f:
        f.write("# 🔒 Security Review Report\n\n")
        f.write("This report contains the results of automated security scans.\n\n")

    # Format each tool's results
    formatters = [
        ("bandit-results.json", format_bandit_results),
        ("safety-results.json", format_safety_results),
        ("semgrep-results.json", format_semgrep_results),
        ("npm-audit-results.json", format_npm_audit_results),
    ]

    with open(output_file, "a") as f:
        for json_file, formatter in formatters:
            result = formatter(json_file)
            f.write(result + "\n\n")

        f.write("---\n\n")
        f.write("*Report generated automatically by security review workflow*\n")

    print(f"Security report generated: {output_file}")


if __name__ == "__main__":
    main()
