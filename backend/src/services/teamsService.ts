import { Alert } from '../models/Alert';

const SEVERITY_COLOR: Record<string, string> = {
  high: 'attention',
  medium: 'warning',
  low: 'accent',
};

export const sendTeamsAlert = async (webhookUrl: string, alert: Alert): Promise<void> => {
  const color = SEVERITY_COLOR[alert.severity] ?? 'default';

  const card = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.3',
          body: [
            {
              type: 'TextBlock',
              text: 'Project Pulse Alert',
              weight: 'Bolder',
              size: 'Medium',
            },
            {
              type: 'ColumnSet',
              columns: [
                {
                  type: 'Column',
                  width: 'auto',
                  items: [
                    {
                      type: 'TextBlock',
                      text: alert.severity.toUpperCase(),
                      color: color,
                      weight: 'Bolder',
                      size: 'Small',
                    },
                  ],
                },
              ],
            },
            {
              type: 'TextBlock',
              text: alert.message,
              wrap: true,
            },
            {
              type: 'TextBlock',
              text: `**Recommended Action:** ${alert.recommendation}`,
              wrap: true,
              spacing: 'Small',
            },
          ],
        },
      },
    ],
  };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(card),
  });

  if (!res.ok) {
    console.error(`Teams notification failed: ${res.status} ${await res.text()}`);
  }
};
