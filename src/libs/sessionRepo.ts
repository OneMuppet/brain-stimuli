import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { Session, CreateSessionRequest, UpdateSessionRequest } from "../types/session";

const getTableName = (): string => {
  return process.env.TABLE_NAME || "brain-stimuli-table";
};

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export class SessionRepository {
  async createSession(request: CreateSessionRequest): Promise<Session> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userId = request.userId || "default_user";
    const now = Date.now();

    const session: Session = {
      id: sessionId,
      title: request.title,
      createdAt: now,
      lastModified: now,
      score: 0,
      userId,
    };

    const item = {
      pk: `SESSION#${userId}`,
      sk: `SESSION#${sessionId}`,
      gsi1pk: `USER#${userId}`,
      gsi1sk: `CREATED#${now}`,
      entityType: "session",
      ...session,
    };

    await ddbDocClient.send(new PutCommand({
      TableName: getTableName(),
      Item: item,
    }));

    return session;
  }

  async getSession(sessionId: string, userId: string = "default_user"): Promise<Session | null> {
    const result = await ddbDocClient.send(new GetCommand({
      TableName: getTableName(),
      Key: {
        pk: `SESSION#${userId}`,
        sk: `SESSION#${sessionId}`,
      },
    }));

    if (!result.Item) {
      return null;
    }

    return {
      id: result.Item.id,
      title: result.Item.title,
      createdAt: result.Item.createdAt,
      lastModified: result.Item.lastModified,
      score: result.Item.score,
      userId: result.Item.userId,
    };
  }

  async listSessions(userId: string = "default_user"): Promise<Session[]> {
    const result = await ddbDocClient.send(new QueryCommand({
      TableName: getTableName(),
      IndexName: "GSI1",
      KeyConditionExpression: "gsi1pk = :gsi1pk",
      ExpressionAttributeValues: {
        ":gsi1pk": `USER#${userId}`,
      },
      ScanIndexForward: false, // Sort by creation time descending
    }));

    return (result.Items || [])
      .filter(item => item.entityType === "session")
      .map(item => ({
        id: item.id,
        title: item.title,
        createdAt: item.createdAt,
        lastModified: item.lastModified,
        score: item.score,
        userId: item.userId,
      }));
  }

  async updateSession(sessionId: string, updates: UpdateSessionRequest, userId: string = "default_user"): Promise<Session | null> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (updates.title !== undefined) {
      updateExpressions.push("#title = :title");
      expressionAttributeNames["#title"] = "title";
      expressionAttributeValues[":title"] = updates.title;
    }

    if (updates.score !== undefined) {
      updateExpressions.push("#score = :score");
      expressionAttributeNames["#score"] = "score";
      expressionAttributeValues[":score"] = updates.score;
    }

    updateExpressions.push("lastModified = :lastModified");
    expressionAttributeValues[":lastModified"] = Date.now();

    const result = await ddbDocClient.send(new UpdateCommand({
      TableName: getTableName(),
      Key: {
        pk: `SESSION#${userId}`,
        sk: `SESSION#${sessionId}`,
      },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    }));

    if (!result.Attributes) {
      return null;
    }

    return {
      id: result.Attributes.id,
      title: result.Attributes.title,
      createdAt: result.Attributes.createdAt,
      lastModified: result.Attributes.lastModified,
      score: result.Attributes.score,
      userId: result.Attributes.userId,
    };
  }
}
