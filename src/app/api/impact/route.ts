import { impact } from '@/lib/impact';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  try { const data = await impact(new URL(req.url).searchParams.get('advisory') || '');
    return Response.json(data || {error:'Advisory not found'}, {status:data ? 200 : 404});
  } catch { return Response.json({error:'Unable to load affected areas'}, {status:503}); }
}
