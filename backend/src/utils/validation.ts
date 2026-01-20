import { ZodError, type ZodSchema } from 'zod';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { badRequest } from './response';

export interface ParsedRequest<T> {
  success: true;
  data: T;
}

export interface ParsedRequestError {
  success: false;
  response: ReturnType<typeof badRequest>;
}

export const parseBody = <T>(
  event: APIGatewayProxyEvent,
  schema: ZodSchema<T>
): ParsedRequest<T> | ParsedRequestError => {
  try {
    if (!event.body) {
      return {
        success: false,
        response: badRequest('Validation Error', 'Request body is required'),
      };
    }

    const body = JSON.parse(event.body);
    const data = schema.parse(body);
    
    return { success: true, data };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        success: false,
        response: badRequest('Validation Error', 'Invalid JSON in request body'),
      };
    }
    
    if (error instanceof ZodError) {
      const messages = error.issues.map(e => `${e.path.map(String).join('.')}: ${e.message}`).join(', ');
      return {
        success: false,
        response: badRequest('Validation Error', messages),
      };
    }
    
    return {
      success: false,
      response: badRequest('Validation Error', 'Invalid request body'),
    };
  }
};

export const parseQueryParams = <T>(
  event: APIGatewayProxyEvent,
  schema: ZodSchema<T>
): ParsedRequest<T> | ParsedRequestError => {
  try {
    const params = event.queryStringParameters ?? {};
    const data = schema.parse(params);
    
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.issues.map(e => `${e.path.map(String).join('.')}: ${e.message}`).join(', ');
      return {
        success: false,
        response: badRequest('Validation Error', messages),
      };
    }
    
    return {
      success: false,
      response: badRequest('Validation Error', 'Invalid query parameters'),
    };
  }
};

export const getPathParam = (
  event: APIGatewayProxyEvent,
  param: string
): string | null => {
  return event.pathParameters?.[param] ?? null;
};
