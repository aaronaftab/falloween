// Environment variable validation and configuration

function validateEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
      `Please add ${name} to your .env file.\n` +
      `See .env.example for reference.`
    );
  }
  return value;
}

// Validate and export configuration
export const config = {
  fal: {
    apiKey: validateEnvVar('FAL_KEY'),
  },
} as const;

