import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Order from "@/models/order.model";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    await connectDb();

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return NextResponse.json({ success: false, message: "Missing required tokens" }, { status: 400 });
    }

    // Generate the verification signature
    const secureTokenPayload = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(secureTokenPayload.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ success: false, message: "Payment signature mismatch" }, { status: 400 });
    }

    // Update the database order status to paid
    await Order.findByIdAndUpdate(orderId, {
      $set: { isPaid: true }
    });

    return NextResponse.json({ success: true, message: "Payment verified!" }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 VERIFICATION FAULT:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}