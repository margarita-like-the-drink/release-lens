/**
 * Curated keyword patterns used by content-based signal detectors.
 *
 * These intentionally match as substrings rather than whole words, because
 * the concepts they name (payment, validate, session, authorize...) show up
 * constantly as part of camelCase or PascalCase identifiers - processPayment,
 * validateEmail, AuthSession - where a `\b` word boundary would never match.
 * Short acronyms (mfa, sso, acl, utc-adjacent numerics) keep `\b` because the
 * tradeoff reverses: they are common substrings of unrelated words.
 *
 * A false negative here just means a report is quieter than it should be; a
 * constant stream of false positives is worse, since it teaches QA engineers
 * to stop reading the report. Both directions are documented in the README.
 */

export const PAYMENT_PATTERNS = [
  /payment/i,
  /\bcharge[ds]?\b/i,
  /refund/i,
  /invoic/i,
  /billing/i,
  /stripe/i,
  /paypal/i,
  /transaction/i,
  /checkout/i,
  /\bcurrency\b/i,
];

export const RETRY_PATTERNS = [/retr(y|ies|ying)/i, /attempts?/i, /backoff/i, /idempotenc(y|e)/i];

export const AUTHENTICATION_PATTERNS = [
  /login/i,
  /logout/i,
  /session/i,
  /authenticat/i,
  /password/i,
  /credential/i,
  /\bjwt\b/i,
  /oauth/i,
  /\bmfa\b/i,
  /\b2fa\b/i,
  /\bsso\b/i,
];

export const AUTHORIZATION_PATTERNS = [
  /authoriz/i,
  /forbidden/i,
  /\b403\b/,
  /\bcan[A-Z]\w*\(/,
  /\bability\b/i,
  /policy/i,
  /guard/i,
];

export const PERMISSION_ROLE_PATTERNS = [
  /\brole[s]?\b/i,
  /permission/i,
  /\brbac\b/i,
  /\bacl\b/i,
  /privileg/i,
  /\bgrant(s|ed|ing)?\b/i,
  /\bscope[s]?\b/i,
];

export const VALIDATION_PATTERNS = [
  /validat/i,
  /sanitiz/i,
  /is_?valid/i,
  /\bconstraint[s]?\b/i,
  /joi\.\w+/i,
  /zod\.\w+/i,
];

export const ERROR_HANDLING_PATTERNS = [
  /\bcatch\s*\(/,
  /\bthrow\s+new\b/,
  /\bexcept\b/,
  /\brescue\b/,
  /\braise\b/,
  /\.catch\(/,
  /\btry\s*\{/,
  /\btry:/,
];

export const DATETIME_PATTERNS = [
  /timezone/i,
  /\butc\b/i,
  /toutc/i,
  /daylight/i,
  /moment\(/,
  /dayjs\(/,
  /strftime/i,
  /datetime\.now/i,
  /localdate/i,
  /instant\.now/i,
  /\bcron\(/i,
  /\bepoch\b/i,
];

export const API_ENDPOINT_PATH_PATTERNS = [
  /(^|\/)controllers?\//i,
  /(^|\/)routes?\//i,
  /(^|\/)handlers?\//i,
  /(^|\/)api\//i,
  /(^|\/)endpoints?\//i,
  /controller\.[a-z]+$/i,
  /Controller\.(java|cs)$/,
];

export const API_ENDPOINT_CONTENT_PATTERNS = [
  /@app\.route\(/,
  /router\.(get|post|put|patch|delete)\(/i,
  /app\.(get|post|put|patch|delete)\(/i,
  /@(Get|Post|Put|Patch|Delete)Mapping/,
  /\[Http(Get|Post|Put|Patch|Delete)\]/,
  /def (get|post|put|patch|delete)\(/,
];

export const API_CONTRACT_PATH_PATTERNS = [
  /openapi\.(ya?ml|json)$/i,
  /swagger\.(ya?ml|json)$/i,
  /\.proto$/i,
  /\.graphql$/i,
  /schema/i,
  /(^|\/)dto\//i,
  /(^|\/)contracts?\//i,
];

export const MIGRATION_CONTENT_PATTERNS = [
  /create\s+table/i,
  /alter\s+table/i,
  /drop\s+table/i,
  /add\s+column/i,
  /drop\s+column/i,
];

export const DEPENDENCY_MANIFEST_NAMES = new Set([
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'requirements.txt',
  'Pipfile',
  'Pipfile.lock',
  'poetry.lock',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'go.mod',
  'go.sum',
  'Gemfile',
  'Gemfile.lock',
]);
