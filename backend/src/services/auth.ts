import * as crypto from 'crypto';
import * as db from './dynamodb';
import type { VerificationCodeRecord } from '../types';
import {
  VERIFICATION_CODE_EXPIRY_MINUTES,
  MAX_VERIFICATION_ATTEMPTS,
} from '../constants';

// ============================================
// Key Builders
// ============================================

const verifyPk = (phone: string) => `VERIFY#${phone}`;

// ============================================
// Verification Code Operations
// ============================================

export const generateVerificationCode = (): string => {
  // Generate a cryptographically secure 6-digit code
  const randomBytes = crypto.randomBytes(4);
  const randomNumber = randomBytes.readUInt32BE(0);
  const code = (randomNumber % 900000 + 100000).toString();
  return code;
};

export const storeVerificationCode = async (
  phoneNumber: string,
  code: string
): Promise<{ success: boolean; message?: string }> => {
  const pk = verifyPk(phoneNumber);
  const now = new Date();
  const expiresAt = Math.floor(now.getTime() / 1000) + (VERIFICATION_CODE_EXPIRY_MINUTES * 60);
  
  // Check if there's an existing unexpired code
  const existing = await db.getItem<VerificationCodeRecord>(pk, 'CODE');
  
  if (existing && existing.expiresAt > Math.floor(Date.now() / 1000)) {
    // If code was created less than 60 seconds ago, rate limit
    const createdAt = new Date(existing.createdAt).getTime();
    const secondsSinceCreation = (Date.now() - createdAt) / 1000;
    
    if (secondsSinceCreation < 60) {
      return {
        success: false,
        message: `Please wait ${Math.ceil(60 - secondsSinceCreation)} seconds before requesting a new code`,
      };
    }
  }
  
  const record: VerificationCodeRecord = {
    pk,
    sk: 'CODE',
    code,
    expiresAt,
    attempts: 0,
    createdAt: now.toISOString(),
  };
  
  await db.putItem(record);
  return { success: true };
};

export const verifyCode = async (
  phoneNumber: string,
  code: string
): Promise<{ success: boolean; message?: string }> => {
  const pk = verifyPk(phoneNumber);
  const record = await db.getItem<VerificationCodeRecord>(pk, 'CODE');
  
  if (!record) {
    return { success: false, message: 'No verification code found. Please request a new code.' };
  }
  
  const now = Math.floor(Date.now() / 1000);
  
  // Check if code is expired
  if (record.expiresAt < now) {
    await db.deleteItem(pk, 'CODE');
    return { success: false, message: 'Verification code has expired. Please request a new code.' };
  }
  
  // Check if too many attempts
  if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    await db.deleteItem(pk, 'CODE');
    return { success: false, message: 'Too many attempts. Please request a new code.' };
  }
  
  // Verify the code
  if (record.code !== code) {
    // Increment attempts
    await db.incrementCounter(pk, 'CODE', 'attempts');
    const remaining = MAX_VERIFICATION_ATTEMPTS - record.attempts - 1;
    return { success: false, message: `Invalid code. ${remaining} attempts remaining.` };
  }
  
  // Success - delete the verification record
  await db.deleteItem(pk, 'CODE');
  return { success: true };
};

// ============================================
// SMS Sending (Placeholder - implement with SNS)
// ============================================

export const sendVerificationSms = async (
  phoneNumber: string,
  code: string
): Promise<{ success: boolean; message?: string }> => {
  // TODO: Implement actual SMS sending via AWS SNS
  // For development, we'll log the code
  console.log(`[DEV] Verification code for ${phoneNumber}: ${code}`);
  
  // In production, this would use SNS:
  // const command = new PublishCommand({
  //   PhoneNumber: phoneNumber,
  //   Message: `Your Gather verification code is: ${code}`,
  // });
  // await snsClient.send(command);
  
  return { success: true };
};
