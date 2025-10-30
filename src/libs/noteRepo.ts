import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { Note, CreateNoteRequest, UpdateNoteRequest } from "../types/note";

const getTableName = (): string => {
  return process.env.TABLE_NAME || "brain-stimuli-table";
};

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export class NoteRepository {
  async createNote(request: CreateNoteRequest): Promise<Note> {
    const noteId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const note: Note = {
      id: noteId,
      sessionId: request.sessionId,
      content: request.content,
      createdAt: now,
      lastModified: now,
    };

    const item = {
      pk: `SESSION#${request.sessionId}`,
      sk: `NOTE#${now}`,
      gsi1pk: `SESSION#${request.sessionId}`,
      gsi1sk: `MODIFIED#${now}`,
      entityType: "note",
      ...note,
    };

    await ddbDocClient.send(new PutCommand({
      TableName: getTableName(),
      Item: item,
    }));

    return note;
  }

  async listNotes(sessionId: string): Promise<Note[]> {
    const result = await ddbDocClient.send(new QueryCommand({
      TableName: getTableName(),
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `SESSION#${sessionId}`,
        ":skPrefix": "NOTE#",
      },
      ScanIndexForward: false, // Sort by creation time descending
    }));

    return (result.Items || [])
      .filter(item => item.entityType === "note")
      .map(item => ({
        id: item.id,
        sessionId: item.sessionId,
        content: item.content,
        createdAt: item.createdAt,
        lastModified: item.lastModified,
      }));
  }

  async updateNote(noteId: string, updates: UpdateNoteRequest, sessionId: string): Promise<Note | null> {
    // First, find the note to get its sort key
    const notes = await this.listNotes(sessionId);
    const note = notes.find(n => n.id === noteId);
    
    if (!note) {
      return null;
    }

    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (updates.content !== undefined) {
      updateExpressions.push("#content = :content");
      expressionAttributeNames["#content"] = "content";
      expressionAttributeValues[":content"] = updates.content;
    }

    updateExpressions.push("lastModified = :lastModified");
    expressionAttributeValues[":lastModified"] = Date.now();

    const result = await ddbDocClient.send(new UpdateCommand({
      TableName: getTableName(),
      Key: {
        pk: `SESSION#${sessionId}`,
        sk: `NOTE#${note.createdAt}`,
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
      sessionId: result.Attributes.sessionId,
      content: result.Attributes.content,
      createdAt: result.Attributes.createdAt,
      lastModified: result.Attributes.lastModified,
    };
  }
}
