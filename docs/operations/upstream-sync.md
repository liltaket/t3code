# Sync a personal fork

The fork's `Sync upstream` GitHub Actions workflow merges `pingdotgg/t3code`'s
`main` into the fork's `main` daily at 06:17 UTC. It also supports manual runs.
It skips the upstream repository itself and preserves the fork's commits.

After publishing the workflow to the fork's default branch, enable GitHub Actions
in the fork's **Actions** tab. Run **Sync upstream → Run workflow** once to verify
that the repository permits the workflow's write access. Branch protection may
prevent the push; the workflow does not bypass it.

If upstream changes conflict with the fork, the job fails without pushing. Merge
upstream manually, resolve the conflict, validate the result, and push normally.
The workflow never force pushes or chooses one side of a conflict automatically.

A scheduled run updates source code only. Rebuild and deploy separately to update
an installed app. GitHub may disable schedules for inactive public repositories;
re-enable the workflow in Actions if needed.
