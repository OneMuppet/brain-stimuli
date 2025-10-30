import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SessionRepository } from "../../../libs/sessionRepo";
import { createSuccessResponse, createErrorResponse } from "../../../libs/response";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const sessionId = event.pathParameters?.id;
    
    if (!sessionId) {
      return createErrorResponse("Session ID is required", 400);
    }

    const sessionRepo = new SessionRepository();
    const session = await sessionRepo.getSession(sessionId);

    if (!session) {
      return createErrorResponse("Session not found", 404);
    }

    return createSuccessResponse(session);
  } catch (error) {
    console.error("Error getting session:", error);
    return createErrorResponse("Internal server error", 500);
  }
};
