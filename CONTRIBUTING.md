# Contributing to Stillriver AI Bot

First off, thank you for considering contributing to the Stillriver AI Bot! It's people like you that make this such a great tool.

## Where do I go from here?

If you've noticed a bug or have a feature request, [make one](https://github.com/stillrivercode/stillriver-ai-bot/issues/new/choose)! It's generally best if you get confirmation of your bug or approval for your feature request this way before starting to code.

### Fork & create a branch

If this is something you think you can fix, then [fork the repository](https://github.com/stillrivercode/stillriver-ai-bot/fork) and create a branch with a descriptive name.

A good branch name would be (where issue #38 is the ticket you're working on):

```sh
git checkout -b 38-add-awesome-new-feature
```

### Get the style right

Your patch should follow the same conventions & pass the same code quality checks as the rest of the project.

### Make a Pull Request

At this point, you should switch back to your main branch and make sure it's up to date with the main project repository:

```sh
git remote add upstream git@github.com:stillrivercode/stillriver-ai-bot.git
git checkout main
git pull upstream main
```

Then update your feature branch from your local copy of main, and push it!

```sh
git checkout 38-add-awesome-new-feature
git rebase main
git push --set-upstream origin 38-add-awesome-new-feature
```

Finally, go to GitHub and [make a Pull Request](https://github.com/stillrivercode/stillriver-ai-bot/compare)

### Keeping your Pull Request updated

If a maintainer asks you to "rebase" your PR, they're saying that a lot of code has changed, and that you need to update your branch so it's easier to merge.

To learn more about rebasing and merging, check out this guide from Atlassian: [Merging vs. Rebasing](https://www.atlassian.com/git/tutorials/merging-vs-rebasing)
