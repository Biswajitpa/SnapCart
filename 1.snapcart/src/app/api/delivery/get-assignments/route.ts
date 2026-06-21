import { auth } from "@/auth";
import connectDb from "@/lib/db";
import DeliveryAssignment from "@/models/deliveryAssignment.model";
import Order from "@/models/order.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        await connectDb();
        
        const session = await auth();
        const rawDeliveryBoyId = session?.user?.id;

        if (!rawDeliveryBoyId) {
            return NextResponse.json(
                { success: false, message: "Unauthorized access profile configuration." }, 
                { status: 401 }
            );
        }

        // 🎯 Safe check to convert string ID to ObjectId if it's structured correctly
        const isValidObjId = mongoose.Types.ObjectId.isValid(rawDeliveryBoyId);
        const deliveryBoyObjectId = isValidObjId ? new mongoose.Types.ObjectId(rawDeliveryBoyId) : null;

        // 🎯 GLOBAL MULTI-MATCH: 
        // We match against BOTH the raw String hash and the native ObjectId wrapper.
        // This guarantees the assignment matches your broadcast pool from absolutely everywhere.
        const assignments = await DeliveryAssignment.find({
            brodcastedTo: { 
                $in: [rawDeliveryBoyId, deliveryBoyObjectId].filter(Boolean) 
            }, 
            status: "brodcasted"
        })
        .populate({
            path: "order",
            model: Order
        })
        .lean();

        return NextResponse.json(assignments || [], { status: 200 });

    } catch (error: any) {
        console.error("🔥 CRITICAL GET-ASSIGNMENTS PIPELINE FAILURE:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Internal Server Error" }, 
            { status: 500 }
        );
    }
}