import connectDb from "@/lib/db";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
        console.error("Missing Razorpay signature header");
        return NextResponse.json({ received: false }, { status: 400 });
    }

    // 🎯 Verify the webhook payload using your Razorpay Webhook Secret
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
        .update(rawBody)
        .digest("hex");

    if (signature !== expectedSignature) {
        console.error("Razorpay signature verification failed");
        return NextResponse.json({ received: false }, { status: 400 });
    }

    let event;
    try {
        event = JSON.parse(rawBody);
    } catch (error) {
        console.error("Failed to parse Razorpay webhook payload", error);
        return NextResponse.json({ received: false }, { status: 400 });
    }

    // 🎯 Handle successful payment capture
    if (event?.event === "payment.captured") {
        const payment = event.payload?.payment?.entity;
        const orderId = payment?.notes?.orderId;

        if (orderId) {
            await connectDb();
            await Order.findByIdAndUpdate(orderId, {
                isPaid: true
            });
        } else {
            console.warn("Razorpay payment.captured event missing orderId in notes");
        }
    }

    return NextResponse.json({ received: true }, { status: 200 });
}