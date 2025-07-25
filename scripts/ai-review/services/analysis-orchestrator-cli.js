#!/usr/bin/env node

/**
 * Analysis Orchestrator CLI
 *
 * Command line interface for the analysis orchestrator
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs').promises;
const AnalysisOrchestrator = require('./analysis-orchestrator');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    prNumber: null,
    model: 'anthropic/claude-3.5-sonnet',
    output: null,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    // eslint-disable-next-line security/detect-object-injection
    const arg = args[i];
    // eslint-disable-next-line security/detect-object-injection
    const nextArg = args[i + 1];

    switch (arg) {
      case '--pr-number':
        if (nextArg) {
          parsed.prNumber = nextArg;
          i++;
        }
        break;
      case '--model':
        if (nextArg) {
          parsed.model = nextArg;
          i++;
        }
        break;
      case '--output':
        if (nextArg) {
          parsed.output = nextArg;
          i++;
        }
        break;
      case '--help':
      case '-h':
        parsed.help = true;
        break;
      default:
        if (!parsed.prNumber && /^\d+$/.test(arg)) {
          parsed.prNumber = arg;
        }
        break;
    }
  }

  return parsed;
}

// Show help information
function showHelp() {
  console.log(`
AI Analysis Orchestrator CLI

Usage:
  node analysis-orchestrator-cli.js [options] <pr-number>

Options:
  --pr-number <number>    Pull request number to analyze
  --model <model>         AI model to use (default: anthropic/claude-3.5-sonnet)
  --output <file>         Output file for suggestions JSON
  --help, -h             Show this help message

Examples:
  node analysis-orchestrator-cli.js 123
  node analysis-orchestrator-cli.js --pr-number 123 --model google/gemini-2.5-pro
  node analysis-orchestrator-cli.js 123 --output suggestions.json

Environment Variables:
  OPENROUTER_API_KEY     Required - OpenRouter API key
  GITHUB_TOKEN          Required - GitHub token for API access
  AI_MODEL              Optional - Default AI model to use
`);
}

// Main execution function
async function main() {
  try {
    const args = parseArgs();

    if (args.help) {
      showHelp();
      process.exit(0);
    }

    if (!args.prNumber) {
      console.error('❌ Error: PR number is required');
      showHelp();
      process.exit(1);
    }

    // Validate environment variables
    if (!process.env.OPENROUTER_API_KEY) {
      console.error(
        '❌ Error: OPENROUTER_API_KEY environment variable is required'
      );
      process.exit(1);
    }

    if (!process.env.GITHUB_TOKEN) {
      console.error('❌ Error: GITHUB_TOKEN environment variable is required');
      process.exit(1);
    }

    // Use environment model if available
    const model = process.env.AI_MODEL || args.model;

    console.log(`🚀 Starting AI analysis for PR #${args.prNumber}`);
    console.log(`🤖 Using model: ${model}`);

    // Create orchestrator and run analysis
    const orchestrator = new AnalysisOrchestrator({
      model,
      apiKey: process.env.OPENROUTER_API_KEY,
      token: process.env.GITHUB_TOKEN,
    });

    const suggestions = await orchestrator.analyzePullRequest(args.prNumber);

    // Generate statistics
    const stats = orchestrator.generateStatistics(suggestions);

    console.log('\n📊 Analysis Results:');
    console.log(`   Total suggestions: ${stats.total}`);
    console.log(`   Very High confidence: ${stats.by_confidence.very_high}`);
    console.log(`   High confidence: ${stats.by_confidence.high}`);
    console.log(`   Medium confidence: ${stats.by_confidence.medium}`);
    console.log(`   Low confidence: ${stats.by_confidence.low}`);

    if (stats.total > 0) {
      console.log('\n📂 By Category:');
      for (const [category, count] of Object.entries(stats.by_category)) {
        console.log(`   ${category}: ${count}`);
      }

      console.log('\n⚠️  By Severity:');
      for (const [severity, count] of Object.entries(stats.by_severity)) {
        console.log(`   ${severity}: ${count}`);
      }
    }

    // Output suggestions
    if (args.output) {
      // Validate output path to prevent directory traversal
      const outputPath = args.output.replace(/\.\./g, ''); // Remove .. sequences
      if (outputPath !== args.output) {
        throw new Error('Invalid output path: directory traversal not allowed');
      }

      // eslint-disable-next-line security/detect-non-literal-fs-filename
      await fs.writeFile(outputPath, JSON.stringify(suggestions, null, 2));
      console.log(`\n💾 Suggestions saved to: ${outputPath}`);
    } else {
      // Output to stdout for shell script consumption
      console.log('\n📄 Generated suggestions:');
      console.log(JSON.stringify(suggestions, null, 2));
    }

    console.log('\n✅ Analysis completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);

    if (process.env.DEBUG) {
      console.error('Stack trace:', error.stack);
    }

    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run main function
if (require.main === module) {
  main();
}

module.exports = { parseArgs, showHelp, main };
