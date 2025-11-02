import { handlers } from "@/lib/auth";

// Export handlers directly - NextAuth handles errors internally
// Don't wrap in try-catch as NextAuth expects to handle errors itself
export const { GET, POST } = handlers;

