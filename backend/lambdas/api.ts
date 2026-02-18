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

const app = new OpenAPIHono();

app.route('', authApp);
app.route('', usersApp);
app.route('', friendsApp);
app.route('', groupsApp);
app.route('', emojiApp);
app.route('', blockedApp);
app.route('', busyTimesApp);
app.route('', eventsApp);
app.route('', calendarsApp);

export const handler = handle(app);
