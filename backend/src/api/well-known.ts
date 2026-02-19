import { createApp } from '../middleware/hono';

export const app = createApp();

app.get('/.well-known/microsoft-identity-association.json', (c) => {
  return c.json({
    associatedApplications: [
      {
        applicationId: 'f59f22da-b2cb-41ec-ada2-2d5ec9ad167b',
      },
    ],
  });
});
