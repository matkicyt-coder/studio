
'use server';

/**
 * @fileOverview AI Report Review Agent.
 *
 * This flow analyzes user reports and provides a moderation verdict.
 */

import { ai, z } from '@/ai/genkit';

const ReviewReportInputSchema = z.object({
  reportReason: z.string().describe('The reason given by the reporter.'),
  reportId: z.string().describe('The ID of the report.'),
});
export type ReviewReportInput = z.infer<typeof ReviewReportInputSchema>;

const ReviewReportOutputSchema = z.object({
  verdict: z.enum(['harmful', 'benign', 'uncertain']).describe('The overall verdict of the report.'),
  severity: z.enum(['none', 'low', 'medium', 'high']).describe('The severity level of the violation.'),
  suggestedAction: z.enum(['none', 'warning', 'temp-1', 'temp-7', 'perm']).describe('The recommended action for the administrator.'),
  reasoning: z.string().describe('A brief explanation of the AI\'s decision.'),
});
export type ReviewReportOutput = z.infer<typeof ReviewReportOutputSchema>;

export async function reviewReport(input: ReviewReportInput): Promise<ReviewReportOutput> {
  return reviewReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'reviewReportPrompt',
  input: { schema: ReviewReportInputSchema },
  output: { schema: ReviewReportOutputSchema },
  prompt: `You are an AI Trust and Safety agent for a digital social portal.
Your task is to analyze user reports and provide a structured moderation verdict.

Report ID: {{{reportId}}}
Report Reason: {{{reportReason}}}

Analyze the reason provided and determine if it suggests a violation of community standards (e.g., harassment, spam, offensive content).
Suggest a severity level and a corresponding action for the human moderator to take.`,
});

const reviewReportFlow = ai.defineFlow(
  {
    name: 'reviewReportFlow',
    inputSchema: ReviewReportInputSchema,
    outputSchema: ReviewReportOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error('AI failed to generate a review.');
    return output;
  }
);
