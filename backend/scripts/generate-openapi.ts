/**
 * OpenAPI Spec Generator
 *
 * This script generates the OpenAPI specification from all route definitions.
 * Run with: npm run generate:openapi
 *
 */

import { OpenAPIHono } from '@hono/zod-openapi';
import * as fs from 'fs';
import * as path from 'path';

// Import all lambda apps
import { app as authApp } from '../src/api/auth';
import { app as blockedApp } from '../src/api/blocked';
import { app as calendarsApp } from '../src/api/calendars';
import { app as emojiApp } from '../src/api/emoji';
import { app as eventsApp } from '../src/api/events';
import { app as busyTimesApp } from '../src/api/busy-times';
import { app as friendsApp } from '../src/api/friends';
import { app as groupsApp } from '../src/api/groups';
import { app as usersApp } from '../src/api/users';
import { app as invitesApp } from '../src/api/invites';

// Create the main app that combines all routes
const mainApp = new OpenAPIHono();

// Register security scheme for Bearer auth
mainApp.openAPIRegistry.registerComponent('securitySchemes', 'BearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Apple identity token',
});

// Mount all sub-apps with their base paths
// Note: The routes are already defined with their full paths in each lambda,
// so we mount them at the root
mainApp.route('/', authApp);
mainApp.route('/', blockedApp);
mainApp.route('/', calendarsApp);
mainApp.route('/', emojiApp);
mainApp.route('/', eventsApp);
mainApp.route('/', busyTimesApp);
mainApp.route('/', friendsApp);
mainApp.route('/', groupsApp);
mainApp.route('/', usersApp);
mainApp.route('/', invitesApp);

// Generate the OpenAPI document
const doc = mainApp.getOpenAPIDocument({
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Gather API',
    description:
      'Social scheduling API for coordinating meetups with friends based on mutual availability',
  },
  servers: [
    {
      url: 'https://api.gather.example.com',
      description: 'Production',
    },
    {
      url: 'http://localhost:3000',
      description: 'Local development',
    },
  ],
});

// Write the spec to the openapi.json file
const outputPath = path.join(__dirname, '..', 'openapi.json');
fs.writeFileSync(outputPath, JSON.stringify(doc, null, 2));

console.log(`OpenAPI spec generated successfully at ${outputPath}`);
console.log(`Total paths: ${Object.keys(doc.paths || {}).length}`);
console.log(
  `Total schemas: ${Object.keys(doc.components?.schemas || {}).length}`,
);
