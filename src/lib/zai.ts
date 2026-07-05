import OpenAI from 'openai';

let zaiInstance: any = null;

export const getZAI = async (): Promise<any> => {
  if (zaiInstance) return zaiInstance;

  // We support GROQ natively, fallback to Gemini or OpenAI
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const apiKey = groqKey || geminiKey || openaiKey;
  if (!apiKey) {
    throw new Error('Missing API key for LLM');
  }

  const isGroq = !!groqKey;
  const baseURL = isGroq
    ? 'https://api.groq.com/openai/v1'
    : (process.env.OPENAI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/');

  const client = new OpenAI({
    apiKey,
    baseURL,
  }) as any;

  // Monkey-patch create to inject Groq's model if missing
  const originalCreate = client.chat.completions.create.bind(client.chat.completions);
  client.chat.completions.create = async (params: any, options?: any) => {
    if (!params.model) {
      if (isGroq) {
        // High quality model for text
        params.model = 'llama-3.3-70b-versatile';
      } else {
        // Default gemini model
        params.model = 'gemini-1.5-flash';
      }
    }
    if (params.thinking) {
      delete params.thinking;
    }
    return originalCreate(params, options);
  };

  // The application relies on a non-standard createVision method. 
  // We'll implement it here to map to the standard create method with a vision model.
  client.chat.completions.createVision = async (params: any, options?: any) => {
    if (!params.model) {
      if (isGroq) {
        params.model = 'meta-llama/llama-4-scout-17b-16e-instruct'; // Groq vision model
      } else {
        params.model = 'gemini-1.5-pro'; // Gemini vision model
      }
    }
    // Remove thinking block if present as vision models might not support it
    if (params.thinking) {
      delete params.thinking;
    }
    return originalCreate(params, options);
  };

  zaiInstance = client;
  return zaiInstance;
};
