import { getReview } from '../src/review';
import * as openrouter from '../src/openrouter';
import * as fs from 'fs';
import * as core from '@actions/core';

jest.mock('../src/openrouter');
jest.mock('@actions/core');

describe('getReview', () => {
  const callOpenRouterMock = openrouter.callOpenRouter as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call openrouter with a well-formed prompt', async () => {
    const changedFiles = [{ filename: 'src/main.ts', patch: '...' }];
    await getReview(
      'api-key',
      changedFiles,
      'model',
      1024,
      0.7,
      30000,
      [],
      'Test PR',
      'PR Body',
      'full',
      3
    );

    expect(callOpenRouterMock).toHaveBeenCalled();
    const prompt = callOpenRouterMock.mock.calls[0][2];
    expect(prompt).toContain('**PR Title:** Test PR');
    expect(prompt).toContain('**PR Description:**\nPR Body');
    expect(prompt).toContain('File: src/main.ts');
  });

  it('should filter files based on exclude patterns', async () => {
    const changedFiles = [
      { filename: 'src/main.ts', patch: '...' },
      { filename: 'package.json', patch: '...' },
    ];
    await getReview(
      'api-key',
      changedFiles,
      'model',
      1024,
      0.7,
      30000,
      ['*.json'],
      'Test PR',
      'PR Body',
      'full',
      3
    );

    const prompt = callOpenRouterMock.mock.calls[0][2];
    expect(prompt).toContain('src/main.ts');
    expect(prompt).not.toContain('package.json');
  });

  it('should return null if all files are filtered', async () => {
    const changedFiles = [{ filename: 'package.json', patch: '...' }];
    const result = await getReview(
      'api-key',
      changedFiles,
      'model',
      1024,
      0.7,
      30000,
      ['*.json'],
      'Test PR',
      'PR Body',
      'full',
      3
    );
    expect(result).toBeNull();
    expect(callOpenRouterMock).not.toHaveBeenCalled();
  });

  it('should include security focus for security review type', async () => {
    const changedFiles = [{ filename: 'src/main.ts', patch: '...' }];
    await getReview(
      'api-key',
      changedFiles,
      'model',
      1024,
      0.7,
      30000,
      [],
      'Test PR',
      'PR Body',
      'security',
      3
    );

    expect(callOpenRouterMock).toHaveBeenCalled();
    const prompt = callOpenRouterMock.mock.calls[0][2];
    expect(prompt).toContain('Identify any security vulnerabilities');
  });

  it('should include performance focus for performance review type', async () => {
    const changedFiles = [{ filename: 'src/main.ts', patch: '...' }];
    await getReview(
      'api-key',
      changedFiles,
      'model',
      1024,
      0.7,
      30000,
      [],
      'Test PR',
      'PR Body',
      'performance',
      3
    );

    expect(callOpenRouterMock).toHaveBeenCalled();
    const prompt = callOpenRouterMock.mock.calls[0][2];
    expect(prompt).toContain('Identify potential performance issues');
  });

  it('should accept custom rules parameter without throwing', async () => {
    const changedFiles = [{ filename: 'src/main.ts', patch: '...' }];

    // This test verifies the function accepts the new parameter
    await getReview(
      'api-key',
      changedFiles,
      'model',
      1024,
      0.7,
      30000,
      [],
      'Test PR',
      'PR Body',
      'security',
      3,
      undefined // custom rules path
    );

    expect(callOpenRouterMock).toHaveBeenCalled();
  });

  it('should work with empty custom rules path', async () => {
    const changedFiles = [{ filename: 'src/main.ts', patch: '...' }];

    await getReview(
      'api-key',
      changedFiles,
      'model',
      1024,
      0.7,
      30000,
      [],
      'Test PR',
      'PR Body',
      'security',
      3,
      '' // empty custom rules path
    );

    expect(callOpenRouterMock).toHaveBeenCalled();
    const prompt = callOpenRouterMock.mock.calls[0][2];
    expect(prompt).toContain('Security Review'); // Should use base security config
  });

  describe('Custom Review Rules Integration', () => {
    it('should throw InvalidCustomRulesError for nonexistent custom rules file', async () => {
      const changedFiles = [{ filename: 'src/main.ts', patch: '...' }];

      // This should now throw an InvalidCustomRulesError
      await expect(
        getReview(
          'api-key',
          changedFiles,
          'model',
          1024,
          0.7,
          30000,
          [],
          'Test PR',
          'PR Body',
          'security',
          3,
          'nonexistent-file.json'
        )
      ).rejects.toThrow('Custom review rules file does not exist');
    });

    it('should work with existing custom rules example file', async () => {
      const changedFiles = [{ filename: 'src/main.ts', patch: '...' }];

      // Test with the actual example file we created
      await getReview(
        'api-key',
        changedFiles,
        'model',
        1024,
        0.7,
        30000,
        [],
        'Test PR',
        'PR Body',
        'security',
        3,
        './examples/custom-rules-typescript-react.json'
      );

      expect(callOpenRouterMock).toHaveBeenCalled();
      const prompt = callOpenRouterMock.mock.calls[0][2];
      expect(prompt).toContain('TypeScript React Application Review');
    });

    it('should warn and fallback when YAML file is provided', async () => {
      const changedFiles = [{ filename: 'src/main.ts', patch: '...' }];

      // Create a test YAML file
      const yamlPath = './test-rules.yaml';
      fs.writeFileSync(
        yamlPath,
        `title: Test YAML Rules
description: This should not be parsed
guidelines:
  - Test guideline`
      );

      try {
        await getReview(
          'api-key',
          changedFiles,
          'model',
          1024,
          0.7,
          30000,
          [],
          'Test PR',
          'PR Body',
          'security',
          3,
          yamlPath
        );

        expect(callOpenRouterMock).toHaveBeenCalled();
        const prompt = callOpenRouterMock.mock.calls[0][2];
        expect(prompt).toContain('Security Review'); // Should use base config
        expect(core.warning).toHaveBeenCalledWith(
          expect.stringContaining(
            'YAML custom rules are not currently supported'
          )
        );
      } finally {
        // Clean up
        if (fs.existsSync(yamlPath)) {
          fs.unlinkSync(yamlPath);
        }
      }
    });
  });

  describe('diff truncation', () => {
    it('should truncate very large diffs', async () => {
      const largeFiles = [
        {
          filename: 'large-file.js',
          patch: 'x'.repeat(10000), // 10k character diff
        },
      ];

      await getReview(
        'test-api-key',
        largeFiles,
        'test-model',
        2000, // max tokens
        0.5,
        30000,
        [],
        'Test PR',
        'Test Description',
        'comprehensive',
        3
      );

      // Should warn about truncation
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining(
          'Truncated 1 file(s) using smart allocation to fit within token limits'
        )
      );

      // Check that the diff was truncated in the prompt
      const prompt = callOpenRouterMock.mock.calls[0][2];
      expect(prompt).toContain('[TRUNCATED - diff too large]');
    });

    it('should handle multiple large files by truncating appropriately', async () => {
      const largeFiles = Array(5)
        .fill(null)
        .map((_, i) => ({
          filename: `file-${i}.js`,
          patch: 'x'.repeat(5000), // 5k chars each
        }));

      await getReview(
        'test-api-key',
        largeFiles,
        'test-model',
        3000, // max tokens
        0.5,
        30000,
        [],
        'Test PR',
        'Test Description',
        'comprehensive',
        3
      );

      // Should warn about truncation
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining(
          'Truncated 5 file(s) using smart allocation to fit within token limits'
        )
      );
    });

    it('should not truncate small diffs', async () => {
      const smallFiles = [
        {
          filename: 'small-file.js',
          patch: 'small change',
        },
      ];

      await getReview(
        'test-api-key',
        smallFiles,
        'test-model',
        2000,
        0.5,
        30000,
        [],
        'Test PR',
        'Test Description',
        'comprehensive',
        3
      );

      // Should not warn about truncation
      expect(core.warning).not.toHaveBeenCalledWith(
        expect.stringContaining('Truncated')
      );

      // Check that the diff was not truncated
      const prompt = callOpenRouterMock.mock.calls[0][2];
      expect(prompt).not.toContain('[TRUNCATED');
      expect(prompt).toContain('small change');
    });
  });
});
