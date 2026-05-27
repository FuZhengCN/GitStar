import { NextRequest, NextResponse } from 'next/server';
import { searchRepos } from '@/lib/github';
import { SearchParams } from '@/lib/types';

const ALLOWED = ['q', 'language', 'sort', 'order', 'page', 'per_page', 'created'];

export async function GET(req: NextRequest) {
  const raw = Object.fromEntries(req.nextUrl.searchParams);
  const params: SearchParams = {};

  for (const [key, value] of Object.entries(raw)) {
    if (!ALLOWED.includes(key)) continue;
    if (key === 'page' || key === 'per_page') {
      (params as Record<string, number>)[key] = parseInt(value, 10);
    } else if (key === 'sort') {
      const v = value as string;
      if (['stars', 'forks', 'updated'].includes(v)) params.sort = v as SearchParams['sort'];
    } else if (key === 'order') {
      const v = value as string;
      if (['desc', 'asc'].includes(v)) params.order = v as SearchParams['order'];
    } else {
      (params as Record<string, string>)[key] = value;
    }
  }

  try {
    const data = await searchRepos(params);
    const res = NextResponse.json(data);
    res.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return res;
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    const status = e.status || 500;
    return NextResponse.json({ status, message: e.message || 'Internal error' }, { status });
  }
}
