import connectDb from "@/lib/db";
import Order from "@/models/order.model";
import DeliveryAssignment from "@/models/deliveryAssignment.model"; 
import { NextRequest, NextResponse } from "next/server";

// 🎯 1. GET HANDLER: Fetches all orders to populate your Admin panel interface table
export async function GET(req: NextRequest) {
    try {
        await connectDb();
        const orders = await Order.find({})
            .populate("user assignedDeliveryBoy")
            .sort({ createdAt: -1 });
            
        return NextResponse.json(orders, { status: 200 });
    } catch (error: any) {
        return NextResponse.json(
            { message: `get orders error: ${error?.message || error}` },
            { status: 500 }
        );
    }
}

// 🎯 2. PUT HANDLER: Processes status dropdown changes from your Admin Panel interface
export async function PUT(req: NextRequest) {
    try {
        await connectDb();
        const { orderId, status, deliveryBoyId } = await req.json();

        if (!orderId || !status) {
            return NextResponse.json(
                { success: false, message: "Missing required parameters: orderId or status." },
                { status: 400 }
            );
        }

        const isValidObjectId = orderId.match(/^[0-9a-fA-F]{24}$/);

        // Find and update the principal Order collection document records safely
        const updatedOrder = await Order.findOneAndUpdate(
            {
                $or: [
                    { _id: isValidObjectId ? orderId : null },
                    { assignment: orderId } // Backup fallback for online payment tracking strings
                ]
            },
            { 
                $set: { 
                    status: status,
                    ...(deliveryBoyId && { assignedDeliveryBoy: deliveryBoyId }) 
                }
            },
            { new: true }
        );

        if (!updatedOrder) {
            return NextResponse.json(
                { success: false, message: "Target order record not found in database." },
                { status: 404 }
            );
        }

        // B. Real-Time Sync Zone: Handle status transitions cleanly
        if (status === "out of delivery") {
            if (!deliveryBoyId) {
                return NextResponse.json(
                    { success: false, message: "Action Blocked: A deliveryBoyId must be passed to update status to out of delivery." },
                    { status: 400 }
                );
            }

            // 🎯 THE CORE SYNC FIX:
            // Find the active assignment using an $or block to ensure it catches both raw ObjectIds and string identifiers
            await DeliveryAssignment.findOneAndUpdate(
                {
                    $or: [
                        { order: updatedOrder._id },
                        { order: orderId } 
                    ]
                },
                {
                    $set: {
                        status: "assigned",
                        assignedTo: deliveryBoyId, 
                        acceptedAt: new Date()
                    }
                },
                { new: true, upsert: true } 
            );
        } else {
            // General Fallback Sync: For status options like pending, cancelled, or completed
            await DeliveryAssignment.findOneAndUpdate(
                {
                    $or: [
                        { order: updatedOrder._id },
                        { order: orderId }
                    ]
                },
                { 
                    $set: { 
                        status: status === "pending" ? "brodcasted" : status 
                    } 
                }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Order data status cleanly updated to '${status}' and synced across dashboard states!`,
            order: updatedOrder
        }, { status: 200 });

    } catch (error: any) {
        console.error("🔥 ADMIN UPDATE STATUS CORE EXCEPTION:", error);
        return NextResponse.json(
            { success: false, message: `Update status endpoint crash error: ${error?.message || error}` },
            { status: 500 }
        );
    }
}