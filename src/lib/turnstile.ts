export async function verifyTurnstileToken(token: string) {
  const secret = import.meta.env.TURNSTILE_SECRET_KEY;
  
  if (!secret) {
    console.error("TURNSTILE_SECRET_KEY is not defined in environment variables.");
    return { success: false, error: "Configuration error" };
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret: secret,
        response: token,
      }),
    }
  );

  const data = await response.json();
  return data;
}
