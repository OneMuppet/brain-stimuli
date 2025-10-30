import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SessionRepository } from "../../../libs/sessionRepo";
import { createSuccessResponse, createErrorResponse } from "../../../libs/response";
import { UpdateSessionRequest } from "../../../types/session";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const sessionId = event.pathParameters?.id;
    
    if (!sessionId) {
      return createErrorResponse("Session ID is required", 400);
    }

    if (!event.body) {
      return createErrorResponse("Request body is required", 400);
    }

    const request: UpdateSessionRequest = JSON.parse(event.body);
    
    if (request.title !== undefined && request.title.trim().length === 0) {
      return createErrorResponse("Title cannot be empty", 400);
    }

    const sessionRepo = new SessionRepository();
    const session = await sessionRepo.updateSession(sessionId, request);

    if (!session) {
      return createErrorResponse("Session not found", 404);
    }

    return createSuccessResponse(session);
  } catch (error) {
    console.error("Error updating session:", error);
    return createErrorResponse("Internal server error", 500);
  }
};
