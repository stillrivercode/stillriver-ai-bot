import * as github from '@actions/github';

type Octokit = ReturnType<typeof github.getOctokit>;

interface GitHubReview {
  id: number;
  user: {
    login: string;
  } | null;
  body: string;
  state: string;
}

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

export async function getReviews(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number
): Promise<GitHubReview[]> {
  const { data: reviews } = await octokit.rest.pulls.listReviews({
    owner,
    repo,
    pull_number: prNumber,
  });

  return reviews;
}
