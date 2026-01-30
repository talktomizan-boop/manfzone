import { describe, expect, it, vi } from 'vitest';

type Call = { method: string; args: any[] };

function createCategoryQuery(calls: Call[], categories: any[]) {
  return {
    select: (...args: any[]) => {
      calls.push({ method: 'select', args });
      return createCategoryQuery(calls, categories);
    },
    eq: (...args: any[]) => {
      calls.push({ method: 'eq', args });
      return createCategoryQuery(calls, categories);
    },
    is: (...args: any[]) => {
      calls.push({ method: 'is', args });
      return createCategoryQuery(calls, categories);
    },
    order: (...args: any[]) => {
      calls.push({ method: 'order', args });
      return Promise.resolve({ data: categories, error: null });
    },
  };
}

describe('products loader category integration', () => {
  it('loads categories and passes search params to search_products RPC', async () => {
    const calls: Call[] = [];
    const rpcCalls: any[] = [];

    const supabase = {
      from: vi.fn(() => createCategoryQuery(calls, [
        { id: 'cat-1', name: 'Electronics', slug: 'electronics' },
      ])),
      rpc: vi.fn(async (...args: any[]) => {
        rpcCalls.push(args);
        return { data: [], error: null };
      }),
    } as any;

    vi.resetModules();
    vi.doMock('~/lib/supabase.server', () => ({
      createSupabaseServerClient: () => ({ supabase }),
    }));

    const mod = await import('~/routes/products');
    const request = new Request('http://localhost/products?category=electronics&q=phone&sort=newest');
    const result = await mod.loader({ request } as any);

    expect(supabase.from).toHaveBeenCalledWith('categories');
    expect(calls.some((c) => c.method === 'is' && c.args[0] === 'deleted_at' && c.args[1] === null)).toBe(true);
    expect(supabase.rpc).toHaveBeenCalled();
    expect(rpcCalls[0][0]).toBe('search_products');
    expect(rpcCalls[0][1]).toMatchObject({ q: 'phone', category_slug: 'electronics', sort_key: 'newest' });

    expect(result).toHaveProperty('categories');
    expect(Array.isArray((result as any).categories)).toBe(true);
  });
});
