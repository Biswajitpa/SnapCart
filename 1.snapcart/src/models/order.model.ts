import mongoose from "mongoose";

export interface IOrder {
  _id?: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  items: [
    {
      grocery: mongoose.Types.ObjectId;
      name: string;
      price: string;
      unit: string;
      image: string;
      quantity: number;
    }
  ];
  isPaid: boolean;
  totalAmount: number;
  paymentMethod: "cod" | "online";
  address: {
    fullName: string;
    mobile: string;
    city: string;
    state: string;
    pincode: string;
    fullAddress: string;
    latitude: number;
    longitude: number;
  };
  assignment?: string | null; // 🎯 Enforced String representation for Razorpay strings
  assignedDeliveryBoy?: mongoose.Types.ObjectId;
  status: "pending" | "out of delivery" | "delivered";
  createdAt?: Date;
  updatedAt?: Date;
  deliveryOtp: string | null;
  deliveryOtpVerification: boolean;
  deliveredAt?: Date;
}

const orderSchema = new mongoose.Schema<IOrder>({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  items: [
    {
      grocery: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Grocery",
        required: true
      },
      name: String,
      price: String,
      unit: String,
      image: String,
      quantity: Number
    }
  ],
  paymentMethod: {
    type: String,
    enum: ["cod", "online"],
    default: "cod"
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  totalAmount: Number,
  address: {
    fullName: String,
    mobile: String,
    city: String,
    state: String,
    pincode: String,
    fullAddress: String,
    latitude: Number,
    longitude: Number
  },
  assignment: {
    type: String, // 🎯 Enforced String type mapping on the schema field
    default: null
  },
  assignedDeliveryBoy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  status: {
    type: String,
    enum: ["pending", "out of delivery", "delivered"],
    default: "pending"
  },
  deliveryOtp: {
    type: String,
    default: null
  },
  deliveryOtpVerification: {
    type: Boolean,
    default: false
  },
  deliveredAt: {
    type: Date
  }
}, { timestamps: true });

// 🎯 THE CACHE-BUSTER: Force delete model initialization records before exporting to prevent BSON errors
if (mongoose.models && mongoose.models.Order) {
  delete mongoose.models.Order;
}

const Order = mongoose.model<IOrder>("Order", orderSchema);
export default Order;