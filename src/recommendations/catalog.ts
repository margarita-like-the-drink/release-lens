import type { RecommendationCategory, Signal } from '../domain/types.js';
import { humanizeIdentifier, pathContainsAny, withoutExtension } from '../signals/textScan.js';

export interface RawRecommendation {
  category: RecommendationCategory;
  text: string;
}

type Generator = (signal: Signal) => RawRecommendation[];

const VALIDATION_SUBJECTS: Record<string, string> = {
  discount: 'discount value',
  coupon: 'coupon code',
  price: 'price value',
  quantity: 'quantity value',
  email: 'email address',
  phone: 'phone number',
  amount: 'amount value',
  age: 'age value',
  password: 'password input',
  postcode: 'postal code',
  zipcode: 'postal code',
};

function extractValidationSubject(files: string[]): string {
  for (const file of files) {
    const base = withoutExtension(file).toLowerCase();
    for (const [key, phrase] of Object.entries(VALIDATION_SUBJECTS)) {
      if (base.includes(key)) return phrase;
    }
  }
  const first = files[0];
  if (!first) return 'the changed input';
  return `${humanizeIdentifier(withoutExtension(first))} value`;
}

const isRetryRelated = (signal: Signal): boolean =>
  signal.affectedFiles.some((file) => pathContainsAny(file, ['retry'])) ||
  signal.evidence.some((e) => /retry/i.test(e.description));

/**
 * Per-signal recommendation generators. Each returns concrete, falsifiable
 * checks tied to what the signal actually found - never generic filler like
 * "test edge cases". Combination-level recommendations that need more than
 * one signal live in `combinations.ts`.
 */
export const RECOMMENDATION_GENERATORS: Record<string, Generator> = {
  'payment-logic-changed': (signal) => {
    const recs: RawRecommendation[] = [
      {
        category: 'regression',
        text: 'Verify a successful payment completes and the resulting status is correct for at least one real provider flow.',
      },
      {
        category: 'negative',
        text: 'Verify a declined payment is handled and surfaced correctly to the user, without charging them.',
      },
      {
        category: 'negative',
        text: 'Verify a payment provider timeout does not leave the order or payment record in an inconsistent state.',
      },
      {
        category: 'boundary',
        text: 'Verify a duplicate submission of the same payment request does not create a duplicate charge.',
      },
      {
        category: 'api',
        text: 'Verify provider error responses (4xx/5xx) are mapped to the correct application-level failure state.',
      },
      {
        category: 'exploratory',
        text: 'Refresh the page during payment processing and confirm the payment is neither duplicated nor lost.',
      },
      {
        category: 'exploratory',
        text: 'Navigate back in the browser after a failed payment and confirm no stale payment state is resubmitted.',
      },
      {
        category: 'data-integrity',
        text: 'Confirm the payment status stored in the database matches the actual provider outcome after any retry.',
      },
    ];
    if (isRetryRelated(signal)) {
      recs.push(
        {
          category: 'negative',
          text: 'Verify a declined retry attempt is surfaced correctly and does not silently succeed.',
        },
        {
          category: 'negative',
          text: 'Verify a retry that times out waiting on the provider does not duplicate the original charge.',
        },
        {
          category: 'boundary',
          text: 'Verify a duplicate retry request (double-click or network resend) is deduplicated via an idempotency key.',
        },
        {
          category: 'api',
          text: 'Verify retry requests are idempotent: the same idempotency key must not create a second charge.',
        },
        {
          category: 'exploratory',
          text: 'Verify retrying after reconnecting to the network resumes correctly rather than starting a new payment attempt.',
        },
      );
    }
    return recs;
  },

  'authentication-changed': () => [
    {
      category: 'regression',
      text: 'Verify login succeeds with valid credentials and the resulting session behaves as it did before the change.',
    },
    {
      category: 'negative',
      text: 'Verify an expired session is rejected and the user is redirected to re-authenticate.',
    },
    {
      category: 'negative',
      text: 'Verify an invalid or tampered session token is rejected.',
    },
    {
      category: 'exploratory',
      text: 'Verify session expiration occurring mid-transaction (e.g. during checkout) is handled without data loss or a confusing error.',
    },
    {
      category: 'security',
      text: 'Verify session tokens are invalidated on logout and cannot be reused afterward.',
    },
  ],

  'authorization-changed': () => [
    {
      category: 'permissions',
      text: 'Verify a user without the required permission is denied access to the affected action or resource.',
    },
    {
      category: 'permissions',
      text: 'Verify a user with the required permission can still access the resource as expected.',
    },
    {
      category: 'api',
      text: 'Verify a direct API request bypassing the UI is still enforced by the same authorization check.',
    },
    {
      category: 'exploratory',
      text: 'Verify a role removed while a user has an active session is enforced on the next request, not only at login.',
    },
  ],

  'permission-role-changed': () => [
    {
      category: 'permissions',
      text: 'Verify each affected role retains only its intended permissions after the change.',
    },
    {
      category: 'boundary',
      text: 'Verify a user at the boundary between two roles (recently upgraded or downgraded) sees the correct permission set.',
    },
    {
      category: 'regression',
      text: 'Verify existing users with previously assigned roles are unaffected unless they were intentionally migrated.',
    },
  ],

  'validation-logic-changed': (signal) => {
    const subject = extractValidationSubject(signal.affectedFiles);
    return [
      {
        category: 'boundary',
        text: `Verify ${subject} at the minimum allowed value, the maximum allowed value, one below the minimum, and one above the maximum.`,
      },
      {
        category: 'negative',
        text: `Verify ${subject} rejects null, empty, and malformed input with a clear error rather than a silent failure.`,
      },
      {
        category: 'boundary',
        text: `Verify ${subject} handles decimal precision and rounding at the boundary correctly.`,
      },
    ];
  },

  'error-handling-changed': () => [
    {
      category: 'negative',
      text: 'Verify the changed error path surfaces an actionable message rather than a generic failure.',
    },
    {
      category: 'regression',
      text: 'Verify errors are still logged or reported through the existing error-reporting path after this change.',
    },
    {
      category: 'exploratory',
      text: 'Trigger the actual failure condition directly, not just the catch block, to confirm the handler is reached in practice.',
    },
  ],

  'api-endpoint-changed': () => [
    {
      category: 'api',
      text: "Verify the endpoint's response shape and status code are unchanged for existing consumers, unless this is an intentional version bump.",
    },
    {
      category: 'negative',
      text: 'Verify unauthenticated and malformed requests to the endpoint are rejected with the expected status code.',
    },
    {
      category: 'regression',
      text: 'Verify existing callers of this endpoint (UI or other services) still function against the changed handler.',
    },
  ],

  'api-contract-changed': (signal) => {
    const fieldMatch = signal.evidence
      .map((e) => /optional to required: (.+)$/.exec(e.description)?.[1])
      .find(Boolean);
    if (fieldMatch) {
      const fields = fieldMatch.split(', ');
      const field = fields[0]!;
      return [
        {
          category: 'api',
          text: `Verify existing clients that omit '${field}' now receive a clear validation error instead of a partial success or a 500.`,
        },
        {
          category: 'regression',
          text: `Verify any internal caller that previously omitted '${field}' has been updated, or confirm none exist.`,
        },
        {
          category: 'negative',
          text: `Verify a request with '${field}' set to null, an empty string, and its previous default value explicitly.`,
        },
      ];
    }
    return [
      {
        category: 'api',
        text: 'Verify consumers of this contract are compatible with the schema change (added, removed, or renamed fields).',
      },
      {
        category: 'regression',
        text: 'Verify a request built against the previous contract version fails predictably rather than silently.',
      },
    ];
  },

  'database-migration-changed': () => [
    {
      category: 'data-integrity',
      text: 'Verify the migration applies cleanly to a copy of production-like data, not only an empty database.',
    },
    {
      category: 'data-integrity',
      text: 'Verify existing rows receive a sensible value for any new column: a default, a backfill, or explicit null handling.',
    },
    {
      category: 'regression',
      text: "Verify the migration's rollback path, if any, leaves the schema in a consistent state.",
    },
    {
      category: 'exploratory',
      text: 'Verify application behavior if new code deploys before the migration has run, and if the migration runs before new code deploys.',
    },
  ],

  'shared-core-changed': (signal) => [
    {
      category: 'regression',
      text: `Verify other features that depend on ${signal.affectedFiles[0] ?? 'this module'} are unaffected; this change has a wider blast radius than a single feature.`,
    },
  ],

  'configuration-changed': () => [
    {
      category: 'regression',
      text: 'Verify the application starts and behaves correctly with the new configuration value in a staging-like environment.',
    },
    {
      category: 'negative',
      text: 'Verify behavior when the configuration value is missing or set to an unexpected value.',
    },
  ],

  'dependencies-changed': () => [
    {
      category: 'regression',
      text: 'Verify the application builds and starts cleanly with the updated dependency.',
    },
    {
      category: 'exploratory',
      text: "Check the dependency's changelog for breaking changes relevant to how it is used in this codebase.",
    },
  ],

  'datetime-logic-changed': () => [
    {
      category: 'boundary',
      text: 'Verify behavior across a daylight saving time transition.',
    },
    {
      category: 'boundary',
      text: 'Verify behavior at a UTC day, month, and year boundary (e.g. 23:59:59 rolling to 00:00:00).',
    },
    {
      category: 'exploratory',
      text: 'Verify behavior for a user in a timezone different from the server.',
    },
  ],

  'large-change-surface': (signal) => [
    {
      category: 'regression',
      text: `Run the full regression suite for the affected area rather than a narrow subset; this change touches ${signal.affectedFiles.length} file(s).`,
    },
    {
      category: 'exploratory',
      text: 'Allocate exploratory testing time proportional to the size of this change: a large diff increases the chance of an untested interaction.',
    },
  ],

  'multi-area-change': (signal) => {
    const areas =
      signal.evidence[0]?.description.replace('Areas touched: ', '') ?? 'the affected areas';
    return [
      {
        category: 'regression',
        text: `Verify the areas changed together in this pull request (${areas}) integrate correctly, not only individually.`,
      },
    ];
  },

  'production-without-tests': (signal) => [
    {
      category: 'regression',
      text: `Add manual verification for ${signal.affectedFiles[0] ?? 'the changed file'} in this release, since no related automated test change was detected.`,
    },
  ],

  'assertions-removed': (signal) => [
    {
      category: 'regression',
      text: `Confirm the removed assertion(s) in ${signal.affectedFiles[0] ?? 'the test file'} were intentional and the behavior they checked is still correct or tested elsewhere.`,
    },
  ],

  'tests-deleted': (signal) => [
    {
      category: 'regression',
      text: `Confirm the deleted test(s) in ${signal.affectedFiles[0] ?? 'the test file'} reflect intentionally removed behavior rather than a workaround for a failing test.`,
    },
  ],

  'tests-skipped': (signal) => [
    {
      category: 'regression',
      text: `Confirm the skipped or disabled test(s) in ${signal.affectedFiles[0] ?? 'the test file'} are tracked to be re-enabled and are not masking a real failure.`,
    },
  ],

  'critical-path-changed': (signal) => [
    {
      category: 'smoke',
      text: `Run the standard smoke check for ${signal.title.replace(' critical path changed', '')} before sign-off; it is configured as a critical path for this project.`,
    },
  ],
};
