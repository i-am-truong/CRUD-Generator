// Import with `const Sentry = require("@sentry/nestjs");` if you are using CJS
import * as Sentry from '@sentry/nestjs'

Sentry.init({
  dsn: 'https://46a4d5e7f1b35bbc7331ced9c3a64650@o4510043427438592.ingest.us.sentry.io/4510469044436992',
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
})
