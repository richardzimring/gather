import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { OWNER_EMAIL, REGION, STAGE } from '../constants';
import type { User } from '../types';

const sesClient = new SESClient({ region: REGION });

const formatName = (user: User): string => {
  const first = user.firstName.trim();
  const lastInitial = user.lastName.trim().charAt(0).toUpperCase();
  return lastInitial ? `${first} ${lastInitial}.` : first;
};

export const notifyOwnerOfNewSignup = async (user: User): Promise<void> => {
  if (STAGE !== 'prod') return;

  const name = formatName(user);
  const timestamp = new Date().toISOString();

  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: OWNER_EMAIL,
        Destination: { ToAddresses: [OWNER_EMAIL] },
        Message: {
          Subject: {
            Data: `[Gather] New signup: ${name}`,
            Charset: 'UTF-8',
          },
          Body: {
            Text: {
              Data: `New Gather signup\n${timestamp}\n\n${name}`,
              Charset: 'UTF-8',
            },
          },
        },
      }),
    );
  } catch (error) {
    console.error('Failed to send owner signup notification:', error);
  }
};
