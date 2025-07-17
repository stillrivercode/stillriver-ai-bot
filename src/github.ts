import * as github from '@actions/github';

type Octokit = ReturnType<typeof github.getOctokit>;

export async function getChangedFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number
): Promise<{ filename: string; patch: string }[]> {
  const { data: files } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
  });

  return files.map((file) => ({
    filename: file.filename,
    patch: file.patch || '',
  }));
}

export async function getReviewComments(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number
): Promise<string[]> {
  const { data: comments } = await octokit.rest.pulls.listReviewComments({
    owner,
    repo,
    pull_number: prNumber,
  });

  return comments.map((comment) => comment.body);
}
