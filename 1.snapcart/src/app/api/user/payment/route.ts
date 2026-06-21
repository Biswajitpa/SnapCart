import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import connectDb from "@/lib/db";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    
    const { amount } = await req.json();

    // 🎯 FIX: Remove the requirement for orderId here since MongoDB saves *after* payment succeeds
    if (!amount) {
      return NextResponse.json(
        { success: false, message: "Missing amount in payment route request payload." },
        { status: 400 }
      );
    }

    const options = {
      amount: Math.round(Number(amount) * 100), // Converts INR to Paise
      currency: "INR",
      receipt: `receipt_intent_${Date.now()}`, // Temporary fallback receipt ID
    };

    // Generate the order intent with Razorpay
    const razorpayOrder = await razorpay.orders.create(options);

    // Return properties directly to the frontend modal launcher loop
    return NextResponse.json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 RAZORPAY API ORDER CREATION CRASH:", error);
    return NextResponse.json(
      { success: false, message: error?.error?.description || error?.message || "Razorpay initialization failed." },
      { status: 400 }
    );
  }
}