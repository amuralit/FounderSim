import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { v0ChatId, v0ProjectId } = await req.json();
    const results: Record<string, string> = {};

    // Delete v0 chat (unpublishes the generated app)
    if (v0ChatId) {
      try {
        const { v0 } = await import('v0-sdk');
        await v0.chats.delete({ chatId: v0ChatId });
        results.v0Chat = 'deleted';
      } catch (e) {
        console.error('Failed to delete v0 chat:', e);
        results.v0Chat = 'failed';
      }
    }

    // Delete v0 project if it was created
    if (v0ProjectId) {
      try {
        const { v0 } = await import('v0-sdk');
        await v0.projects.delete({ projectId: v0ProjectId });
        results.v0Project = 'deleted';
      } catch (e) {
        console.error('Failed to delete v0 project:', e);
        results.v0Project = 'failed';
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Project cleanup error:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
