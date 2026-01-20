import type { APIGatewayProxyResult } from 'aws-lambda';
import type { ApiResponse } from '../types';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

export const success = <T>(data: T, message?: string): APIGatewayProxyResult => {
  const body: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
};

export const created = <T>(data: T, message?: string): APIGatewayProxyResult => {
  const body: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  return {
    statusCode: 201,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
};

export const noContent = (): APIGatewayProxyResult => {
  return {
    statusCode: 204,
    headers: corsHeaders,
    body: '',
  };
};

export const badRequest = (error: string, message?: string): APIGatewayProxyResult => {
  const body: ApiResponse = {
    success: false,
    error,
    message,
  };
  return {
    statusCode: 400,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
};

export const unauthorized = (message = 'Unauthorized'): APIGatewayProxyResult => {
  const body: ApiResponse = {
    success: false,
    error: 'Unauthorized',
    message,
  };
  return {
    statusCode: 401,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
};

export const forbidden = (message = 'Forbidden'): APIGatewayProxyResult => {
  const body: ApiResponse = {
    success: false,
    error: 'Forbidden',
    message,
  };
  return {
    statusCode: 403,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
};

export const notFound = (message = 'Not found'): APIGatewayProxyResult => {
  const body: ApiResponse = {
    success: false,
    error: 'Not Found',
    message,
  };
  return {
    statusCode: 404,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
};

export const conflict = (message: string): APIGatewayProxyResult => {
  const body: ApiResponse = {
    success: false,
    error: 'Conflict',
    message,
  };
  return {
    statusCode: 409,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
};

export const tooManyRequests = (message: string): APIGatewayProxyResult => {
  const body: ApiResponse = {
    success: false,
    error: 'Too Many Requests',
    message,
  };
  return {
    statusCode: 429,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
};

export const internalError = (message = 'Internal server error'): APIGatewayProxyResult => {
  const body: ApiResponse = {
    success: false,
    error: 'Internal Server Error',
    message,
  };
  return {
    statusCode: 500,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
};

export const options = (): APIGatewayProxyResult => {
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: '',
  };
};
