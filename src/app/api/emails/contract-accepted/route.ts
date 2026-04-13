/* eslint-disable */
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { sbServer, calcInvoiceTotal } from '@/lib/billing'
import { contractAcceptedEmail, invoiceEmail } from '@/lib/emails'
import PDFDocument from 'pdfkit'

const resend = new Resend(process.env.RESEND_API_KEY)

async function generateContractPDF(customer: any, sub: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: 'LETTER' })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const GREEN = '#2e7d32'
    const DARK = '#111111'
    const GRAY = '#555555'
    const LIGHT = '#888888'

    const rate = sub?.rate || 0
    const quarterlyRate = (rate * 3).toFixed(2)
    const planName = sub?.services?.name || 'Curbside Waste Removal'
    const pickupDay = sub?.pickup_day || 'your scheduled day'
    const pickupDayCap = pickupDay.charAt(0).toUpperCase() + pickupDay.slice(1)
    const startDate = sub?.billing_start
      ? new Date(sub.billing_start + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'To Be Confirmed'
    const isRecycling = planName.toLowerCase().includes('recycling')
    const acceptedAt = customer.contract_accepted_at
      ? new Date(customer.contract_accepted_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    doc.rect(0, 0, doc.page.width, 80).fill(DARK)
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text('PATIL WASTE REMOVAL', 60, 26)
    doc.fillColor(GREEN).fontSize(10).font('Helvetica').text('Bedford, NH  ·  (802) 416-9484  ·  patilwasteremoval.com', 60, 52)
    doc.moveDown(3)

    doc.fillColor(DARK).fontSize(18).font('Helvetica-Bold').text('Service Agreement', { align: 'center' })
    doc.fillColor(LIGHT).fontSize(10).font('Helvetica').text(`Signed: ${acceptedAt}`, { align: 'center' })
    doc.moveDown(1.5)

    const sectionTitle = (title: string) => {
      doc.moveDown(0.5)
      doc.fillColor(GREEN).fontSize(11).font('Helvetica-Bold').text(title.toUpperCase(), { characterSpacing: 0.5 })
      doc.moveTo(60, doc.y + 2).lineTo(doc.page.width - 60, doc.y + 2).strokeColor('#c8e6c9').lineWidth(1).stroke()
      doc.moveDown(0.4)
    }
    const body = (text: string) => {
      doc.fillColor(GRAY).fontSize(9.5).font('Helvetica').text(text, { lineGap: 3 })
      doc.moveDown(0.3)
    }

    sectionTitle('Parties')
    const col2x = doc.page.width / 2 + 20
    const partiesY = doc.y
    doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold').text('Patil Waste Removal LLC', 60, partiesY)
    doc.fillColor(GRAY).fontSize(9.5).font('Helvetica').text('patilwasteremoval@gmail.com', 60, doc.y + 2).text('80 Palomino Ln, Bedford NH 03110', 60, doc.y + 2).text('(802) 416-9484', 60, doc.y + 2)
    doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold').text(`${customer.first_name} ${customer.last_name}`, col2x, partiesY)
    doc.fillColor(GRAY).fontSize(9.5).font('Helvetica').text(customer.email, col2x, doc.y + 2).text(customer.service_address || '', col2x, doc.y + 2)
    if (customer.phone) doc.text(customer.phone, col2x, doc.y + 2)
    doc.moveDown(1.5)

    sectionTitle('Project Description')
    body(`Patil Waste Removal will provide you with trash${isRecycling ? ' and recycling' : ''} pick-up every ${pickupDayCap} for the paid month. This entitles the customer to 10 (13 gallon) trash bags${isRecycling ? ' and 64 gallons of recycling' : ''}. The price of this service is $${rate.toFixed(2)} monthly or $${quarterlyRate} quarterly, due on the 25th of the prior month. Your first date of service is set for ${startDate}.`)
    body(`Patil Waste Removal will collect the trash every ${pickupDayCap} that we are open as long as the bins are placed by the end of the driveway by 8am and are easily accessible. If bins are not placed by the end of the driveway or chosen location by the time the driver arrives, the customer will still be charged.`)

    sectionTitle('Terms')
    const terms: [string, string][] = [
      ['Payment', `Monthly bill is $${rate.toFixed(2)} or $${quarterlyRate} quarterly. Payable via online credit card, Venmo, Cashapp, or cash handed to driver. First invoice due on receipt covering prorated period from start date to end of month. Recurring invoices issued on the 25th, due on the 1st of the following month.`],
      ['Auto-Pay', 'You may save a card through your customer portal to enable automatic monthly payments. Card charged on the 1st of each month. First invoice charged immediately upon saving your card. Payments processed via Stripe — card details are never stored on our servers.'],
      ['Payment Refund', 'No refunds for completed services. Partial refunds available for future prepaid weeks if we are informed by 5pm the day before scheduled pick-up.'],
      ['Service Modification', 'Patil Waste Removal reserves the right to modify, discontinue, suspend, or disable all or parts of your service.'],
      ['Right to Terminate', 'Customer can cancel at any time. Canceling before prepaid term ends continues service until expiration. Immediate cancellation may receive a refund of one (1) week of service only. Bins retrieved by the 30th of the canceled month; $25 deposit returned if bin is in good condition.'],
      ['Trash Pick-up', 'Trash must be bagged, max 10 (13 gallon) bags, bins at driveway end by 8am. Trash shall NOT contain BROKEN GLASS, EXPLOSIVES, FIREARMS, AMMUNITION, COMBUSTIBLES, FIREWORKS, ASHES, SYRINGES, OR MEDICAL WASTE.'],
      ...(isRecycling ? [['Recycling Pick-up', 'Recycling must NOT be bagged (unless in recyclable paper bags). Must be at driveway end by 8am. Glass must be kept separate — on top of recyclables or in a box next to bin.'] as [string, string]] : []),
      ['Over Allotted Trash', 'Notified by 5pm night before: $2/13gal bag, $3.50/32gal bag. NOT notified: $3.50/13gal bag, $5/32gal bag.'],
      ['Bin Rentals', 'Trash bins require a $25 deposit (returned when retrieved in good condition). Bins are property of Patil Waste Removal and must be returned at end of service.'],
    ]
    for (const [title, text] of terms) {
      doc.fillColor(DARK).fontSize(9.5).font('Helvetica-Bold').text(title)
      doc.moveDown(0.15)
      body(text)
    }

    doc.moveDown(1)
    doc.rect(60, doc.y, doc.page.width - 120, 80).fillAndStroke('#f9fafb', '#e5e5e5')
    const sigY = doc.y + 12
    doc.fillColor(GRAY).fontSize(9).font('Helvetica').text(`By accepting this agreement electronically, ${customer.first_name} ${customer.last_name} confirms they have read and agree to the Patil Waste Removal service agreement and authorize billing as described above.`, 72, sigY, { width: doc.page.width - 144, lineGap: 2 })
    doc.moveDown(0.5)
    doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold').text(`Electronically signed by: ${customer.first_name} ${customer.last_name}`, 72, doc.y + 4)
    doc.fillColor(LIGHT).fontSize(9).font('Helvetica').text(`Date: ${acceptedAt}  ·  Email: ${customer.email}`, 72, doc.y + 2)
    doc.end()
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const customerId = body?.customerId
    if (!customerId || typeof customerId !== 'string') {
      return NextResponse.json({ error: 'Missing customerId' }, { status: 400 })
    }
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_placeholder') return NextResponse.json({ ok: true, skipped: true })

    const [customer] = await sbServer(`customers?id=eq.${customerId}&select=*,subscriptions(id,rate,billing_cycle,pickup_day,billing_start,status,services(name)),bins(*)`)
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    // Only send this email once the customer has actually accepted the contract.
    // Prevents an attacker who enumerates customerIds from spamming fake acceptance
    // emails to real customers.
    if (!customer.contract_accepted) {
      return NextResponse.json({ error: 'Contract not accepted' }, { status: 403 })
    }

    const activeSub = customer.subscriptions?.find((s: any) => s.status === 'active') || customer.subscriptions?.[0]

    // Derive email content from the database — never trust anything from the
    // request body. Previously planName/firstPickup/invoiceTotal came from the
    // client and were interpolated into both the HTML body and subject line.
    const planName = activeSub?.services?.name || 'Service Plan'
    const firstPickup = activeSub?.billing_start
      ? new Date(activeSub.billing_start + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      : 'your first scheduled day'
    const { total: invoiceTotal } = calcInvoiceTotal(customer)

    // Generate PDF — fall back gracefully if it fails so invoice emails still send
    let pdfAttachment: { filename: string; content: string } | null = null
    try {
      const pdfBuffer = await generateContractPDF(customer, activeSub)
      pdfAttachment = {
        filename: `PatilWasteRemoval-Contract-${customer.last_name}.pdf`,
        content: pdfBuffer.toString('base64'),
      }
    } catch (pdfErr: any) {
      console.error('[contract-accepted] PDF generation failed:', pdfErr?.message || pdfErr)
    }

    const emailData = contractAcceptedEmail(customer, planName, firstPickup, invoiceTotal)

    const sendPayload: any = { ...emailData }
    if (pdfAttachment) sendPayload.attachments = [pdfAttachment]

    await resend.emails.send(sendPayload).catch((err: any) => {
      console.error('[contract-accepted] contract email send failed:', err?.message || err)
    })

    // Send invoice email for any outstanding first invoice created at contract acceptance
    const invoices = await sbServer(
      `invoices?customer_id=eq.${customerId}&status=eq.sent&order=created_at.asc&limit=5`
    ).catch(() => [])

    console.log(`[contract-accepted] found ${(invoices || []).length} sent invoices for ${customerId}`)

    for (const invoice of invoices || []) {
      if (!invoice.total || invoice.total <= 0) {
        console.log(`[contract-accepted] skipping invoice ${invoice.id} with total ${invoice.total}`)
        continue
      }
      // Parse notes into line items (format: "desc: $X.XX | desc2: $Y.YY")
      const lines = (invoice.notes || '')
        .replace('First invoice — due on receipt. ', '')
        .split(' | ')
        .map((part: string) => {
          const match = part.match(/^(.+):\s*\$?([\d.]+)$/)
          return match ? { description: match[1].trim(), amount: parseFloat(match[2]) } : null
        })
        .filter(Boolean)

      const invoiceLines = lines.length > 0 ? lines : [{ description: 'First invoice (prorated)', amount: invoice.total }]

      console.log(`[contract-accepted] sending invoice email for invoice ${invoice.id}, total $${invoice.total}`)
      await resend.emails.send(invoiceEmail(customer, invoice, invoiceLines) as any).catch((err: any) => {
        console.error(`[contract-accepted] invoice email failed for ${invoice.id}:`, err?.message || err)
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[contract-accepted] error:', e)
    return NextResponse.json({ error: 'Failed to send contract email' }, { status: 500 })
  }
}
