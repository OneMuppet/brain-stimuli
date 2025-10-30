/// <reference types="sst" />
// Temporary declarations to satisfy type checker in this environment
// They will be provided by SST during dev/build
declare const $app: any;
declare const $config: any;
declare const sst: any;

export default $config({
  app(input: { stage?: string }) {
    return {
      name: "sst-backend-template-test", // TODO Is it really correct to include "-test" in the name here ?
      home: "aws",
      providers: {
        aws: { region: process.env.AWS_REGION || "eu-north-1" },
      },
      removal: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    // Load environment variables from .env files
    const fs = require("node:fs");
    const path = require("node:path");

    // Load stage-specific .env file
    const envFile = `.env.${$app.stage}`;
    const envPath = path.join(process.cwd(), envFile);

    console.log(`Loading env file: ${envFile} from ${envPath}`);
    console.log(`Stage: ${$app.stage}`);

    interface EnvVars {
      [x: string]: any;
    }

    const envVars: EnvVars = {};

    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8");
      console.log("Env file content:", envContent);
      envContent.split("\n").forEach((line: string) => {
        // Ignore empty lines entirely
        if (!line || !line.trim()) return;
        // Ignore full-line comments starting with '#'
        if (line.trim().startsWith("#")) return;

        const [key, ...valueParts] = line.split("=");
        if (key && valueParts.length > 0) {
          // Join back the value portion in case it contained '='
          let valueRaw = valueParts.join("=");
          // Strip inline comments (everything after an unescaped '#')
          const hashIndex = valueRaw.indexOf("#");
          if (hashIndex !== -1) {
            valueRaw = valueRaw.substring(0, hashIndex);
          }
          const value = valueRaw.trim();
          if (key.trim()) {
            envVars[key.trim()] = value;
          }
        }
      });
    } else {
      console.warn(`⚠️  Environment file ${envFile} not found. Using defaults.`);
    }

    // For frontend-only deployment, we don't require AWS account envs
    console.log("Loaded env vars:", envVars);

    // Add external custom authorizer by ARN
    // Uncomment and configure if you have an existing authorizer function
    /*
    const externalAuthorizer = api.addAuthorizer("ExternalAuthorizer", {
      lambda: {
        functionArn: envVars.AUTHORIZER_ARN, // ARN of your existing authorizer function
        identitySources: ["$request.header.Authorization"],
        ttl: "3600 seconds" // Cache authorization for 1 hour
      }
    });
    */

    // Add JWT authorizer example (alternative to Lambda authorizer)
    /*
    const jwtAuthorizer = api.addAuthorizer("JWTAuthorizer", {
      jwt: {
        issuer: envVars.JWT_ISSUER || "https://your-auth-provider.com",
        audiences: [envVars.JWT_AUDIENCE || "your-api-audience"],
        identitySource: "$request.header.Authorization"
      }
    });
    */

    // Next.js app hosting via SST
    const web = new sst.aws.Nextjs("Web", {
      path: "./web",
      environment: {},
    });

    // Outputs
    return {
      WebUrl: web.url,
      Stage: $app.stage,
      // Uncomment if using authorizers
      // ExternalAuthorizerId: externalAuthorizer?.id,
      // JWTAuthorizerId: jwtAuthorizer?.id,
    };
  },
});
