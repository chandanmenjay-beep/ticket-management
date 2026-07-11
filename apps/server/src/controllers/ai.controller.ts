import { Request, Response } from 'express';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

export const polishText = async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const { text: polishedText } = await generateText({
      model: google('gemini-2.5-flash'),
      prompt: `You are an expert customer support agent. Polish the following draft reply to a customer. 
Make it professional, polite, empathetic, and clear. Fix any grammar and spelling mistakes. 
Ensure the reply is properly formatted with paragraphs and spacing.
Sign the email with exactly: "Chandan Mahato" (do not add any other placeholder names).
Do not hallucinate or add any new information not present in the draft. 
Return ONLY the polished text without any quotes or preamble.\n\nDraft:\n${text}`,
    });

    res.json({ polishedText });
  } catch (error) {
    console.error('Error polishing text:', error);
    res.status(500).json({ error: 'Failed to polish text' });
  }
};

export const summarizeTicket = async (req: Request, res: Response) => {
  try {
    const { subject, messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages are required' });
    }

    const formattedThread = messages.map((m: any) => 
      `[${m.senderType}]: ${m.bodyText}`
    ).join('\n\n');

    const { text: summary } = await generateText({
      model: google('gemini-2.5-flash'),
      prompt: `You are an expert customer support assistant. Please summarize the following support ticket and conversation thread. Provide a concise summary of the customer's problem and the current status of the resolution. Keep it short (2-4 sentences max).\n\nSubject: ${subject}\n\nThread:\n${formattedThread}`,
    });

    res.json({ summary });
  } catch (error) {
    console.error('Error summarizing ticket:', error);
    res.status(500).json({ error: 'Failed to summarize ticket' });
  }
};
