/* eslint-disable */
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sbServer } from '@/lib/billing'
import { getSessionCustId } from '@/lib/portalSession'
import PDFDocument from 'pdfkit'

export const runtime = 'nodejs'

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
    const billingCycle = sub?.billing_cycle || 'monthly'
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

    // Header bar
    doc.rect(0, 0, doc.page.width, 80).fill(DARK)
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
      .text('PATIL WASTE REMOVAL', 60, 26, { align: 'left' })
    doc.fillColor(GREEN).fontSize(10).font('Helvetica')
      .text('Bedford, NH  ·  (802) 416-9484  ·  patilwasteremoval.com', 60, 52)

    doc.moveDown(3)

    // Title
    doc.fillColor(DARK).fontSize(18).font('Helvetica-Bold')
      .text('Service Agreement', { align: 'center' })
    doc.fillColor(LIGHT).fontSize(10).font('Helvetica')
      .text(`Signed: ${acceptedAt}`, { align: 'center' })

    doc.moveDown(1.5)

    // Section helper
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

    // Parties
    sectionTitle('Parties')
    const col1x = 60
    const col2x = doc.page.width / 2 + 20
    const partiesY = doc.y

    doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold').text('Patil Waste Removal LLC', col1x, partiesY)
    doc.fillColor(GRAY).fontSize(9.5).font('Helvetica')
      .text('patilwasteremoval@gmail.com', col1x, doc.y + 2)
      .text('80 Palomino Ln, Bedford NH 03110', col1x, doc.y + 2)
      .text('(802) 416-9484', col1x, doc.y + 2)

    doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold')
      .text(`${customer.first_name} ${customer.last_name}`, col2x, partiesY)
    doc.fillColor(GRAY).fontSize(9.5).font('Helvetica')
      .text(customer.email, col2x, doc.y + 2)
      .text(customer.service_address || '', col2x, doc.y + 2)
    if (customer.phone) doc.text(customer.phone, col2x, doc.y + 2)

    doc.moveDown(1.5)

    // Project Description
    sectionTitle('Project Description')
    body(
      `Patil Waste Removal will provide you with trash${isRecycling ? ' and recycling' : ''} pick-up every ${pickupDayCap} for the paid month. ` +
      `This entitles the customer to 10 (13 gallon) trash bags${isRecycling ? ' and 64 gallons of recycling' : ''}. ` +
      `The price of this service is $${rate.toFixed(2)} monthly or $${quarterlyRate} quarterly, due on the 25th of the prior month. ` +
      `Your first date of service is set for ${startDate}.`
    )
    body(
      `Patil Waste Removal will collect the trash every ${pickupDayCap} that we are open as long as the bins are placed by the end of the driveway by 8am and are easily accessible. ` +
      `If bins are not placed by the end of the driveway or chosen location by the time the driver arrives, the customer will still be charged.`
    )

    // Terms (two column layout approximation)
    sectionTitle('Terms')

    const terms = [
      ['Payment', `Monthly bill is $${rate.toFixed(2)} or $${quarterlyRate} quarterly. Payable via online credit card, Venmo, Cashapp, or cash handed to driver. Your first invoice is due on receipt and covers the prorated period from your start date to end of month. Recurring invoices are issued on the 25th and due on the 1st of the following month.`],
      ['Auto-Pay', `You may save a card through your customer portal to enable automatic monthly payments. Your card will be charged on the 1st of each month. Your first invoice will be charged immediately upon saving your card. Payments processed via Stripe — card details are never stored on our servers.`],
      ['Payment Refund', `No refunds for completed services. Partial refunds available for future prepaid weeks if we are informed by 5pm the day before scheduled pick-up.`],
      ['Service Modification', `Patil Waste Removal reserves the right to modify, discontinue, suspend, or disable all or parts of your service.`],
      ['Right to Terminate', `The customer can cancel service at any time. If you cancel before your prepaid term ends, service continues until the term expires. Immediate cancellation may receive a refund equal to one (1) week of service only. Bins retrieved by the 30th of the canceled month; $25 deposit returned if bin is not excessively damaged.`],
      ['Trash Pick-up', `Trash must be bagged and placed in bins, maximum 10 (13 gallon) bags. Bins must be at the end of the driveway by 8am on pickup day. Trash shall NOT contain BROKEN GLASS, EXPLOSIVES, FIREARMS, AMMUNITION, COMBUSTIBLES, FIREWORKS, ASHES, SYRINGES, OR MEDICAL WASTE.`],
      ...(isRecycling ? [['Recycling Pick-up', `Recycling must NOT be bagged (unless in recyclable paper bags). Must be placed in bin and at end of driveway by 8am. Glass must be kept separate — placed on top of recyclables or in a cardboard box next to the bin.`] as [string, string]] : []),
      ['Over Allotted Trash', `Notified by 5pm night before: $2/13gal bag, $3.50/32gal bag extra. NOT notified: $3.50/13gal bag, $5/32gal bag extra.`],
      ['Bin Rentals', `Trash bins require a $25 deposit (returned when bin is retrieved in good condition). Bins are property of Patil Waste Removal and must be returned at end of service.`],
    ]

    for (const [title, text] of terms) {
      doc.fillColor(DARK).fontSize(9.5).font('Helvetica-Bold').text(title)
      doc.moveDown(0.15)
      body(text)
    }

    // Signature block
    doc.moveDown(1)
    doc.rect(60, doc.y, doc.page.width - 120, 80).fillAndStroke('#f9fafb', '#e5e5e5')
    const sigY = doc.y + 12
    doc.fillColor(GRAY).fontSize(9).font('Helvetica')
      .text(`By accepting this agreement electronically, ${customer.first_name} ${customer.last_name} confirms they have read and agree to the Patil Waste Removal service agreement and authorize billing as described above.`, 72, sigY, { width: doc.page.width - 144, lineGap: 2 })
    doc.moveDown(0.5)
    doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold')
      .text(`Electronically signed by: ${customer.first_name} ${customer.last_name}`, 72, doc.y + 4)
    doc.fillColor(LIGHT).fontSize(9).font('Helvetica')
      .text(`Date: ${acceptedAt}  ·  Email: ${customer.email}`, 72, doc.y + 2)

    doc.end()
  })
}

export async function GET(req: Request, { params }: { params: Promise<{ customerId: string }> }) {
  try {
    const { customerId } = await params

    // Check admin token
    const auth = req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    const adminPw = process.env.ADMIN_PASSWORD
    const isAdmin = !!(adminPw && (() => { try { const d = Buffer.from(auth, 'base64').toString(); return d.startsWith('admin:') && d.endsWith(`:${adminPw}`) } catch { return false } })())

    // Check portal session cookie — customer may only fetch their own contract
    const cookieStore = await cookies()
    const sessionCustId = getSessionCustId(cookieStore)
    const isOwner = sessionCustId === customerId

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [customer] = await sbServer(
      `customers?id=eq.${customerId}&select=*,subscriptions(id,rate,billing_cycle,pickup_day,billing_start,status,services(name))`
    )

    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!customer.contract_accepted && !isAdmin) return NextResponse.json({ error: 'Contract not yet accepted' }, { status: 403 })

    const activeSub = customer.subscriptions?.find((s: any) => s.status === 'active') || customer.subscriptions?.[0]
    const pdf = await generateContractPDF(customer, activeSub)

    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="PatilWasteRemoval-Contract-${customer.last_name}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e: any) {
    console.error('[contracts/[customerId]] error:', e)
    return NextResponse.json({ error: 'Failed to generate contract' }, { status: 500 })
  }
}
