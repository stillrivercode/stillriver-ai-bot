import * as core from '@actions/core';
import { callOpenRouter } from './openrouter';
import { Minimatch } from 'minimatch';
import * as fs from 'fs';
import { InvalidCustomRulesError } from './errors';

interface ReviewConfig {
  title: string;
  description: string;
  guidelines: string[];
  focusAreas: string[];
  examples?: string[];
}

interface CustomReviewRules {
  title?: string;
  description?: string;
  guidelines?: string[];
  focusAreas?: string[];
  examples?: string[];
  additionalInstructions?: string;
}

interface PromptTemplate {
  intro: string;
  prSection: string;
  changedFilesSection: string;
  guidelinesSection: string;
  outro?: string;
}

const REVIEW_CONFIGS: Record<string, ReviewConfig> = {
  security: {
    title: 'Security Review',
    description:
      'Focus on identifying security vulnerabilities and potential threats',
    guidelines: [
      'Identify any security vulnerabilities',
      'Check for proper input validation and sanitization',
      'Look for authentication and authorization issues',
      'Review error handling for information leakage',
      'Examine dependency usage for known vulnerabilities',
    ],
    focusAreas: [
      'SQL injection risks',
      'XSS vulnerabilities',
      'Authentication bypasses',
      'Sensitive data exposure',
      'Cryptographic issues',
    ],
  },
  performance: {
    title: 'Performance Review',
    description:
      'Focus on identifying performance bottlenecks and optimization opportunities',
    guidelines: [
      'Identify potential performance issues',
      'Look for inefficient algorithms or data structures',
      'Check for unnecessary database queries or API calls',
      'Review memory usage patterns',
      'Examine asynchronous operation handling',
    ],
    focusAreas: [
      'Algorithm complexity',
      'Database query optimization',
      'Memory management',
      'Caching opportunities',
      'Concurrent processing',
    ],
  },
  comprehensive: {
    title: 'Comprehensive Code Review',
    description: 'Thorough review covering all aspects of code quality',
    guidelines: [
      'Point out potential bugs and logical errors',
      'Suggest improvements to code structure and readability',
      'Identify security vulnerabilities',
      'Comment on code style and best practices',
      'Review error handling and edge cases',
      'Assess maintainability and documentation',
    ],
    focusAreas: [
      'Code correctness',
      'Security considerations',
      'Performance implications',
      'Maintainability',
      'Best practices adherence',
    ],
  },
};

const PROMPT_TEMPLATE: PromptTemplate = {
  intro: 'Please conduct a {reviewType} for the following pull request.',
  prSection: `
**PR Title:** {prTitle}
**PR Description:**
{prBody}`,
  changedFilesSection: `
**Changed Files:**
{diffs}`,
  guidelinesSection: `
**Review Guidelines:**
{guidelines}

**Focus Areas:**
{focusAreas}`,
  outro: `
Please provide specific, actionable feedback with line numbers where applicable.`,
};

async function loadCustomReviewRules(
  customRulesPath?: string
): Promise<CustomReviewRules | null> {
  if (!customRulesPath || customRulesPath.trim() === '') {
    return null;
  }

  // Check if file exists before attempting to read it
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (!fs.existsSync(customRulesPath)) {
    throw new InvalidCustomRulesError(
      `Custom review rules file does not exist: ${customRulesPath}`,
      customRulesPath
    );
  }

  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const rulesContent = await fs.promises.readFile(customRulesPath, 'utf8');

    // Currently only JSON format is supported
    let customRules: CustomReviewRules;

    if (customRulesPath.endsWith('.yml') || customRulesPath.endsWith('.yaml')) {
      // YAML support would require adding js-yaml or similar dependency
      core.warning(
        `YAML custom rules are not currently supported. Please convert '${customRulesPath}' to JSON format.`
      );
      return null;
    }

    // Parse as JSON
    try {
      customRules = JSON.parse(rulesContent);
    } catch (parseError) {
      throw new InvalidCustomRulesError(
        `Failed to parse custom rules file as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        customRulesPath
      );
    }

    // Validate the structure
    if (typeof customRules !== 'object' || customRules === null) {
      core.warning('Custom review rules must be a valid JSON object');
      return null;
    }

    core.info(`Loaded custom review rules from: ${customRulesPath}`);
    return customRules;
  } catch (error) {
    core.warning(
      `Failed to load custom review rules from ${customRulesPath}: ${error}`
    );
    return null;
  }
}

function mergeCustomRules(
  baseConfig: ReviewConfig,
  customRules: CustomReviewRules
): ReviewConfig {
  return {
    title: customRules.title || baseConfig.title,
    description: customRules.description || baseConfig.description,
    guidelines:
      customRules.guidelines && customRules.guidelines.length > 0
        ? customRules.guidelines
        : baseConfig.guidelines,
    focusAreas:
      customRules.focusAreas && customRules.focusAreas.length > 0
        ? customRules.focusAreas
        : baseConfig.focusAreas,
    examples: customRules.examples || baseConfig.examples,
  };
}

function buildPrompt(
  reviewType: string,
  prTitle: string,
  prBody: string,
  diffs: string,
  customRules?: CustomReviewRules
): string {
  // Get base review configuration, fallback to comprehensive if type not found
  // eslint-disable-next-line security/detect-object-injection
  let config = REVIEW_CONFIGS[reviewType] || REVIEW_CONFIGS.comprehensive;

  // Merge with custom rules if provided
  if (customRules) {
    config = mergeCustomRules(config, customRules);
  }

  // Format guidelines and focus areas as bullet points
  const guidelines = config.guidelines
    .map(guideline => `- ${guideline}`)
    .join('\n');
  const focusAreas = config.focusAreas.map(area => `- ${area}`).join('\n');

  // Build prompt sections
  const sections = [
    PROMPT_TEMPLATE.intro.replace('{reviewType}', config.title),
    PROMPT_TEMPLATE.prSection
      .replace('{prTitle}', prTitle)
      .replace('{prBody}', prBody),
    PROMPT_TEMPLATE.changedFilesSection.replace('{diffs}', diffs),
    PROMPT_TEMPLATE.guidelinesSection
      .replace('{guidelines}', guidelines)
      .replace('{focusAreas}', focusAreas),
  ];

  // Add custom additional instructions if provided
  if (customRules?.additionalInstructions) {
    sections.push(
      `\n**Additional Instructions:**\n${customRules.additionalInstructions}`
    );
  }

  // Add examples if available
  if (config.examples && config.examples.length > 0) {
    const examplesList = config.examples
      .map(example => `- ${example}`)
      .join('\n');
    sections.push(`\n**Examples:**\n${examplesList}`);
  }

  if (PROMPT_TEMPLATE.outro) {
    sections.push(PROMPT_TEMPLATE.outro);
  }

  return sections.join('\n');
}

/**
 * Truncates a diff if it exceeds the maximum character limit
 * Preserves the beginning and end of the diff for context
 */
function truncateDiff(diff: string, maxChars: number): string {
  if (diff.length <= maxChars) {
    return diff;
  }

  // Reserve characters for the truncation message
  const truncationMessage = '\n... [TRUNCATED - diff too large] ...\n';
  const availableChars = maxChars - truncationMessage.length;

  // Split available characters between start and end
  const charsPerSide = Math.floor(availableChars / 2);

  const start = diff.substring(0, charsPerSide);
  const end = diff.substring(diff.length - charsPerSide);

  return start + truncationMessage + end;
}

export async function getReview(
  openrouterApiKey: string,
  changedFiles: { filename: string; patch: string }[],
  model: string,
  maxTokens: number,
  temperature: number,
  timeout: number,
  excludePatterns: string[],
  prTitle: string,
  prBody: string,
  reviewType: string,
  retries: number,
  customRulesPath?: string
): Promise<string | null> {
  // Load custom review rules if path is provided
  const customRules = await loadCustomReviewRules(customRulesPath);

  // Pre-process exclude patterns for better performance
  const minimatchers = excludePatterns.map(pattern => new Minimatch(pattern));

  const filteredFiles = changedFiles.filter(
    file => !minimatchers.some(matcher => matcher.match(file.filename))
  );

  if (filteredFiles.length === 0) {
    core.info('No files to review after applying exclusion patterns.');
    return null;
  }

  // Smart allocation: give small files what they need, large files more space
  const reservedTokens = 2000;
  const availableTokens = Math.max(maxTokens - reservedTokens, 2000);
  const maxCharsTotal = availableTokens * 3.5; // More conservative char-to-token ratio

  // Calculate actual file sizes and smart allocation
  const fileSizes = filteredFiles.map(file => file.patch.length);
  const totalActualSize = fileSizes.reduce((sum, size) => sum + size, 0);

  // If total content fits comfortably, don't truncate anything
  if (totalActualSize <= maxCharsTotal * 0.8) {
    core.info(
      `Total content (${totalActualSize} chars) fits within limits. No truncation needed.`
    );
  } else {
    core.info(
      `Content requires smart allocation. Total: ${totalActualSize} chars, Available: ${Math.floor(maxCharsTotal)} chars`
    );
  }

  // Process diffs with smart allocation
  const processedDiffs = filteredFiles
    .map((file, index) => {
      // eslint-disable-next-line security/detect-object-injection
      const originalSize = fileSizes[index];
      let allowedSize: number;

      if (totalActualSize <= maxCharsTotal * 0.8) {
        // No truncation needed - use original size
        allowedSize = originalSize;
      } else {
        // Smart allocation: proportional to file size with minimum guarantees
        const minCharsPerFile = 1500; // Reduced minimum for better distribution
        const baseAllocation = Math.max(
          minCharsPerFile,
          Math.floor(maxCharsTotal / filteredFiles.length)
        );

        // Give proportionally more space to larger files
        const proportionalSize = Math.floor(
          (originalSize / totalActualSize) * maxCharsTotal
        );
        allowedSize = Math.max(
          baseAllocation,
          Math.min(proportionalSize, originalSize)
        );

        // Ensure we don't exceed total budget
        const maxAllowedSize = Math.floor(maxCharsTotal * 0.9); // Leave 10% buffer
        allowedSize = Math.min(allowedSize, maxAllowedSize);
      }

      const truncatedPatch = truncateDiff(file.patch, allowedSize);
      const wasTruncated = truncatedPatch.length < file.patch.length;

      if (wasTruncated) {
        core.info(
          `File ${file.filename}: ${originalSize} → ${truncatedPatch.length} chars (${Math.round((truncatedPatch.length / originalSize) * 100)}%)`
        );
      }

      return `File: ${file.filename}
\`\`\`diff
${truncatedPatch}
\`\`\``;
    })
    .join('\n\n');

  // Count truncated files from the processing above
  let truncatedCount = 0;
  filteredFiles.forEach((file, index) => {
    // eslint-disable-next-line security/detect-object-injection
    const originalSize = fileSizes[index];
    let allowedSize: number;

    if (totalActualSize <= maxCharsTotal * 0.8) {
      allowedSize = originalSize;
    } else {
      const minCharsPerFile = 1500;
      const baseAllocation = Math.max(
        minCharsPerFile,
        Math.floor(maxCharsTotal / filteredFiles.length)
      );
      const proportionalSize = Math.floor(
        (originalSize / totalActualSize) * maxCharsTotal
      );
      allowedSize = Math.max(
        baseAllocation,
        Math.min(proportionalSize, originalSize)
      );
      const maxAllowedSize = Math.floor(maxCharsTotal * 0.9);
      allowedSize = Math.min(allowedSize, maxAllowedSize);
    }

    if (originalSize > allowedSize) {
      truncatedCount++;
    }
  });

  if (truncatedCount > 0) {
    core.warning(
      `Truncated ${truncatedCount} file(s) using smart allocation to fit within token limits.`
    );
  }

  const prompt = buildPrompt(
    reviewType,
    prTitle,
    prBody,
    processedDiffs,
    customRules ?? undefined
  );

  const openrouterUrl = core.getInput('openrouter_url');
  return callOpenRouter(
    openrouterApiKey,
    model,
    prompt,
    maxTokens,
    temperature,
    timeout,
    retries,
    openrouterUrl
  );
}
