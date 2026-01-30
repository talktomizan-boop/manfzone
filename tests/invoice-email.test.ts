import { describe, expect, it } from 'vitest';
import { renderInvoiceEmail } from '~/lib/email.server';

describe('invoice email rendering', () => {
  it('includes required invoice fields', () => {
    const html = renderInvoiceEmail({
      invoiceNumber: 'INV-TEST-0001',
      orderNumber: 'ORD-TEST-0001',
      orderDate: '2026-01-18',
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      billingAddress: '123 Billing St',
      shippingAddress: '456 Shipping Ave',
      items: [
        { name: 'Widget', quantity: 2, unitPrice: 10 },
      ],
      subtotal: 20,
      tax: 0,
      discount: 0,
      total: 20,
      paymentStatus: 'pending',
    });

    expect(html).toContain('INV-TEST-0001');
    expect(html).toContain('ORD-TEST-0001');
    expect(html).toContain('Test Customer');
    expect(html).toContain('test@example.com');
    expect(html).toContain('Widget');
    expect(html).toContain('Subtotal');
    expect(html).toContain('Total');
    expect(html).toContain('Payment Status');
  });
});
