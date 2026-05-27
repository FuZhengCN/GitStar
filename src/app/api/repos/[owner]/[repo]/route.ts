import { NextRequest, NextResponse } from 'next/server';
import { getRepoDetail } from '@/lib/github';

export async function GET(
  _req: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  try {
    const data = await getRepoDetail(params.owner, params.repo);
    const res = NextResponse.json(data);
    res.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return res;
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    const status = e.status || 500;
    return NextResponse.json({ status, message: e.message || 'Internal error' }, { status });
  }
}
