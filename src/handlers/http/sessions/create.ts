import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SessionRepository } from "../../../libs/sessionRepo";
import { createSuccessResponse, createErrorResponse } from "../../../libs/response";
import { CreateSessionRequest } from "../../../types/session";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return createErrorResponse("Request body is required", 400);
    }

    const request: CreateSessionRequest = JSON.parse(event.body);
    
    if (!request.title || request.title.trim().length === 0) {
      return createErrorResponse("Title is required", 400);
    }

    const sessionRepo = new SessionRepository();
    const session = await sessionRepo.createSession(request);

    return createSuccessResponse(session, 201);
  } catch (error) {
    console.error("Error creating session:", error);
    return createErrorResponse("Internal server error", 500);
  }
};
