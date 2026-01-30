import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import styles from './floating-chat.module.css';

const WHATSAPP_NUMBER_LOCAL = '01734536707';
// Placeholder for future use (user will provide their FB page later).
const FB_MESSENGER_LINK = '';

function normalizeBdToE164Digits(local: string): string {
  // Accepts formats like "+017...", "017...", "88017..." and returns digits for wa.me
  const digits = local.replace(/\D/g, '');
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return `880${digits.slice(1)}`;
  // Fallback: assume already includes country code.
  return digits;
}

function getWhatsappUrl(numberDigits: string): string {
  const base = `https://wa.me/${numberDigits}`;
  if (typeof window === 'undefined') return base;
  const text = `Hello Manaf Zone! I need help with an order/product.\n\nPage: ${window.location.href}`;
  return `${base}?text=${encodeURIComponent(text)}`;
}

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2.003C6.57 2.003 2.13 6.444 2.13 11.92c0 1.93.55 3.73 1.5 5.25L2 22l4.95-1.6a9.83 9.83 0 0 0 5.09 1.39h.01c5.47 0 9.91-4.44 9.91-9.91 0-2.65-1.03-5.13-2.9-7A9.86 9.86 0 0 0 12.04 2.003Zm5.73 14.31c-.24.67-1.4 1.28-1.93 1.35-.5.07-1.14.1-1.84-.12-.42-.13-.96-.31-1.66-.62-2.92-1.26-4.83-4.19-4.98-4.39-.15-.2-1.18-1.57-1.18-2.99 0-1.42.74-2.12 1-2.41.26-.3.57-.37.76-.37h.55c.18 0 .42-.07.66.5.24.58.82 1.99.89 2.14.07.15.11.33.02.53-.09.2-.13.33-.26.5-.13.17-.27.38-.39.5-.13.13-.26.27-.11.53.15.26.67 1.1 1.44 1.78.99.88 1.83 1.15 2.09 1.28.26.13.41.11.57-.07.16-.18.65-.76.82-1.02.17-.26.35-.22.58-.13.24.09 1.5.71 1.76.84.26.13.44.2.5.31.07.11.07.65-.17 1.32Z" />
    </svg>
  );
}

function MessengerIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.15 2 11.27c0 2.92 1.46 5.52 3.75 7.23V22l3.38-1.86c.9.25 1.86.39 2.87.39 5.52 0 10-4.15 10-9.26C22 6.15 17.52 2 12 2Zm.99 12.46-2.55-2.72-4.99 2.72 5.49-5.83 2.55 2.72 4.99-2.72-5.49 5.83Z" />
    </svg>
  );
}

export function FloatingChatButton() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const whatsappDigits = useMemo(() => normalizeBdToE164Digits(WHATSAPP_NUMBER_LOCAL), []);
  const whatsappHref = useMemo(() => getWhatsappUrl(whatsappDigits), [whatsappDigits]);

  useEffect(() => {
    if (!open) return;

    const onDocMouseDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target && el.contains(e.target as Node)) return;
      setOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={styles.root} aria-label="Chat options">
      {open && (
        <div className={styles.panel} role="menu" aria-label="Chat options">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.itemWhatsapp}
            role="menuitem"
            aria-label="Chat on WhatsApp"
            title="WhatsApp"
          >
            <WhatsAppIcon size={22} />
          </a>

          <a
            href={FB_MESSENGER_LINK || '#'}
            target={FB_MESSENGER_LINK ? '_blank' : undefined}
            rel={FB_MESSENGER_LINK ? 'noopener noreferrer' : undefined}
            onClick={(e) => {
              if (!FB_MESSENGER_LINK) {
                // Placeholder until the user adds their page link.
                e.preventDefault();
              }
            }}
            className={styles.itemMessenger}
            role="menuitem"
            aria-label="Facebook Messenger (link coming soon)"
            title="Facebook Messenger"
          >
            <MessengerIcon size={22} />
          </a>
        </div>
      )}

      <button
        type="button"
        className={styles.fab}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={open ? 'Close chat options' : 'Open chat options'}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={20} aria-hidden /> : <MessageCircle size={20} aria-hidden />}
      </button>
    </div>
  );
}
