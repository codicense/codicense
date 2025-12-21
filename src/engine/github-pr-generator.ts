/**
 * GitHub PR Generator
 *
 * Generates and submits pull requests to fix license conflicts.
 * Uses GitHub REST API v3 for compatibility.
 */

import { FixPR, FixChange } from './fix-generator.js';

export interface GitHubPROptions {
  owner: string;
  repo: string;
  branch: string;
  token: string;
  dryRun?: boolean;
}

export interface CreatePRResult {
  success: boolean;
  prUrl?: string;
  prNumber?: number;
  error?: string;
  dryRun: boolean;
}

interface GitHubRef {
  object: {
    sha: string;
  };
}

interface GitHubFile {
  sha: string;
}

interface GitHubRepository {
  default_branch: string;
}

interface GitHubPRResponse {
  html_url: string;
  number: number;
}


export class GitHubPRGenerator {
  private apiBase = 'https://api.github.com';

  async createPR(fix: FixPR, options: GitHubPROptions): Promise<CreatePRResult> {
    if (options.dryRun) {
      return this.dryRunPR(fix, options);
    }

    try {
      // Step 1: Create feature branch
      const branchName = this.generateBranchName(fix.title);
      await this.createBranch(options.owner, options.repo, branchName, options.token);

      // Step 2: Apply changes to branch
      for (const change of fix.changes) {
        await this.commitChange(
          options.owner,
          options.repo,
          branchName,
          change,
          options.token
        );
      }

      // Step 3: Create pull request
      const prResult = await this.createPullRequest(
        options.owner,
        options.repo,
        branchName,
        options.branch,
        fix.title,
        fix.description,
        options.token
      );

      return {
        success: true,
        prUrl: prResult.html_url,
        prNumber: prResult.number,
        dryRun: false,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating PR',
        dryRun: false,
      };
    }
  }

  private async createBranch(
    owner: string,
    repo: string,
    branchName: string,
    token: string
  ): Promise<void> {
    // Get default branch SHA
    const mainBranch = (await this.fetchJSON(
      `${this.apiBase}/repos/${owner}/${repo}`,
      token
    )) as GitHubRepository;
    const defaultBranch = mainBranch.default_branch || 'main';

    const mainRef = (await this.fetchJSON(
      `${this.apiBase}/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`,
      token
    )) as GitHubRef;

    const sha = mainRef.object.sha;

    await this.postJSON(
      `${this.apiBase}/repos/${owner}/${repo}/git/refs`,
      {
        ref: `refs/heads/${branchName}`,
        sha,
      },
      token
    );
  }

  private async commitChange(
    owner: string,
    repo: string,
    branchName: string,
    change: FixChange,
    token: string
  ): Promise<void> {
    // Get current file SHA
    let fileSha: string | undefined;
    try {
      const fileResponse = (await this.fetchJSON(
        `${this.apiBase}/repos/${owner}/${repo}/contents/${change.file}?ref=${branchName}`,
        token
      )) as GitHubFile;
      fileSha = fileResponse.sha;
    } catch {
      // File doesn't exist yet
    }

    // Encode content as base64
    const content = Buffer.from(change.after).toString('base64');

    const payload: Record<string, unknown> = {
      message: `fix: ${change.explanation}`,
      content,
      branch: branchName,
    };

    if (fileSha) {
      payload.sha = fileSha;
    }

    await this.putJSON(
      `${this.apiBase}/repos/${owner}/${repo}/contents/${change.file}`,
      payload,
      token
    );
  }

  private async createPullRequest(
    owner: string,
    repo: string,
    head: string,
    base: string,
    title: string,
    description: string,
    token: string
  ): Promise<GitHubPRResponse> {
    return (await this.postJSON(
      `${this.apiBase}/repos/${owner}/${repo}/pulls`,
      {
        title,
        body: description,
        head,
        base,
        draft: true, // Create as draft for review before merge
      },
      token
    )) as GitHubPRResponse;
  }

  private dryRunPR(fix: FixPR, options: GitHubPROptions): CreatePRResult {
    const branchName = this.generateBranchName(fix.title);
    const prUrl = `https://github.com/${options.owner}/${options.repo}/pull/0`;

    console.log(`\n📋 DRY RUN: Would create PR with the following changes:\n`);
    console.log(`Branch: ${branchName}`);
    console.log(`Title: ${fix.title}\n`);

    for (const change of fix.changes) {
      console.log(`File: ${change.file}`);
      console.log(`Change type: ${change.type}`);
      console.log(`Explanation: ${change.explanation}\n`);
    }

    console.log(`Estimated risk reduction: ${fix.estimatedRiskReduction}%\n`);

    return {
      success: true,
      prUrl,
      prNumber: 0,
      dryRun: true,
    };
  }

  private generateBranchName(title: string): string {
    // Convert title to valid branch name
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  private async fetchJSON(url: string, token: string): Promise<unknown> {
    const response = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async postJSON(
    url: string,
    payload: Record<string, unknown>,
    token: string
  ): Promise<unknown> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async putJSON(
    url: string,
    payload: Record<string, unknown>,
    token: string
  ): Promise<unknown> {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

export const githubPRGenerator = new GitHubPRGenerator();

