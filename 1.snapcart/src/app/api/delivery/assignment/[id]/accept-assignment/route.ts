import { auth } from "@/auth";
import connectDb from "@/lib/db";
import emitEventHandler from "@/lib/emitEventHandler";
import DeliveryAssignment from "@/models/deliveryAssignment.model";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

// 🎯 CORE MUTATION LOGIC FUNCTION
async function handleAcceptAssignment(req: NextRequest, context: { params: Promise<{ id: string; }>; }) {
    try {
        await connectDb();
        const { id } = await context.params;
        const session = await auth();
        const deliveryBoyId = session?.user?.id;

        if (!deliveryBoyId) {
            return NextResponse.json({ message: "Unauthorized: Missing rider session identifier." }, { status: 401 });
        }

        // 1. Fetch target assignment profile record
        const assignment = await DeliveryAssignment.findById(id);
        if (!assignment) {
            return NextResponse.json({ message: "Assignment document record not found." }, { status: 404 });
        }
        if (assignment.status !== "brodcasted") {
            return NextResponse.json({ message: "Assignment expired or already claimed by another rider." }, { status: 400 });
        }

        // 2. Enforce safety rules: Prevent holding multiple active orders simultaneously
        const alreadyAssigned = await DeliveryAssignment.findOne({
            assignedTo: deliveryBoyId,
            status: { $nin: ["brodcasted", "completed"] }
        });

        if (alreadyAssigned) {
            return NextResponse.json({ message: "Action blocked: You already have another active delivery in progress." }, { status: 400 });
        }

        // 3. Claim the assignment context
        assignment.assignedTo = deliveryBoyId;
        assignment.status = "assigned";
        assignment.acceptedAt = new Date();
        await assignment.save();

        // 4. Fetch and update the linked Order atomic update
        // 🎯 FIX: Using findByIdAndUpdate directly bypasses underlying schema string mismatch loops!
        const updatedOrder = await Order.findByIdAndUpdate(
            assignment.order,
            {
                $set: {
                    assignedDeliveryBoy: deliveryBoyId,
                    status: "out of delivery"
                }
            },
            { new: true } // returns the freshly updated tracking document context
        ).populate("assignedDeliveryBoy");

        if (!updatedOrder) {
            return NextResponse.json({ message: "Linked tracking order record not found." }, { status: 404 });
        }

        // 5. Fire your Socket.io/real-time handler events
        await emitEventHandler("order-assigned", { 
            orderId: updatedOrder._id, 
            assignedDeliveryBoy: updatedOrder.assignedDeliveryBoy 
        });

        // 6. Database clean-up: Remove this delivery boy from all other open broadcast lists
        await DeliveryAssignment.updateMany(
            {
                _id: { $ne: assignment._id },
                brodcastedTo: deliveryBoyId,
                status: "brodcasted"
            },
            {
                // @ts-ignore
                $pull: { brodcastedTo: deliveryBoyId }
            }
        );

        return NextResponse.json({ success: true, message: "Order accepted successfully! Route dispatched." }, { status: 200 });

    } catch (error: any) {
        console.error("🔥 EXCEPTION ENCOUNTERED INSIDE ORDER ACCEPT PIPELINE ROUTE:", error);
        return NextResponse.json({ message: `Accept assignment crash error: ${error?.message || error}` }, { status: 500 });
    }
}

// 🎯 EXPORT BOTH METHODS TO ELIMINATE FRONTEND HTTP 405 METHOD MISMATCHES completely!
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string; }>; }) {
    return handleAcceptAssignment(req, context);
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string; }>; }) {
    return handleAcceptAssignment(req, context);
}