import type { CheckRunPayload } from './checkRun.js';
import type { InlineComment } from './reviewComments.js';

export class GitHubApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
  }
}

export interface ReviewPayload {
  body: string;
  event: 'COMMENT';
  comments: InlineComment[];
}

export interface GitHubClientOptions {
  token: string;
  baseUrl?: string;
}

/** Minimal GitHub REST client - just the two endpoints ReleaseLens needs, no SDK dependency. */
export class GitHubClient {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(options: GitHubClientOptions) {
    this.token = options.token;
    this.baseUrl = options.baseUrl ?? 'https://api.github.com';
  }

  async createReview(
    owner: string,
    repo: string,
    pullNumber: number,
    review: ReviewPayload,
  ): Promise<void> {
    await this.request('POST', `/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`, review);
  }

  async createCheckRun(owner: string, repo: string, checkRun: CheckRunPayload): Promise<void> {
    await this.request('POST', `/repos/${owner}/${repo}/check-runs`, checkRun);
  }

  private async request(method: string, path: string, body: unknown): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'release-lens',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new GitHubApiError(
        `GitHub API request failed: ${method} ${path} (${response.status})`,
        response.status,
        text,
      );
    }
    return text.length > 0 ? JSON.parse(text) : undefined;
  }
}
