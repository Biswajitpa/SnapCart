import connectDb from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        await connectDb(); 
        
        const { orderId } = await req.json();
        if (!orderId) {
            return NextResponse.json({ message: "Missing orderId" }, { status: 400 });
        }

        // 1. Fetch the order and try to populate the customer profile doc
        const order = await Order.findById(orderId).populate("user");
        
        if (!order) {
            return NextResponse.json({ message: "Order not found" }, { status: 404 });
        }

        // 2. Generate the 4-digit token sequence and save it right away
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        order.deliveryOtp = otp;
        await order.save();

        // 3. Extract customer email cleanly
        const recipientEmail = (order.user as any)?.email;

        if (!recipientEmail) {
            // 💡 SAFELY FALLBACK OVERRIDE: If the user doc doesn't exist, log the code locally instead of throwing a 500 crash!
            console.warn(`⚠️ WARNING: No customer email found for order ${orderId}. Local fallback active.`);
            console.log(`🔑 DEV TELEMETRY BYPASS: Use OTP [ ${otp} ] to complete the drop-off loop.`);
            
            return NextResponse.json({ 
                message: "OTP generated on server (Local fallback active).", 
                otp 
            }, { status: 200 });
        }

        // 4. Attempt to send the email notification
        try {
            await sendMail(
                recipientEmail,
                "Your Delivery OTP - Snapcart",
                `<h2>Your Snapcart Order Delivery OTP is: <strong style="color: #16a34a; font-size: 24px;">${otp}</strong></h2>`
            );
        } catch (mailError: any) {
            // ⚠️ CATCHES MAIL/SMTP ERRORS SPECIFICALLY: Prevents a failure in Nodemailer from throwing a 500 error on your dashboard
            console.error("❌ NODEMAILER SERVICE ERROR:", mailError.message || mailError);
            console.log(`🔑 CODES SALVAGE LOG: Email failed, but use OTP [ ${otp} ] on your dashboard to proceed.`);
            
            return NextResponse.json({ 
                message: "OTP saved on server, but mail server transmission failed.", 
                otp 
            }, { status: 200 });
        }

        return NextResponse.json({ message: "OTP sent successfully", otp }, { status: 200 });

    } catch (error: any) {
        // This will print the exact line exception down to your terminal console logs
        console.error("🔥 CRITICAL ROUTE ERROR:", error);
        return NextResponse.json(
            { message: `Server error: ${error?.message || error}` },
            { status: 500 }
        );
    }
}