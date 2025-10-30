// This file has intentional linting issues
import { APIGatewayProxyHandlerV2 } from "aws-lambda";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  // Unused variable
  const _unusedVar = "this should trigger a linting error";

  // Console.log (should be allowed since we set it to 'off')
  console.log("This should be allowed");

  // Missing return type
  const _badFunction = (x) => {
    return x * 2;
  };

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "test" }),
  };
};
