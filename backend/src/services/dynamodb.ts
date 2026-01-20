import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  QueryCommand,
  BatchWriteItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { MAIN_TABLE_NAME, REGION } from '../constants';

const client = new DynamoDBClient({ region: REGION });

// ============================================
// Generic DynamoDB Operations
// ============================================

export const getItem = async <T>(pk: string, sk: string): Promise<T | null> => {
  const command = new GetItemCommand({
    TableName: MAIN_TABLE_NAME,
    Key: marshall({ pk, sk }),
  });
  
  const response = await client.send(command);
  return response.Item ? (unmarshall(response.Item) as T) : null;
};

export const putItem = async <T extends object>(item: T): Promise<T> => {
  const command = new PutItemCommand({
    TableName: MAIN_TABLE_NAME,
    Item: marshall(item as Record<string, unknown>, { removeUndefinedValues: true }),
  });
  
  await client.send(command);
  return item;
};

export const updateItem = async <T>(
  pk: string,
  sk: string,
  updates: Partial<T>
): Promise<T | null> => {
  const updateEntries = Object.entries(updates).filter(([, v]) => v !== undefined);
  
  if (updateEntries.length === 0) {
    return getItem<T>(pk, sk);
  }
  
  const updateExpression = 'SET ' + updateEntries.map((_, i) => `#k${i} = :v${i}`).join(', ');
  const expressionAttributeNames = Object.fromEntries(
    updateEntries.map(([k], i) => [`#k${i}`, k])
  );
  const expressionAttributeValues = marshall(
    Object.fromEntries(updateEntries.map(([, v], i) => [`:v${i}`, v])),
    { removeUndefinedValues: true }
  );
  
  const command = new UpdateItemCommand({
    TableName: MAIN_TABLE_NAME,
    Key: marshall({ pk, sk }),
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  });
  
  const response = await client.send(command);
  return response.Attributes ? (unmarshall(response.Attributes) as T) : null;
};

export const deleteItem = async (pk: string, sk: string): Promise<void> => {
  const command = new DeleteItemCommand({
    TableName: MAIN_TABLE_NAME,
    Key: marshall({ pk, sk }),
  });
  
  await client.send(command);
};

export const queryByPk = async <T>(
  pk: string,
  skPrefix?: string,
  options?: {
    limit?: number;
    scanIndexForward?: boolean;
  }
): Promise<T[]> => {
  let keyConditionExpression = 'pk = :pk';
  const expressionAttributeValues: Record<string, unknown> = { ':pk': pk };
  
  if (skPrefix) {
    keyConditionExpression += ' AND begins_with(sk, :skPrefix)';
    expressionAttributeValues[':skPrefix'] = skPrefix;
  }
  
  const command = new QueryCommand({
    TableName: MAIN_TABLE_NAME,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: marshall(expressionAttributeValues),
    Limit: options?.limit,
    ScanIndexForward: options?.scanIndexForward,
  });
  
  const response = await client.send(command);
  return (response.Items ?? []).map(item => unmarshall(item) as T);
};

export const queryByGsi1 = async <T>(
  gsi1pk: string,
  gsi1skPrefix?: string,
  options?: {
    limit?: number;
    scanIndexForward?: boolean;
  }
): Promise<T[]> => {
  let keyConditionExpression = 'gsi1pk = :gsi1pk';
  const expressionAttributeValues: Record<string, unknown> = { ':gsi1pk': gsi1pk };
  
  if (gsi1skPrefix) {
    keyConditionExpression += ' AND begins_with(gsi1sk, :gsi1skPrefix)';
    expressionAttributeValues[':gsi1skPrefix'] = gsi1skPrefix;
  }
  
  const command = new QueryCommand({
    TableName: MAIN_TABLE_NAME,
    IndexName: 'gsi1',
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: marshall(expressionAttributeValues),
    Limit: options?.limit,
    ScanIndexForward: options?.scanIndexForward,
  });
  
  const response = await client.send(command);
  return (response.Items ?? []).map(item => unmarshall(item) as T);
};

export const batchWriteItems = async (
  items: { put?: object; delete?: { pk: string; sk: string } }[]
): Promise<void> => {
  // DynamoDB batch write limit is 25 items
  const batches: typeof items[] = [];
  for (let i = 0; i < items.length; i += 25) {
    batches.push(items.slice(i, i + 25));
  }
  
  for (const batch of batches) {
    const writeRequests = batch.map(item => {
      if (item.put) {
        return {
          PutRequest: {
            Item: marshall(item.put as Record<string, unknown>, { removeUndefinedValues: true }),
          },
        };
      }
      if (item.delete) {
        return {
          DeleteRequest: {
            Key: marshall({ pk: item.delete.pk, sk: item.delete.sk }),
          },
        };
      }
      throw new Error('Invalid batch write item');
    });
    
    const command = new BatchWriteItemCommand({
      RequestItems: {
        [MAIN_TABLE_NAME]: writeRequests,
      },
    });
    
    await client.send(command);
  }
};

// ============================================
// Conditional Operations
// ============================================

export const putItemIfNotExists = async <T extends object>(
  item: T & { pk: string; sk: string }
): Promise<{ success: boolean; item?: T }> => {
  try {
    const command = new PutItemCommand({
      TableName: MAIN_TABLE_NAME,
      Item: marshall(item, { removeUndefinedValues: true }),
      ConditionExpression: 'attribute_not_exists(pk)',
    });
    
    await client.send(command);
    return { success: true, item };
  } catch (error) {
    if ((error as Error).name === 'ConditionalCheckFailedException') {
      return { success: false };
    }
    throw error;
  }
};

export const incrementCounter = async (
  pk: string,
  sk: string,
  counterField: string,
  maxValue?: number
): Promise<{ success: boolean; newValue: number }> => {
  try {
    let conditionExpression: string | undefined;
    if (maxValue !== undefined) {
      conditionExpression = `#counter < :max`;
    }
    
    const command = new UpdateItemCommand({
      TableName: MAIN_TABLE_NAME,
      Key: marshall({ pk, sk }),
      UpdateExpression: `SET #counter = if_not_exists(#counter, :zero) + :one`,
      ExpressionAttributeNames: { '#counter': counterField },
      ExpressionAttributeValues: marshall({
        ':zero': 0,
        ':one': 1,
        ...(maxValue !== undefined ? { ':max': maxValue } : {}),
      }),
      ConditionExpression: conditionExpression,
      ReturnValues: 'ALL_NEW',
    });
    
    const response = await client.send(command);
    const newValue = response.Attributes
      ? (unmarshall(response.Attributes)[counterField] as number)
      : 1;
    return { success: true, newValue };
  } catch (error) {
    if ((error as Error).name === 'ConditionalCheckFailedException') {
      return { success: false, newValue: maxValue ?? 0 };
    }
    throw error;
  }
};
