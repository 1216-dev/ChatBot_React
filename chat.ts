// lib/api.ts
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure the environment variable is correctly loaded
});

export async function getChatGPTResponse(message: string): Promise<string> {
  try {
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: message }],
    });

    return chatCompletion.choices[0].message.content || "I couldn't generate a response.";
  } catch (error) {
    console.error('Error calling OpenAI API:', error); // Log errors for debugging
    throw new Error('Error in processing your request');
  }
}
