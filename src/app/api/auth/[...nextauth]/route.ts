import { handlers } from "@/lib/auth";
import { NextRequest } from "next/server";

// Export handlers directly - NextAuth handles errors internally
export async function GET(req: NextRequest) {
  if (!handlers?.GET) {
    return new Response(
      JSON.stringify({ error: "NextAuth GET handler not available" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  try {
    return await handlers.GET(req);
  } catch (error) {
    console.error("NextAuth GET handler error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!handlers?.POST) {
    return new Response(
      JSON.stringify({ error: "NextAuth POST handler not available" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  try {
    return await handlers.POST(req);
  } catch (error) {
    console.error("NextAuth POST handler error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

