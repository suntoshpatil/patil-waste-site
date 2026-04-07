const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://patil-waste-site.vercel.app'

export function invoiceEmail(customer: any, invoice: any, lines: any[]) {
  const lineRows = lines.map(l =>
    `<tr><td style="padding:8px 0;color:#555;font-size:15px">${l.description}</td><td style="padding:8px 0;text-align:right;font-size:15px;color:#222">$${Number(l.amount).toFixed(2)}</td></tr>`
  ).join('')

  return {
    from: 'Patil Waste Removal <billing@patilwasteremoval.com>',
    to: customer.email,
    subject: `Your invoice is ready — $${Number(invoice.total).toFixed(2)} due ${invoice.due_date}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#fff">
        <div style="background:#1a1a1a;padding:28px 32px">
          <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:1px">PATIL WASTE REMOVAL</h1>
          <p style="color:#4caf50;margin:4px 0 0;font-size:13px">Bedford, NH · (802) 416-9484</p>
        </div>
        <div style="padding:32px">
          <p style="color:#333;font-size:16px">Hi ${customer.first_name},</p>
          <p style="color:#555;font-size:15px">Your invoice for <strong>${invoice.period_start}</strong> through <strong>${invoice.period_end}</strong> is ready.</p>

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
      </div>
    `,
  }
}

export function receiptEmail(customer: any, invoice: any, chargedAmount: number) {
  return {
    from: 'Patil Waste Removal <billing@patilwasteremoval.com>',
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
          <p style="color:#555;font-size:15px">Hi ${customer.first_name}, we received your payment of</p>
          <div style="font-size:36px;font-weight:700;color:#2e7d32;margin:16px 0">$${chargedAmount.toFixed(2)}</div>
          <p style="color:#999;font-size:13px">Period: ${invoice.period_start} – ${invoice.period_end}</p>
          <p style="color:#999;font-size:13px;margin-top:32px">Questions? Call/text <a href="tel:8024169484" style="color:#2e7d32">(802) 416-9484</a></p>
        </div>
      </div>
    `,
  }
}

export function failedPaymentEmail(customer: any, amount: number) {
  return {
    from: 'Patil Waste Removal <billing@patilwasteremoval.com>',
    to: customer.email,
    subject: `Action required — payment of $${amount.toFixed(2)} failed`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#fff">
        <div style="background:#1a1a1a;padding:28px 32px">
          <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:1px">PATIL WASTE REMOVAL</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#333;font-size:16px">Hi ${customer.first_name},</p>
          <p style="color:#555;font-size:15px">We were unable to charge your card on file for <strong>$${amount.toFixed(2)}</strong>. Please log in to update your payment method or pay manually.</p>
          <div style="text-align:center;margin:28px 0">
            <a href="${SITE_URL}/portal" style="background:#dc2626;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:700;display:inline-block">Update Payment →</a>
          </div>
          <p style="color:#999;font-size:13px">Questions? Call/text <a href="tel:8024169484" style="color:#2e7d32">(802) 416-9484</a>.</p>
        </div>
      </div>
    `,
  }
}

export function signupConfirmationEmail(customer: any, planName: string, startDate: string) {
  return {
    from: 'Patil Waste Removal <hello@patilwasteremoval.com>',
    to: customer.email,
    subject: `Welcome to Patil Waste Removal, ${customer.first_name}!`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#fff">
        <div style="background:#1a1a1a;padding:28px 32px">
          <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:1px">PATIL WASTE REMOVAL</h1>
          <p style="color:#4caf50;margin:4px 0 0;font-size:13px">Bedford, NH · (802) 416-9484</p>
        </div>
        <div style="padding:32px">
          <p style="color:#333;font-size:16px">Hi ${customer.first_name},</p>
          <p style="color:#555;font-size:15px">Thanks for signing up! We've received your request and will be in touch shortly to confirm your pickup schedule.</p>
          <div style="background:#f9f9f9;border:1px solid #e5e5e5;border-radius:8px;padding:20px 24px;margin:24px 0">
            <p style="margin:0 0 8px;font-size:13px;color:#999;text-transform:uppercase;letter-spacing:1px">Your Plan</p>
            <p style="margin:0;font-size:18px;font-weight:700;color:#111">${planName}</p>
            ${startDate ? `<p style="margin:8px 0 0;font-size:14px;color:#555">Requested start: <strong>${startDate}</strong></p>` : ''}
          </div>
          <p style="color:#555;font-size:14px">You'll receive a service agreement to review and sign before your first pickup. In the meantime, feel free to call or text us at <a href="tel:8024169484" style="color:#2e7d32">(802) 416-9484</a>.</p>
          <div style="margin:28px 0;text-align:center">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://patil-waste-site.vercel.app'}/portal" style="background:#2e7d32;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px">View My Account →</a>
          </div>
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
    to: customer.email,
    subject: `You're all set, ${customer.first_name}! First pickup: ${firstPickup}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#fff">
        <div style="background:#1a1a1a;padding:28px 32px">
          <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:1px">PATIL WASTE REMOVAL</h1>
          <p style="color:#4caf50;margin:4px 0 0;font-size:13px">Bedford, NH · (802) 416-9484</p>
        </div>
        <div style="padding:32px">
          <p style="color:#333;font-size:16px">Hi ${customer.first_name},</p>
          <p style="color:#555;font-size:15px">Your service agreement has been accepted and your account is now active. Here's what to expect:</p>
          <div style="background:#f0faf0;border:1px solid #c8e6c9;border-radius:8px;padding:20px 24px;margin:24px 0">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:6px 0;color:#555;font-size:14px">Plan</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#111;font-size:14px">${planName}</td></tr>
              <tr><td style="padding:6px 0;color:#555;font-size:14px">First pickup</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#2e7d32;font-size:14px">${firstPickup}</td></tr>
              <tr><td style="padding:6px 0;color:#555;font-size:14px">First invoice</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#111;font-size:14px">$${firstInvoiceTotal.toFixed(2)} — due on receipt</td></tr>
            </table>
          </div>
          <p style="color:#555;font-size:14px"><strong>Have your bins at the end of the driveway by 8am</strong> on your pickup day. If you have any questions, call or text us at <a href="tel:8024169484" style="color:#2e7d32">(802) 416-9484</a>.</p>
          <div style="margin:28px 0;text-align:center">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://patil-waste-site.vercel.app'}/portal" style="background:#2e7d32;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px">View My Portal →</a>
          </div>
        </div>
        <div style="background:#f5f5f5;padding:20px 32px;border-top:1px solid #e5e5e5">
          <p style="color:#999;font-size:12px;margin:0">Patil Waste Removal · 80 Palomino Ln, Bedford NH 03110</p>
        </div>
      </div>
    `
  }
}

export function paymentConfirmationEmail(customer: any, amount: number, period: string) {
  return {
    from: 'Patil Waste Removal <billing@patilwasteremoval.com>',
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
          <p style="color:#555;font-size:15px;margin:0 0 24px">Hi ${customer.first_name}, we received your payment of <strong style="color:#2e7d32">$${amount.toFixed(2)}</strong> for ${period}.</p>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://patil-waste-site.vercel.app'}/portal" style="background:#2e7d32;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px">View Receipt →</a>
        </div>
        <div style="background:#f5f5f5;padding:20px 32px;border-top:1px solid #e5e5e5">
          <p style="color:#999;font-size:12px;margin:0">Questions? Call (802) 416-9484 or email patilwasteremoval@gmail.com</p>
        </div>
      </div>
    `
  }
}
