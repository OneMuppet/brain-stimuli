// This file has intentionally bad formatting to test Biome
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { notOk500, ok } from "@/libs/response";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  console.log("Testing formatting");
  const data = { status: "test", message: "This should be formatted" };
  return ok(data);
};
