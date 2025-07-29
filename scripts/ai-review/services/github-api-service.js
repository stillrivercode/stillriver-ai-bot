#!/usr/bin/env node

/**
 * GitHub API Service for fetching PR data
 *
 * Fetches pull request changes, file diffs, and metadata
 * for AI analysis
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('child_process');

class GitHubAPIService {
  constructor(options = {}) {
    this.token = options.token || process.env.GITHUB_TOKEN;
    this.repo = options.repo || this.inferRepo();

    if (!this.token) {
      throw new Error('GITHUB_TOKEN is required');
    }
  }

  /**
   * Infer repository from git remote
   */
  inferRepo() {
    try {
      const remoteUrl = execSync('git remote get-url origin', {
        encoding: 'utf8',
      }).trim();

      // Extract owner/repo from various URL formats
      const match = remoteUrl.match(
        /github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/
      );
      if (match) {
        return `${match[1]}/${match[2]}`;
      }

      throw new Error('Could not parse repository from remote URL');
    } catch (error) {
      throw new Error(`Failed to infer repository: ${error.message}`);
    }
  }

  /**
   * Fetch pull request data with files and diffs
   * @param {string|number} prNumber - Pull request number
   * @returns {Object} PR data with files array
   */
  async fetchPullRequest(prNumber) {
    try {
      // Get PR metadata
      const prData = this.callGitHubAPI(
        `/repos/${this.repo}/pulls/${prNumber}`
      );

      // Get PR files with diffs
      const filesData = this.callGitHubAPI(
        `/repos/${this.repo}/pulls/${prNumber}/files`
      );

      return {
        ...prData,
        files: filesData,
      };
    } catch (error) {
      throw new Error(`Failed to fetch PR ${prNumber}: ${error.message}`);
    }
  }

  /**
   * Call GitHub API using gh CLI
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method (default: GET)
   * @param {Object} data - Request body data for POST/PUT requests
   * @returns {Object} Parsed response
   */
  callGitHubAPI(endpoint, method = 'GET', data = null) {
    try {
      let command = `gh api "${endpoint}"`;

      if (method !== 'GET') {
        command += ` --method ${method}`;
      }

      if (data) {
        command += ` --input -`;
      }

      const response = execSync(command, {
        encoding: 'utf8',
        input: data ? JSON.stringify(data) : null,
        env: {
          ...process.env,
          GITHUB_TOKEN: this.token,
        },
      });

      return JSON.parse(response);
    } catch (error) {
      throw new Error(`GitHub API call failed: ${error.message}`);
    }
  }

  /**
   * Filter files for analysis
   * Only analyze files that are likely to benefit from AI review
   * @param {Array} files - Array of file objects
   * @returns {Array} Filtered files
   */
  filterFilesForAnalysis(files) {
    const analysisExtensions = new Set([
      // Programming languages
      '.js',
      '.ts',
      '.jsx',
      '.tsx',
      '.py',
      '.java',
      '.cpp',
      '.c',
      '.cs',
      '.go',
      '.rb',
      '.php',
      '.swift',
      '.kt',
      '.scala',
      '.rs',
      '.sql',
      // Configuration and markup
      '.json',
      '.yaml',
      '.yml',
      '.toml',
      '.ini',
      '.cfg',
      '.conf',
      '.xml',
      '.html',
      '.css',
      '.scss',
      '.sass',
      '.less',
      // Documentation and scripts
      '.md',
      '.txt',
      '.sh',
      '.bash',
      '.zsh',
      '.fish',
      '.ps1',
      '.bat',
      '.cmd',
      // Docker and CI/CD
      '.dockerfile',
      '.dockerignore',
      '.gitignore',
      '.gitattributes',
    ]);

    const skipPatterns = [
      /node_modules\//,
      /\.min\./,
      /dist\//,
      /build\//,
      /coverage\//,
      /\.lock$/,
      /package-lock\.json$/,
      /yarn\.lock$/,
    ];

    return files.filter(file => {
      // Skip deleted files
      if (file.status === 'removed') {
        return false;
      }

      // Skip files that are too large (>1000 lines changed)
      if (file.changes > 1000) {
        console.warn(
          `Skipping ${file.filename}: too many changes (${file.changes})`
        );
        return false;
      }

      // Skip binary files
      if (file.binary) {
        return false;
      }

      // Skip files matching skip patterns
      if (skipPatterns.some(pattern => pattern.test(file.filename))) {
        return false;
      }

      // Include files with analysis-worthy extensions
      const extension = this.getFileExtension(file.filename);
      if (analysisExtensions.has(extension)) {
        return true;
      }

      // Include specific important files without extensions or with special names
      const importantFiles = [
        'Dockerfile',
        'Makefile',
        'Jenkinsfile',
        'Vagrantfile',
        'Rakefile',
        'Guardfile',
        'Procfile',
        'requirements.txt',
        'setup.py',
        'pyproject.toml',
        'Cargo.toml',
        'go.mod',
        'composer.json',
        'Gemfile',
        'CMakeLists.txt',
      ];
      const filename = file.filename.split('/').pop();
      if (importantFiles.includes(filename)) {
        return true;
      }

      // Include files with important base names (case insensitive)
      const baseName = filename.toLowerCase();
      const importantBaseNames = [
        'readme',
        'license',
        'changelog',
        'contributing',
        'claude',
        'gemini',
        'openai',
        'anthropic',
      ];
      if (importantBaseNames.some(name => baseName.startsWith(name))) {
        return true;
      }

      return false;
    });
  }

  /**
   * Get file extension including the dot
   * @param {string} filename - File name
   * @returns {string} Extension with dot
   */
  getFileExtension(filename) {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.substring(lastDot);
  }

  /**
   * Get repository context for AI analysis
   * @returns {Object} Repository context
   */
  async getRepositoryContext() {
    try {
      const repoData = this.callGitHubAPI(`/repos/${this.repo}`);

      // Try to get README content for project context
      let readme = '';
      try {
        const readmeData = this.callGitHubAPI(`/repos/${this.repo}/readme`);
        readme = Buffer.from(readmeData.content, 'base64').toString('utf8');
      } catch {
        // README not found or inaccessible
      }

      return {
        name: repoData.name,
        description: repoData.description,
        language: repoData.language,
        topics: repoData.topics || [],
        readme: readme.substring(0, 2000), // Limit README length
      };
    } catch (error) {
      console.warn(`Failed to get repository context: ${error.message}`);
      return {};
    }
  }

  /**
   * Post comment to a pull request
   * @param {string|number} prNumber - Pull request number
   * @param {string} body - Comment body in markdown
   * @returns {Object} Created comment data
   */
  async postComment(prNumber, body) {
    try {
      const command = `gh pr comment ${prNumber} --body "${body.replace(/"/g, '\\"')}"`;
      const response = execSync(command, {
        encoding: 'utf8',
        env: {
          ...process.env,
          GITHUB_TOKEN: this.token,
        },
      });

      return { success: true, output: response.trim() };
    } catch (error) {
      throw new Error(
        `Failed to post comment to PR ${prNumber}: ${error.message}`
      );
    }
  }

  /**
   * Post review comment with inline suggestions
   * @param {string|number} prNumber - Pull request number
   * @param {string} body - Review body in markdown
   * @param {Array} comments - Array of inline comment objects
   * @returns {Object} Created review data
   */
  async postReview(prNumber, body, comments = []) {
    try {
      // If no inline comments, just post a regular comment
      if (comments.length === 0) {
        return this.postComment(prNumber, body);
      }

      // For inline comments, we need to create review comments
      // This is more complex and requires the GitHub API directly
      const reviewData = {
        body,
        event: 'COMMENT',
        comments: comments.map(comment => ({
          path: comment.path,
          position: comment.position,
          body: comment.body,
        })),
      };

      const response = this.callGitHubAPI(
        `/repos/${this.repo}/pulls/${prNumber}/reviews`,
        'POST',
        reviewData
      );

      return response;
    } catch (error) {
      // Fallback to regular comment if review fails
      console.warn(
        `Review comment failed, falling back to regular comment: ${error.message}`
      );
      return this.postComment(prNumber, body);
    }
  }

  /**
   * Post individual inline comment with suggestion
   * @param {string|number} prNumber - Pull request number
   * @param {Object} comment - Comment object with path, line, and body
   * @returns {Object} Created comment data
   */
  async postInlineComment(prNumber, comment) {
    try {
      // Get PR data to find the commit SHA
      const prData = this.callGitHubAPI(
        `/repos/${this.repo}/pulls/${prNumber}`
      );
      const commitSha = prData.head.sha;

      // Create proper review comment with inline positioning
      const reviewCommentData = {
        body: comment.body,
        commit_id: commitSha,
        path: comment.path,
        line: comment.line,
        side: 'RIGHT', // Comment on the new version of the file
      };

      const response = this.callGitHubAPI(
        `/repos/${this.repo}/pulls/${prNumber}/comments`,
        'POST',
        reviewCommentData
      );

      return { success: true, data: response };
    } catch (error) {
      // Fallback to regular comment if inline comment fails
      console.warn(
        `Inline comment failed for ${comment.path}:${comment.line}, falling back to regular comment: ${error.message}`
      );

      try {
        const fallbackBody = `**File**: \`${comment.path}\` (line ${comment.line})\n\n${comment.body}`;
        return await this.postComment(prNumber, fallbackBody);
      } catch (fallbackError) {
        throw new Error(
          `Failed to post inline comment and fallback to PR ${prNumber}: ${fallbackError.message}`
        );
      }
    }
  }

  /**
   * Extract coding standards from repository
   * Looks for common configuration files
   * @returns {string} Coding standards summary
   */
  async getCodingStandards() {
    const standardsFiles = [
      '.eslintrc.js',
      '.eslintrc.json',
      '.prettierrc',
      'pyproject.toml',
      'setup.cfg',
      'tslint.json',
      'tsconfig.json',
    ];

    const standards = [];

    for (const file of standardsFiles) {
      try {
        const fileData = this.callGitHubAPI(
          `/repos/${this.repo}/contents/${file}`
        );
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
        const _content = Buffer.from(fileData.content, 'base64').toString(
          'utf8'
        );

        // Extract key configuration points
        if (file.includes('eslint')) {
          standards.push(
            'ESLint configuration found - follow JavaScript/TypeScript linting rules'
          );
        } else if (file.includes('prettier')) {
          standards.push(
            'Prettier configuration found - follow code formatting rules'
          );
        } else if (file.includes('typescript') || file.includes('tsconfig')) {
          standards.push(
            'TypeScript configuration found - follow type safety practices'
          );
        } else if (file.includes('python') || file.includes('pyproject')) {
          standards.push(
            'Python configuration found - follow PEP 8 style guidelines'
          );
        }
      } catch {
        // File not found - continue
      }
    }

    return standards.length > 0
      ? `Repository coding standards:\n${standards.join('\n')}`
      : '';
  }
}

module.exports = GitHubAPIService;
