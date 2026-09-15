import { afterEach, describe, expect, it, vi } from 'vitest';
import { GitHubApiError, GitHubClient } from '../../src/github/api.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GitHubClient', () => {
  it('sends an authenticated POST request for createReview', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new GitHubClient({ token: 'ghp_test' });
    await client.createReview('acme', 'widgets', 42, {
      body: 'hello',
      event: 'COMMENT',
      comments: [{ path: 'a.ts', line: 1, side: 'RIGHT', body: 'note' }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.github.com/repos/acme/widgets/pulls/42/reviews');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer ghp_test');
    expect(JSON.parse(init.body as string)).toMatchObject({ body: 'hello', event: 'COMMENT' });
  });

  it('sends a POST request for createCheckRun', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new GitHubClient({ token: 'ghp_test' });
    await client.createCheckRun('acme', 'widgets', {
      name: 'ReleaseLens',
      head_sha: 'abc123',
      status: 'completed',
      conclusion: 'neutral',
      output: { title: 'LOW · 0 points', summary: 'ok' },
    });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.github.com/repos/acme/widgets/check-runs');
  });

  it('throws GitHubApiError with the response body on failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{"message":"nope"}', { status: 403 }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new GitHubClient({ token: 'ghp_test' });
    await expect(
      client.createCheckRun('acme', 'widgets', {
        name: 'ReleaseLens',
        head_sha: 'abc123',
        status: 'completed',
        conclusion: 'neutral',
        output: { title: 't', summary: 's' },
      }),
    ).rejects.toBeInstanceOf(GitHubApiError);
  });
});
