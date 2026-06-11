import { OpenAPIHono } from '@hono/zod-openapi';
import { handle } from 'hono/aws-lambda';
import { app as authApp } from '../src/api/auth';
import { app as usersApp } from '../src/api/users';
import { app as friendsApp } from '../src/api/friends';
import { app as groupsApp } from '../src/api/groups';
import { app as emojiApp } from '../src/api/emoji';
import { app as blockedApp } from '../src/api/blocked';
import { app as busyTimesApp } from '../src/api/busy-times';
import { app as eventsApp } from '../src/api/events';
import { app as calendarsApp } from '../src/api/calendars';
import { app as invitesApp } from '../src/api/invites';
import { app as wellKnownApp } from '../src/api/well-known';

const app = new OpenAPIHono();

// Some public routes
app.route('', wellKnownApp);
app.route('', authApp);
app.route('', calendarsApp);

// Remaining routes will require authentication
app.route('', usersApp);
app.route('', friendsApp);
app.route('', groupsApp);
app.route('', emojiApp);
app.route('', blockedApp);
app.route('', busyTimesApp);
app.route('', eventsApp);
app.route('', invitesApp);

export const handler = handle(app);
