import { describe, expect, it, vi } from 'vitest';

// We unit-test the loader query wiring to keep this fast and non-flaky.

type Call = { method: string; args: any[] };

function createChainableQuery(calls: Call[], result: any) {
  return {
    select: (...args: any[]) => {
      calls.push({ method: 'select', args });
      return createChainableQuery(calls, result);
    },
    eq: (...args: any[]) => {
      calls.push({ method: 'eq', args });
      return createChainableQuery(calls, result);
    },
    is: (...args: any[]) => {
      calls.push({ method: 'is', args });
      return createChainableQuery(calls, result);
    },
    order: (...args: any[]) => {
      calls.push({ method: 'order', args });
      return Promise.resolve(result);
    },
  };
}

describe('categories page loader', () => {
  it('queries active, non-deleted categories ordered by display_order', async () => {
    const calls: Call[] = [];
    const supabase = {
      from: vi.fn(() => createChainableQuery(calls, { data: [], error: null })),
    } as any;

    vi.resetModules();
    vi.doMock('~/lib/supabase.server', () => ({
      createSupabaseServerClient: () => ({ supabase }),
    }));

    const mod = await import('~/routes/categories');
    const request = new Request('http://localhost/categories');
    await mod.loader({ request } as any);

    expect(supabase.from).toHaveBeenCalledWith('categories');
    expect(calls.some((c) => c.method === 'eq' && c.args[0] === 'is_active' && c.args[1] === true)).toBe(true);
    expect(calls.some((c) => c.method === 'is' && c.args[0] === 'deleted_at' && c.args[1] === null)).toBe(true);
    expect(calls.some((c) => c.method === 'order' && c.args[0] === 'display_order')).toBe(true);
  });
});
