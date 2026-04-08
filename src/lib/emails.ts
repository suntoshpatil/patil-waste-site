const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://patilwasteremoval.com'
const REPLY_TO = 'suntosh@patilwasteremoval.com'

// HTML-escape any value interpolated into email templates. Protects against
// HTML/script injection via customer-controlled fields (first_name, plan name,
// invoice line descriptions, etc.) that originate from the public signup form
// or the database.
const esc = (v: unknown): string => {
  if (v === null || v === undefined) return ''
  return String(v).replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      case "'": return '&#39;'
      default: return c
    }
  })
}

// Sanitize values interpolated into email subject lines. Strips control
// characters (CR/LF/tab/etc) and caps length — defense in depth against
// header-injection attempts and display-breaking long strings.
const subj = (v: unknown, max = 100): string =>
  String(v ?? '').replace(/[\r\n\t\x00-\x1f]+/g, ' ').slice(0, max).trim()

export function invoiceEmail(customer: any, invoice: any, lines: any[]) {
  const lineRows = lines.map(l =>
    `<tr><td style="padding:8px 0;color:#555;font-size:15px">${esc(l.description)}</td><td style="padding:8px 0;text-align:right;font-size:15px;color:#222">$${Number(l.amount).toFixed(2)}</td></tr>`
  ).join('')

  return {
    from: 'Patil Waste Removal <billing@patilwasteremoval.com>',
    reply_to: REPLY_TO,
    to: customer.email,
    subject: `Your invoice is ready — $${Number(invoice.total).toFixed(2)} due ${invoice.due_date}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#fff">
        <div style="background:#1a1a1a;padding:28px 32px">
          <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:1px">PATIL WASTE REMOVAL</h1>
          <p style="color:#4caf50;margin:4px 0 0;font-size:13px">Bedford, NH · (802) 416-9484</p>
        </div>
        <div style="padding:32px">
          <p style="color:#333;font-size:16px">Hi ${esc(customer.first_name)},</p>
          <p style="color:#555;font-size:15px">Your invoice for <strong>${esc(invoice.period_start)}</strong> through <strong>${esc(invoice.period_end)}</strong> is ready.</p>

          <div style="border:1px solid #e5e5e5;border-radius:8px;padding:20px 24px;margin:24px 0">
            <table style="width:100%;border-collapse:collapse">
              ${lineRows}
              ${invoice.adjustments_total > 0 ? `<tr><td style="padding:8px 0;color:#2e7d32;font-size:15px">Skip Credits</td><td style="padding:8px 0;text-align:right;font-size:15px;color:#2e7d32">-$${Number(invoice.adjustments_total).toFixed(2)}</td></tr>` : ''}
              <tr style="border-top:2px solid #e5e5e5">
                <td style="padding:12px 0 0;font-size:17px;font-weight:700;color:#111">Total Due</td>
                <td style="padding:12px 0 0;text-align:right;font-size:20px;font-weight:700;color:#2e7d32">$${Number(invoice.total).toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <p style="color:#555;font-size:14px"><strong>Due date:</strong> ${invoice.due_date}</p>

          ${customer.auto_pay
            ? `<div style="background:#f0faf0;border:1px solid #c8e6c9;border-radius:6px;padding:14px 18px;margin:20px 0">
                <p style="margin:0;color:#2e7d32;font-size:14px">✅ <strong>Auto-pay is enabled.</strong> Your card on file will be charged on ${invoice.due_date}. No action needed.</p>
               </div>`
            : `<div style="text-align:center;margin:28px 0">
                <a href="${SITE_URL}/portal" style="background:#2e7d32;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:700;display:inline-block">Pay Now →</a>
                <p style="color:#999;font-size:13px;margin-top:10px">Or log in at ${SITE_URL}/portal</p>
               </div>`
          }

          <p style="color:#999;font-size:13px;margin-top:32px">Questions? Reply to this email or call/text <a href="tel:8024169484" style="color:#2e7d32">(802) 416-9484</a>.</p>
        </div>
        <div style="background:#f5f5f5;padding:20px 32px;border-top:1px solid #e5e5e5">
          <p style="color:#999;font-size:12px;margin:0">Patil Waste Removal · 80 Palomino Ln, Bedford NH 03110 · <a href="tel:8024169484" style="color:#999">(802) 416-9484</a></p>
        </div>
      </div>
    `,
  }
}

export function receiptEmail(customer: any, invoice: any, chargedAmount: number) {
  return {
    from: 'Patil Waste Removal <billing@patilwasteremoval.com>',
    reply_to: REPLY_TO,
    to: customer.email,
    subject: `Payment confirmed — $${chargedAmount.toFixed(2)} received`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#fff">
        <div style="background:#1a1a1a;padding:28px 32px">
          <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:1px">PATIL WASTE REMOVAL</h1>
          <p style="color:#4caf50;margin:4px 0 0;font-size:13px">Bedford, NH · (802) 416-9484</p>
        </div>
        <div style="padding:32px;text-align:center">
          <div style="font-size:48px;margin-bottom:16px">✅</div>
          <h2 style="color:#111;margin:0 0 8px">Payment Received</h2>
          <p style="color:#555;font-size:15px">Hi ${esc(customer.first_name)}, we received your payment of</p>
          <div style="font-size:36px;font-weight:700;color:#2e7d32;margin:16px 0">$${chargedAmount.toFixed(2)}</div>
          <p style="color:#999;font-size:13px">Period: ${esc(invoice.period_start)} – ${esc(invoice.period_end)}</p>
          <p style="color:#999;font-size:13px;margin-top:32px">Questions? Reply to this email or call/text <a href="tel:8024169484" style="color:#2e7d32">(802) 416-9484</a></p>
        </div>
        <div style="background:#f5f5f5;padding:20px 32px;border-top:1px solid #e5e5e5">
          <p style="color:#999;font-size:12px;margin:0">Patil Waste Removal · 80 Palomino Ln, Bedford NH 03110 · <a href="tel:8024169484" style="color:#999">(802) 416-9484</a></p>
        </div>
      </div>
    `,
  }
}

export function failedPaymentEmail(customer: any, amount: number) {
  return {
    from: 'Patil Waste Removal <billing@patilwasteremoval.com>',
    reply_to: REPLY_TO,
    to: customer.email,
    subject: `Action required — payment of $${amount.toFixed(2)} failed`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#fff">
        <div style="background:#1a1a1a;padding:28px 32px">
          <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:1px">PATIL WASTE REMOVAL</h1>
          <p style="color:#4caf50;margin:4px 0 0;font-size:13px">Bedford, NH · (802) 416-9484</p>
        </div>
        <div style="padding:32px">
          <p style="color:#333;font-size:16px">Hi ${esc(customer.first_name)},</p>
          <p style="color:#555;font-size:15px">We were unable to charge your card on file for <strong>$${amount.toFixed(2)}</strong>. Please log in to update your payment method or pay manually.</p>
          <div style="text-align:center;margin:28px 0">
            <a href="${SITE_URL}/portal" style="background:#dc2626;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:700;display:inline-block">Update Payment →</a>
          </div>
          <p style="color:#999;font-size:13px">Questions? Reply to this email or call/text <a href="tel:8024169484" style="color:#2e7d32">(802) 416-9484</a>.</p>
        </div>
        <div style="background:#f5f5f5;padding:20px 32px;border-top:1px solid #e5e5e5">
          <p style="color:#999;font-size:12px;margin:0">Patil Waste Removal · 80 Palomino Ln, Bedford NH 03110 · <a href="tel:8024169484" style="color:#999">(802) 416-9484</a></p>
        </div>
      </div>
    `,
  }
}

export function signupConfirmationEmail(customer: any, planName: string, startDate: string) {
  return {
    from: 'Patil Waste Removal <hello@patilwasteremoval.com>',
    reply_to: REPLY_TO,
    to: customer.email,
    subject: `Welcome to Patil Waste Removal, ${subj(customer.first_name)}!`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#fff">
        <div style="background:#1a1a1a;padding:28px 32px">
          <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:1px">PATIL WASTE REMOVAL</h1>
          <p style="color:#4caf50;margin:4px 0 0;font-size:13px">Bedford, NH · (802) 416-9484</p>
        </div>
        <div style="padding:32px">
          <p style="color:#333;font-size:16px">Hi ${esc(customer.first_name)},</p>
          <p style="color:#555;font-size:15px">Thanks for signing up! We've received your request and will be in touch shortly to confirm your pickup schedule.</p>
          <div style="background:#f9f9f9;border:1px solid #e5e5e5;border-radius:8px;padding:20px 24px;margin:24px 0">
            <p style="margin:0 0 8px;font-size:13px;color:#999;text-transform:uppercase;letter-spacing:1px">Your Plan</p>
            <p style="margin:0;font-size:18px;font-weight:700;color:#111">${esc(planName)}</p>
            ${startDate ? `<p style="margin:8px 0 0;font-size:14px;color:#555">Requested start: <strong>${esc(startDate)}</strong></p>` : ''}
          </div>
          <p style="color:#555;font-size:14px">You'll receive a service agreement to review and sign before your first pickup. In the meantime, feel free to call or text us at <a href="tel:8024169484" style="color:#2e7d32">(802) 416-9484</a>.</p>
          <div style="margin:28px 0;text-align:center">
            <a href="${SITE_URL}/portal" style="background:#2e7d32;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px">View My Account →</a>
          </div>
        </div>
        <div style="background:#f5f5f5;padding:20px 32px;border-top:1px solid #e5e5e5">
          <p style="color:#999;font-size:12px;margin:0">Patil Waste Removal · 80 Palomino Ln, Bedford NH 03110 · <a href="tel:8024169484" style="color:#999">(802) 416-9484</a></p>
        </div>
      </div>
    `
  }
}

export function contractReadyEmail(customer: any, planName: string, pickupDay: string, startDate: string) {
  const portalUrl = `${SITE_URL}/portal`
  const dayLabel = pickupDay ? pickupDay.charAt(0).toUpperCase() + pickupDay.slice(1) : 'your scheduled day'
  return {
    from: 'Patil Waste Removal <hello@patilwasteremoval.com>',
    reply_to: REPLY_TO,
    to: customer.email,
    subject: `Your Patil Waste Removal contract is ready to sign`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#fff">
        <div style="background:#1a1a1a;padding:28px 32px">
          <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:1px">PATIL WASTE REMOVAL</h1>
          <p style="color:#4caf50;margin:4px 0 0;font-size:13px">Bedford, NH · (802) 416-9484</p>
        </div>
        <div style="padding:32px">
          <p style="color:#333;font-size:16px">Hi ${esc(customer.first_name)},</p>
          <p style="color:#555;font-size:15px">Great news — your account has been set up and your service agreement is ready to review and sign. Here are your details:</p>

          <div style="background:#f9f9f9;border:1px solid #e5e5e5;border-radius:8px;padding:20px 24px;margin:24px 0">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:6px 0;color:#555;font-size:14px">Plan</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#111;font-size:14px">${esc(planName)}</td></tr>
              <tr><td style="padding:6px 0;color:#555;font-size:14px">Pickup day</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#2e7d32;font-size:14px">${esc(dayLabel)}s</td></tr>
              ${startDate ? `<tr><td style="padding:6px 0;color:#555;font-size:14px">First pickup</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#111;font-size:14px">${esc(startDate)}</td></tr>` : ''}
            </table>
          </div>

          <p style="color:#333;font-size:15px;font-weight:600;margin-bottom:6px">How to sign your contract:</p>
          <ol style="color:#555;font-size:14px;line-height:2;padding-left:20px;margin:0 0 24px">
            <li>Go to <a href="${portalUrl}" style="color:#2e7d32">${portalUrl}</a></li>
            <li>Enter the email address this was sent to</li>
            <li>Create a 4-digit PIN — you'll use this to log in each time</li>
            <li>Review and accept your service agreement</li>
          </ol>

          <div style="text-align:center;margin:28px 0">
            <a href="${portalUrl}" style="background:#2e7d32;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:700;display:inline-block">Sign My Contract →</a>
          </div>

          <p style="color:#999;font-size:13px">Questions? Reply to this email or call/text <a href="tel:8024169484" style="color:#2e7d32">(802) 416-9484</a>.</p>
        </div>
        <div style="background:#f5f5f5;padding:20px 32px;border-top:1px solid #e5e5e5">
          <p style="color:#999;font-size:12px;margin:0">Patil Waste Removal · 80 Palomino Ln, Bedford NH 03110 · <a href="tel:8024169484" style="color:#999">(802) 416-9484</a></p>
        </div>
      </div>
    `
  }
}

export function contractAcceptedEmail(customer: any, planName: string, firstPickup: string, firstInvoiceTotal: number) {
  return {
    from: 'Patil Waste Removal <hello@patilwasteremoval.com>',
    reply_to: REPLY_TO,
    to: customer.email,
    subject: `You're all set, ${subj(customer.first_name)}! First pickup: ${subj(firstPickup)}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#fff">
        <div style="background:#1a1a1a;padding:28px 32px">
          <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:1px">PATIL WASTE REMOVAL</h1>
          <p style="color:#4caf50;margin:4px 0 0;font-size:13px">Bedford, NH · (802) 416-9484</p>
        </div>
        <div style="padding:32px">
          <p style="color:#333;font-size:16px">Hi ${esc(customer.first_name)},</p>
          <p style="color:#555;font-size:15px">Your service agreement has been accepted and your account is now active. Here's what to expect:</p>
          <div style="background:#f0faf0;border:1px solid #c8e6c9;border-radius:8px;padding:20px 24px;margin:24px 0">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:6px 0;color:#555;font-size:14px">Plan</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#111;font-size:14px">${esc(planName)}</td></tr>
              <tr><td style="padding:6px 0;color:#555;font-size:14px">First pickup</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#2e7d32;font-size:14px">${esc(firstPickup)}</td></tr>
              <tr><td style="padding:6px 0;color:#555;font-size:14px">First invoice</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#111;font-size:14px">$${firstInvoiceTotal.toFixed(2)} — due on receipt</td></tr>
            </table>
          </div>
          <p style="color:#555;font-size:14px"><strong>Have your bins at the end of the driveway by 8am</strong> on your pickup day. If you have any questions, reply to this email or call/text <a href="tel:8024169484" style="color:#2e7d32">(802) 416-9484</a>.</p>
          <div style="margin:28px 0;text-align:center">
            <a href="${SITE_URL}/portal" style="background:#2e7d32;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px">View My Portal →</a>
          </div>
        </div>
        <div style="background:#f5f5f5;padding:20px 32px;border-top:1px solid #e5e5e5">
          <p style="color:#999;font-size:12px;margin:0">Patil Waste Removal · 80 Palomino Ln, Bedford NH 03110 · <a href="tel:8024169484" style="color:#999">(802) 416-9484</a></p>
        </div>
      </div>
    `
  }
}

export function paymentConfirmationEmail(customer: any, amount: number, period: string) {
  return {
    from: 'Patil Waste Removal <billing@patilwasteremoval.com>',
    reply_to: REPLY_TO,
    to: customer.email,
    subject: `Payment received — $${amount.toFixed(2)}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#fff">
        <div style="background:#1a1a1a;padding:28px 32px">
          <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:1px">PATIL WASTE REMOVAL</h1>
          <p style="color:#4caf50;margin:4px 0 0;font-size:13px">Bedford, NH · (802) 416-9484</p>
        </div>
        <div style="padding:32px;text-align:center">
          <div style="font-size:48px;margin-bottom:16px">✅</div>
          <h2 style="color:#111;margin:0 0 8px">Payment Received</h2>
          <p style="color:#555;font-size:15px;margin:0 0 24px">Hi ${esc(customer.first_name)}, we received your payment of <strong style="color:#2e7d32">$${amount.toFixed(2)}</strong> for ${esc(period)}.</p>
          <a href="${SITE_URL}/portal" style="background:#2e7d32;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px">View Receipt →</a>
        </div>
        <div style="background:#f5f5f5;padding:20px 32px;border-top:1px solid #e5e5e5">
          <p style="color:#999;font-size:12px;margin:0">Patil Waste Removal · 80 Palomino Ln, Bedford NH 03110 · <a href="tel:8024169484" style="color:#999">(802) 416-9484</a></p>
        </div>
      </div>
    `
  }
}
