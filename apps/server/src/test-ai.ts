import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

async function run() {
  try {
    console.log("Testing AI generation...");
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      prompt: "Reply with the word 'SUCCESS' if you can read this.",
    });
    console.log("AI Response:", text);
    process.exit(0);
  } catch (err) {
    console.error("AI Error:", err);
    process.exit(1);
  }
}
run();
