import * as core from '@actions/core';
import * as github from '@actions/github';
import * as tmp from 'tmp';

import {CheckRunner} from './check';
import * as input from './input';

import execa from 'execa';

/**
 * These environment variables are exposed for GitHub Actions.
 *
 * See https://bit.ly/2WlFUD7 for more information.
 */
const {GITHUB_TOKEN, GITHUB_WORKSPACE} = process.env;

export async function run(actionInput: input.Input): Promise<void> {
  try {
    const startedAt = new Date().toISOString();

    // (FORK) This is a hack to accommodate files modified before running Vale.
    // Note this only works if the file's line numbers are not changed by the modifying function.
    core.info('Original args:')
    actionInput.args.forEach(origArg => core.info(origArg))
    const modifiedArgs = actionInput.args.map(arg => arg.replace('.md', '.TEMP.md'));
    core.info('Modified args:')
    modifiedArgs.forEach(modArg => core.info(modArg))
    

    const modifiedAlertResp = await execa('vale', modifiedArgs);
    core.info('Initial json report:')
    core.info(modifiedAlertResp.stdout)
    const alertResp = modifiedAlertResp.stdout.replace(/.TEMP.md/g, '.md');
    core.info('Updated json report:')
    core.info(alertResp)
    // (ENDFORK)

    let runner = new CheckRunner(actionInput.files);

    let sha = github.context.sha;
    if (github.context.payload.pull_request) {
      sha = github.context.payload.pull_request.head.sha;
    }

    // Allow to customize the SHA to use for the check
    // useful when using the action with a workflow_run/completed event
    if (process.env.OVERRIDE_GITHUB_SHA) {
      sha = process.env.OVERRIDE_GITHUB_SHA;
    }

    runner.makeAnnotations(alertResp);
    await runner.executeCheck({
      token: actionInput.token,
      name: 'Vale',
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      head_sha: sha,
      started_at: startedAt,
      context: {vale: actionInput.version}
    });
  } catch (error) {
    core.setFailed(error.stderr);
  }
}

async function main(): Promise<void> {
  try {
    const userToken = GITHUB_TOKEN as string;
    const workspace = GITHUB_WORKSPACE as string;

    const tmpobj = tmp.fileSync({postfix: '.ini', dir: workspace});
    const actionInput = await input.get(tmpobj, userToken, workspace);

    await run(actionInput);

    tmpobj.removeCallback();
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();
