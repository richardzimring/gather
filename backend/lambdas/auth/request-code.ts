import type { APIGatewayProxyHandler } from 'aws-lambda';
import { RequestCodeSchema } from '../../src/types';
import { parseBody } from '../../src/utils/validation';
import * as response from '../../src/utils/response';
import * as authService from '../../src/services/auth';

export const handler: APIGatewayProxyHandler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return response.options();
  }

  // Parse and validate request body
  const parsed = parseBody(event, RequestCodeSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const { phoneNumber } = parsed.data;

  try {
    // Generate verification code
    const code = authService.generateVerificationCode();

    // Store the code
    const storeResult = await authService.storeVerificationCode(phoneNumber, code);
    if (!storeResult.success) {
      return response.tooManyRequests(storeResult.message ?? 'Please wait before requesting a new code');
    }

    // Send SMS
    const smsResult = await authService.sendVerificationSms(phoneNumber, code);
    if (!smsResult.success) {
      return response.internalError('Failed to send verification code');
    }

    return response.success(
      { phoneNumber },
      'Verification code sent successfully'
    );
  } catch (error) {
    console.error('Error in request-code:', error);
    return response.internalError('Failed to send verification code');
  }
};
