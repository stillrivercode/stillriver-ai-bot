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

export async function getReviews(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number
): Promise<any[]> {
  const { data: reviews } = await octokit.rest.pulls.listReviews({
    owner,
    repo,
    pull_number: prNumber,
  });

  return reviews;
}
