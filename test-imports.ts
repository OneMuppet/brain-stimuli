// Test import organization

import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ItemRepository } from "@/libs/itemRepo";
import { notOk500, ok } from "@/libs/response";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  return ok({ message: "test" });
};
