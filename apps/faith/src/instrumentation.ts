export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { warmDb } = await import("./db");
    await warmDb();
    console.log("[db] Neon connection warmed");
  }
}