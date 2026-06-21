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
        {
          active: false,
          message: "Unauthorized access profile.",
        },
        { status: 401 }
      );
    }

    const deliveryBoyObjectId = new mongoose.Types.ObjectId(
      rawDeliveryBoyId
    );

    const activeAssignment: any = await DeliveryAssignment.findOne({
      assignedTo: deliveryBoyObjectId,
      status: { $in: ["assigned", "out of delivery"] },
    })
      .populate({
        path: "order",
        model: Order,
      })
      .lean();

    if (!activeAssignment || !activeAssignment.order) {
      return NextResponse.json(
        {
          active: false,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        active: true,
        assignment: activeAssignment,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(
      "🔥 PROPER CURRENT-ORDER PIPELINE EXCEPTION:",
      error
    );

    return NextResponse.json(
      {
        message: `current order database tracking error: ${
          error?.message || error
        }`,
      },
      { status: 500 }
    );
  }
}