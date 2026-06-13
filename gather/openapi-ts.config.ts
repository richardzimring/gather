import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../backend/openapi.json',
  output: './lib/api/generated',
  plugins: [
    '@hey-api/typescript',
    '@hey-api/sdk',
    // throwOnError: non-2xx responses throw instead of returning { error },
    // so callers never need to check response envelopes for failure.
    { name: '@hey-api/client-fetch', throwOnError: true },
  ],
  parser: {
    patch: {
      schemas: {
        // Hey API doesn't handle OpenAPI 3.0's `allOf + nullable: true` pattern
        // for $ref types, generating `CounterProposal & unknown` instead of
        // `CounterProposal | null`. This patch converts it to the equivalent
        // OpenAPI 3.1 `anyOf` form that Hey API handles correctly.
        EventResponse: (schema) => {
          if (schema.properties?.counterProposal) {
            schema.properties.counterProposal = {
              nullable: true,
              allOf: [{ $ref: '#/components/schemas/CounterProposal' }],
            };
          }
        },
      },
    },
  },
});
