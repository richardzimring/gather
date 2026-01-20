import type { APIGatewayProxyEvent } from 'aws-lambda';
import { extractBearerToken, verifyToken } from '../utils/jwt';
import * as userService from '../services/users';
import type { User } from '../types';

export interface AuthenticatedEvent extends APIGatewayProxyEvent {
  user: User;
}

export type AuthResult = {
  success: true;
  user: User;
} | {
  success: false;
  message: string;
};

export const authenticateRequest = async (
  event: APIGatewayProxyEvent
): Promise<AuthResult> => {
  const authHeader = event.headers.Authorization ?? event.headers.authorization;
  const token = extractBearerToken(authHeader);

  if (!token) {
    return { success: false, message: 'Missing authorization token' };
  }

  const payload = verifyToken(token, 'access');
  if (!payload) {
    return { success: false, message: 'Invalid or expired token' };
  }

  const user = await userService.getUserById(payload.userId);
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  return { success: true, user };
};
