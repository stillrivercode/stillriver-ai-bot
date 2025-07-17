export async function getReview(
  openrouterApiKey: string,
  changedFiles: string[]
): Promise<string | null> {
  // In a real implementation, this would call the OpenRouter API.
  // For now, it returns a mock review.
  console.log(`Getting review for ${changedFiles.length} files with key ${openrouterApiKey.substring(0, 4)}...`);
  return `This is a mock AI review for the ${changedFiles.length} changed files.`;
}
