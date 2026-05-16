import Anthropic from '@anthropic-ai/sdk';
import { Event } from '../models/Event';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface Risk {
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface AIAnalysis {
  summary: string;
  risks: Risk[];
  recommendations: string[];
}

export const analyzeEvents = async (events: Event[]): Promise<AIAnalysis> => {
  if (events.length === 0) {
    return {
      summary: 'No recent activity to analyze. Project appears idle.',
      risks: [],
      recommendations: ['Continue monitoring for incoming events.'],
    };
  }

  const eventsText = events
    .slice(0, 30)
    .map(e => `[${e.source.toUpperCase()}][${e.type}] ${JSON.stringify(e.payload)}`)
    .join('\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system:
      'You are a project intelligence analyst for an enterprise software team. Analyze project events and return structured JSON only — no prose outside the JSON object.',
    messages: [
      {
        role: 'user',
        content: `Analyze these recent project events and return a JSON object:

${eventsText}

Return exactly this structure:
{
  "summary": "2-3 sentence plain English assessment of overall project health",
  "risks": [
    { "description": "specific risk", "severity": "low|medium|high" }
  ],
  "recommendations": [
    "concrete actionable recommendation"
  ]
}

Focus on: merge conflicts, blocked tickets, stalled PRs, deployment risks, bottlenecks, and communication gaps.`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected Claude response type');

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in Claude response');

  return JSON.parse(jsonMatch[0]) as AIAnalysis;
};
