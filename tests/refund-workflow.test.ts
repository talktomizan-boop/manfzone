import { describe, expect, it, vi } from 'vitest';

type FromCall = { table: string; op: string; payload?: any };

function createSupabaseMock() {
  const calls: FromCall[] = [];

  const mock = {
    calls,
    from: (table: string) => {
      if (table === 'refund_approvals') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: 'refund-1',
                  order_id: 'order-1',
                  order: { id: 'order-1', current_state: 'delivered', status: 'delivered', payment_status: 'succeeded' },
                },
                error: null,
              }),
            }),
          }),
          update: (payload: any) => {
            calls.push({ table, op: 'update', payload });
            return { eq: async () => ({ error: null }) };
          },
        };
      }
      if (table === 'order_state_history') {
        return {
          insert: async (payload: any) => {
            calls.push({ table, op: 'insert', payload });
            return { error: null };
          },
        };
      }
      if (table === 'orders') {
        return {
          update: (payload: any) => {
            calls.push({ table, op: 'update', payload });
            return { eq: async () => ({ error: null }) };
          },
        };
      }
      if (table === 'system_activity_log') {
        return {
          insert: async (payload: any) => {
            calls.push({ table, op: 'insert', payload });
            return { error: null };
          },
        };
      }

      return {
        insert: async () => ({ error: null }),
        update: () => ({ eq: async () => ({ error: null }) }),
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
      };
    },
  };

  return mock;
}

describe('refund workflow (admin approval)', () => {
  it('approving a refund updates refund record and transitions the order to refunded with history', async () => {
    const supabaseMock = createSupabaseMock();

    vi.resetModules();
    vi.doMock('~/lib/supabase.client', () => ({ supabase: supabaseMock }));

    const mod = await import('~/services/order.service');

    await mod.approveRefund({
      refundId: 'refund-1',
      approvedAmount: 50,
      reviewedBy: 'admin-1',
      reviewerNotes: 'approved test',
    });

    const refundUpdate = supabaseMock.calls.find((c) => c.table === 'refund_approvals' && c.op === 'update');
    expect(refundUpdate?.payload).toMatchObject({ status: 'approved', approved_amount: 50, reviewed_by: 'admin-1' });

    const historyInsert = supabaseMock.calls.find((c) => c.table === 'order_state_history' && c.op === 'insert');
    expect(historyInsert?.payload).toMatchObject({ order_id: 'order-1', from_state: 'delivered', to_state: 'refunded' });

    const orderUpdate = supabaseMock.calls.find((c) => c.table === 'orders' && c.op === 'update');
    expect(orderUpdate?.payload).toMatchObject({ current_state: 'refunded', status: 'refunded', payment_status: 'refunded' });
  });
});
