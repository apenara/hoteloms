// src/app/api/notifications/send/route.ts
import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebase/admin-config';

export async function POST(request: Request) {
  try {
    const { notification, data, tokens } = await request.json();

    // Validate the payload
    if (!notification || !notification.title || !notification.body) {
      return NextResponse.json(
        { error: 'Invalid payload: Missing notification title or body' },
        { status: 400 }
      );
    }

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload: Missing or empty tokens array' },
        { status: 400 }
      );
    }

    const message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: data || {},
      };

    const response = await admin.messaging().sendEachForMulticast({
        tokens,
        ...message,
    });

    // Check for failures
    const failedTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        console.error(
          `Error sending to token ${tokens[idx]}:`,
          resp.error
        );
        failedTokens.push(tokens[idx]);
      }
    });

    if (failedTokens.length > 0) {
      console.error(`Failed to send to ${failedTokens.length} tokens`);
    }

    return NextResponse.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens,
    });
  } catch (error) {
    console.error('Error sending notification:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      return NextResponse.json(
        { error: 'An unexpected error occurred' },
        { status: 500 }
      );
    }
  }
}
