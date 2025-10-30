import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { NoteRepository } from "../../../libs/noteRepo";
import { createSuccessResponse, createErrorResponse } from "../../../libs/response";
import { CreateNoteRequest } from "../../../types/note";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const sessionId = event.pathParameters?.sessionId;
    
    if (!sessionId) {
      return createErrorResponse("Session ID is required", 400);
    }

    if (!event.body) {
      return createErrorResponse("Request body is required", 400);
    }

    const request: CreateNoteRequest = JSON.parse(event.body);
    request.sessionId = sessionId; // Ensure sessionId matches path parameter
    
    if (!request.content || request.content.trim().length === 0) {
      return createErrorResponse("Content is required", 400);
    }

    const noteRepo = new NoteRepository();
    const note = await noteRepo.createNote(request);

    return createSuccessResponse(note, 201);
  } catch (error) {
    console.error("Error creating note:", error);
    return createErrorResponse("Internal server error", 500);
  }
};
