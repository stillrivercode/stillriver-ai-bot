# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](httpshttps://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.11] - 2025-07-25

### Added
- Automated CHANGELOG.md update during release workflow
- Enhanced build and tagging process for version 1.0.11

### Changed
- Automatic version bump and distribution file regeneration for release
- Updated compiled JavaScript bundle in dist/ directory

### Technical
- Build from commit: ffd27dd9a4023f0520c18b1e27133f1a58211de6
- Build date: 2025-07-25
- Node.js version: 20

## [1.0.10] - 2025-07-23

### Added
- Automated CHANGELOG.md update during release workflow
- Enhanced build and tagging process for version 1.0.10

### Changed
- Automatic version bump and distribution file regeneration for release
- Updated compiled JavaScript bundle in dist/ directory

### Technical
- Build from commit: 78d86c1e802507f8ac6729b631f3ebbb7f622114
- Build date: 2025-07-23
- Node.js version: 20

## [1.1.3] - 2025-06-30

### Added
- `.gitignore` to exclude `node_modules`, `.env`, and other generated files.
- User story and technical specification for a new user management feature.
- `.eslintrc.js` for JavaScript linting.
- `.pre-commit-config.yaml` to enable pre-commit hooks for code quality.

### Changed
- Consolidated issue-related documents under a single issue directory (`issue-1`).
- Updated `scripts/setup-labels.sh` with improved error handling and more robust label creation logic.
- Updated `shared-commands/setup.sh` with clearer usage examples and command descriptions.
- Bumped package version to 1.1.3.
- Updated GitHub workflow YAML files for better syntax and consistency.

### Removed
- `release-generator.yml` workflow, which is no longer needed.

### Fixed
- Closed duplicate issue #2.
