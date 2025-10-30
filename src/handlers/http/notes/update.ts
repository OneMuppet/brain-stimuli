import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { NoteRepository } from "../../../libs/noteRepo";
import { createSuccessResponse, createErrorResponse } from "../../../libs/response";
import { UpdateNoteRequest } from "../../../types/note";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const noteId = event.pathParameters?.id;
    
    if (!noteId) {
      return createErrorResponse("Note ID is required", 400);
    }

    if (!event.body) {
      return createErrorResponse("Request body is required", 400);
    }

    const request: UpdateNoteRequest = JSON.parse(event.body);
    
    if (!request.content || request.content.trim().length === 0) {
      return createErrorResponse("Content is required", 400);
    }

    // For now, we'll need to find the sessionId from the note
    // In a real app, you might want to include sessionId in the path or request
    const sessionId = "default_session"; // This should be extracted from the note or path

    const noteRepo = new NoteRepository();
    const note = await noteRepo.updateNote(noteId, request, sessionId);

    if (!note) {
      return createErrorResponse("Note not found", 404);
    }

    return createSuccessResponse(note);
  } catch (error) {
    console.error("Error updating note:", error);
    return createErrorResponse("Internal server error", 500);
  }
};
