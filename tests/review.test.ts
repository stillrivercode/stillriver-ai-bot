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
    it('should handle nonexistent custom rules file gracefully', async () => {
      const changedFiles = [{ filename: 'src/main.ts', patch: '...' }];

      // This will fail to read the file but should continue with base config
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
        'nonexistent-file.json'
      );

      expect(callOpenRouterMock).toHaveBeenCalled();
      const prompt = callOpenRouterMock.mock.calls[0][2];
      expect(prompt).toContain('Security Review'); // Should fallback to base config
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
          expect.stringContaining('YAML custom rules are not currently supported')
        );
      } finally {
        // Clean up
        if (fs.existsSync(yamlPath)) {
          fs.unlinkSync(yamlPath);
        }
      }
    });
  });
});
