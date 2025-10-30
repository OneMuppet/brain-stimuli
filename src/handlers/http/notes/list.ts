import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { NoteRepository } from "../../../libs/noteRepo";
import { createSuccessResponse, createErrorResponse } from "../../../libs/response";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const sessionId = event.pathParameters?.sessionId;
    
    if (!sessionId) {
      return createErrorResponse("Session ID is required", 400);
    }

    const noteRepo = new NoteRepository();
    const notes = await noteRepo.listNotes(sessionId);

    return createSuccessResponse(notes);
  } catch (error) {
    console.error("Error listing notes:", error);
    return createErrorResponse("Internal server error", 500);
  }
};
