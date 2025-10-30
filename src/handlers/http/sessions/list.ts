import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SessionRepository } from "../../../libs/sessionRepo";
import { createSuccessResponse, createErrorResponse } from "../../../libs/response";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const sessionRepo = new SessionRepository();
    const sessions = await sessionRepo.listSessions();

    return createSuccessResponse(sessions);
  } catch (error) {
    console.error("Error listing sessions:", error);
    return createErrorResponse("Internal server error", 500);
  }
};
