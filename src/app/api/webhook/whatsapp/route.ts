import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppService } from '@/lib/whatsapp-service';
// import { db } from '@/lib/turso'; // Uncomment when using real DB

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // ---------------------------------------------------------
        // ADAPTER: Sesuaikan bagian ini dengan format JSON dari Gateway (Watzap/Fonnte/Twilio)
        // Contoh untuk Watzap/General Webhook structure:
        // { "phone": "628123456789", "message": "Analisa Gold", "sender_name": "Budi" }
        // ---------------------------------------------------------

        const { phone, message, sender_name } = body;

        if (!phone || !message) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        // ---------------------------------------------------------
        // MIDDLEWARE: VVIP CHECK (Simulated for verification)
        // Nanti diganti dengan DB Check: await db.user.findFirst({ where: { phone, isVvip: true } })
        // ---------------------------------------------------------
        const isVvip = true; // FORCE TRUE FOR DEMO/TESTING
        // const user = await db.user.findFirst(...)
        // if (!user || !user.isVvip) return ...

        if (!isVvip) {
            // Optional: Reply "Access Denied" or just ignore
            return NextResponse.json({ status: 'ignored', reason: 'not_vvip' });
        }

        // ---------------------------------------------------------
        // PROCESS MESSAGE
        // ---------------------------------------------------------
        console.log(`[WA Bot] Processing message from ${phone}: ${message}`);

        const replyText = await WhatsAppService.processMessage({
            phone,
            message,
            senderName: sender_name
        });

        // ---------------------------------------------------------
        // REPLY (Integration Point)
        // Di sini kita panggil API Gateway untuk mengirim balasan.
        // Untuk sekarang, kita return replyText di response agar bisa ditest via Postman.
        // ---------------------------------------------------------

        // Mock sending
        console.log(`[WA Bot] Replying: \n${replyText}`);

        // If using Watzap, call their Send API here:
        // await fetch('https://api.watzap.id/v1/send_message', { ... })

        return NextResponse.json({
            status: 'success',
            reply: replyText
        });

    } catch (error: any) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
