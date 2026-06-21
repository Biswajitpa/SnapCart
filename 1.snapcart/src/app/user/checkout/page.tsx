'use client'

import React, { useEffect, useState } from 'react'
import { motion } from "framer-motion"
import { ArrowLeft, Building, CreditCard, CreditCardIcon, Home, Loader2, LocateFixed, MapPin, Navigation, Phone, Search, Truck, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import axios from 'axios'
import dynamic from 'next/dynamic'

const CheckOutMap = dynamic(() => import("@/components/CheckoutMap"), { ssr: false })

function Checkout() {
    const router = useRouter()
    const { userData } = useSelector((state: RootState) => state.user)
    const { subTotal, deliveryFee, finalTotal, cartData } = useSelector((state: RootState) => state.cart)
    
    const [address, setAddress] = useState({
        fullName: "",
        mobile: "",
        city: "",
        state: "",
        pincode: "",
        fullAddress: ""
    })
    
    const [searchLoading, setSearchLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [position, setPosition] = useState<[number, number] | null>(null)
    const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod")
    const [orderLoading, setOrderLoading] = useState(false)

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const { latitude, longitude } = pos.coords
                setPosition([latitude, longitude])
            }, (err) => { console.log('location error', err) }, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 })
        }
    }, [])

    useEffect(() => {
        if (userData) {
            setAddress((prev) => ({ 
                ...prev, 
                fullName: userData?.name || "",
                mobile: userData?.mobile || ""
            }))
        }
    }, [userData])

    const handleSearchQuery = async () => {
        if (!searchQuery.trim()) return
        setSearchLoading(true)
        try {
            const { OpenStreetMapProvider } = await import("leaflet-geosearch")
            const provider = new OpenStreetMapProvider()
            const results = await provider.search({ query: searchQuery })
            if (results && results.length > 0) {
                setPosition([results[0].y, results[0].x])
            }
        } catch (error) {
            console.error("Geosearch tracking error:", error)
        } finally {
            setSearchLoading(false)
        }
    }

    useEffect(() => {
        const fetchAddress = async () => {
            if (!position) return 
            try {
                const result = await axios.get(`https://nominatim.openstreetmap.org/reverse?lat=${position[0]}&lon=${position[1]}&format=json`)
                const resAddr = result.data?.address
                setAddress(prev => ({
                    ...prev,
                    city: resAddr?.city || resAddr?.town || resAddr?.village || "",
                    state: resAddr?.state || "",
                    pincode: resAddr?.postcode || "",
                    fullAddress: result.data?.display_name || ""
                }))
            } catch (error) {
                console.log(error)
            }
        }
        fetchAddress()
    }, [position])

    // 🎯 1. CASH ON DELIVERY TRANSACTION
    const handleCod = async () => {
        if (!position) return alert("Please specify your delivery address on the map.")
        setOrderLoading(true)
        try {
            await axios.post("/api/user/order", {
                userId: userData?._id,
                items: cartData.map(item => ({
                    grocery: item._id,
                    name: item.name,
                    price: item.price,
                    unit: item.unit,
                    quantity: item.quantity,
                    image: item.image
                })),
                totalAmount: finalTotal,
                address: {
                    fullName: address.fullName,
                    mobile: address.mobile,
                    city: address.city,
                    state: address.state,
                    fullAddress: address.fullAddress,
                    pincode: address.pincode,
                    latitude: position[0],
                    longitude: position[1]
                },
                paymentMethod: "cod"
            })
            router.push("/user/order-success")
        } catch (error: any) {
            console.error("COD error:", error)
            alert(error?.response?.data?.message || "Order placement failed.")
        } finally {
            setOrderLoading(false)
        }
    }

    // 🎯 2. FIXED: SECURE ONLINE CHECKOUT LIFECYCLE
    const handleOnlinePayment = async () => {
        if (!position) return alert("Please specify your delivery address on the map.")
        setOrderLoading(true)

        try {
            // 💡 STEP A: Create the temporary Razorpay Order Intent via backend FIRST
            // Notice we do NOT hit the /api/user/order endpoint yet!
            const paymentIntent = await axios.post("/api/user/payment", {
                amount: finalTotal,
                isPreOrderIntent: true // Custom flag if your route logic demands it
            })

            const { keyId, order_id, amount, currency } = paymentIntent.data

            const loadRazorpayScript = () => {
                return new Promise((resolve) => {
                    const script = document.createElement("script")
                    script.src = "https://checkout.razorpay.com/v1/checkout.js"
                    script.onload = () => resolve(true)
                    script.onerror = () => resolve(false)
                    document.body.appendChild(script)
                })
            }

            const scriptLoaded = await loadRazorpayScript()
            if (!scriptLoaded) {
                setOrderLoading(false)
                return alert("Failed to fetch Razorpay module dependencies.")
            }

            const checkoutOptions = {
                key: keyId,
                amount: amount,
                currency: currency,
                name: "Snapcart Delivery",
                description: "10-Minute Grocery Order Payment",
                order_id: order_id,
                
                // 💡 STEP B: THE HANDLER EXECUTES ON 100% SUCCESSFUL PAYMENT SESSIONS
                handler: async function (response: any) {
                    try {
                        // 1. Commit order payload configuration down to MongoDB safely now that the cash is captured
                        const mongoOrderPayload = {
                            userId: userData?._id,
                            items: cartData.map(item => ({
                                grocery: item._id,
                                name: item.name,
                                price: item.price,
                                unit: item.unit,
                                quantity: item.quantity,
                                image: item.image
                            })),
                            totalAmount: finalTotal,
                            address: {
                                fullName: address.fullName,
                                mobile: address.mobile,
                                city: address.city,
                                state: address.state,
                                fullAddress: address.fullAddress,
                                pincode: address.pincode,
                                latitude: position[0],
                                longitude: position[1]
                            },
                            paymentMethod: "online",
                            paymentStatus: "paid", // Explicit structural safety assignment flag
                            razorpayOrderId: response.razorpay_order_id
                        }

                        const mongoRecord = await axios.post("/api/user/order", mongoOrderPayload)
                        const createdOrderId = mongoRecord.data?.order?._id || mongoRecord.data?._id

                        // 2. Fire signature webhook cryptographic security check
                        await axios.post("/api/user/payment/verify", {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            orderId: createdOrderId
                        })

                        router.push("/user/order-success")
                    } catch (err: any) {
                        console.error("Verification sync exception logs:", err)
                        alert(err?.response?.data?.message || "Payment verified failed on server step sync.")
                    }
                },
                prefill: {
                    name: address.fullName,
                    email: userData?.email || "",
                    contact: address.mobile
                },
                theme: { color: "#16a34a" },
                modal: {
                    // Turn off loading spinners if user explicitly dismisses the modal wrapper checkout iframe box
                    ondismiss: function() {
                        setOrderLoading(false)
                    }
                }
            }

            const paymentWindow = new (window as any).Razorpay(checkoutOptions)
            paymentWindow.open()

        } catch (error: any) {
            console.error("Razorpay checkout engine crash logs:", error)
            alert(error?.response?.data?.message || error?.message || "Online checkout initialization rejected by server.");
            setOrderLoading(false)
        }
    }

    const handleCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const { latitude, longitude } = pos.coords
                setPosition([latitude, longitude])
            }, (err) => { console.log('location error', err) }, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 })
        }
    }

    return (
        <div className='w-[92%] md:w-[80%] mx-auto py-10 relative'>
            <motion.button
                whileTap={{ scale: 0.97 }}
                className='absolute left-0 top-2 flex items-center gap-2 text-green-700 hover:text-green-800 font-semibold cursor-pointer'
                onClick={() => router.push("/user/cart")}
            >
                <ArrowLeft size={16} />
                <span>Back to cart</span>
            </motion.button>

            <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className='text-3xl md:text-4xl font-bold text-green-700 text-center mb-10'
            >Checkout</motion.h1>

            <div className='grid md:grid-cols-2 gap-8'>
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className='bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100'
                >
                    <h2 className='text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2'>
                        <MapPin className='text-green-700' /> Delivery Address
                    </h2>
                    <div className='space-y-4'>
                        <div className='relative'>
                            <User className="absolute left-3 top-3 text-green-600" size={18} />
                            <input type="text" placeholder='Full Name' value={address.fullName || ""} onChange={(e) => setAddress((prev) => ({ ...prev, fullName: e.target.value }))} className='pl-10 w-full border rounded-lg p-3 text-sm bg-gray-50 outline-none text-gray-800 focus:border-green-500' />
                        </div>
                        <div className='relative'>
                            <Phone className="absolute left-3 top-3 text-green-600" size={18} />
                            <input type="text" placeholder='Mobile Number' value={address.mobile || ""} onChange={(e) => setAddress((prev) => ({ ...prev, mobile: e.target.value }))} className='pl-10 w-full border rounded-lg p-3 text-sm bg-gray-50 outline-none text-gray-800 focus:border-green-500' />
                        </div>
                        <div className='relative'>
                            <Home className="absolute left-3 top-3 text-green-600" size={18} />
                            <input type="text" value={address.fullAddress || ""} placeholder='Full Address' onChange={(e) => setAddress((prev) => ({ ...prev, fullAddress: e.target.value }))} className='pl-10 w-full border rounded-lg p-3 text-sm bg-gray-50 outline-none text-gray-800 focus:border-green-500' />
                        </div>
                        <div className='grid grid-cols-3 gap-3'>
                            <div className='relative'>
                                <Building className="absolute left-3 top-3 text-green-600" size={18} />
                                <input type="text" value={address.city || ""} placeholder='City' onChange={(e) => setAddress((prev) => ({ ...prev, city: e.target.value }))} className='pl-10 w-full border rounded-lg p-3 text-sm bg-gray-50 outline-none text-gray-800 focus:border-green-500' />
                            </div>
                            <div className='relative'>
                                <Navigation className="absolute left-3 top-3 text-green-600" size={18} />
                                <input type="text" value={address.state || ""} placeholder='State' onChange={(e) => setAddress((prev) => ({ ...prev, state: e.target.value }))} className='pl-10 w-full border rounded-lg p-3 text-sm bg-gray-50 outline-none text-gray-800 focus:border-green-500' />
                            </div>
                            <div className='relative'>
                                <Search className="absolute left-3 top-3 text-green-600" size={18} />
                                <input type="text" value={address.pincode || ""} placeholder='Pincode' onChange={(e) => setAddress((prev) => ({ ...prev, pincode: e.target.value }))} className='pl-10 w-full border rounded-lg p-3 text-sm bg-gray-50 outline-none text-gray-800 focus:border-green-500' />
                            </div>
                        </div>
                        <div className='flex gap-2 mt-3'>
                            <input type="text" placeholder='Search city or area...' className='flex-1 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 text-gray-800 outline-none' value={searchQuery || ""} onChange={(e) => setSearchQuery(e.target.value)} />
                            <button type="button" className='bg-green-600 text-white px-5 rounded-lg hover:bg-green-700 transition-all font-medium cursor-pointer' onClick={handleSearchQuery}>{searchLoading ? <Loader2 size={16} className='animate-spin' /> : "Search"}</button>
                        </div>
                        <div className='relative mt-6 h-[330px] rounded-xl overflow-hidden border border-gray-200 shadow-inner z-0'>
                            {position && <CheckOutMap position={position} setPosition={setPosition} />}
                            <motion.button
                                whileTap={{ scale: 0.93 }}
                                type="button"
                                className='absolute bottom-4 right-4 bg-green-600 text-white shadow-lg rounded-full p-3 hover:bg-green-700 transition-all flex items-center justify-center z-50 cursor-pointer'
                                onClick={handleCurrentLocation}
                            >
                                <LocateFixed size={22} />
                            </motion.button>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className='bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 h-fit'
                >
                    <h2 className='text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2'><CreditCard className='text-green-600' /> Payment Method</h2>
                    <div className='space-y-4 mb-6'>
                        <button
                            type="button"
                            onClick={() => setPaymentMethod("online")}
                            className={`flex items-center gap-3 w-full border rounded-lg p-3 transition-all cursor-pointer ${
                                paymentMethod === "online" ? "border-green-600 bg-green-50 shadow-sm" : "hover:bg-gray-50"
                            }`}
                        >
                            <CreditCardIcon className='text-green-600' /><span className='font-medium text-gray-700'>Pay Online (Razorpay)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setPaymentMethod("cod")}
                            className={`flex items-center gap-3 w-full border rounded-lg p-3 transition-all cursor-pointer ${
                                paymentMethod === "cod" ? "border-green-600 bg-green-50 shadow-sm" : "hover:bg-gray-50"
                            }`}
                        >
                            <Truck className='text-green-600' /><span className='font-medium text-gray-700'>Cash on Delivery</span>
                        </button>
                    </div>
                    <div className='border-t pt-4 text-gray-700 space-y-2 text-sm sm:text-base'>
                        <div className='flex justify-between'>
                            <span className='font-semibold'>Subtotal</span>
                            <span className='font-semibold text-green-600'>₹{subTotal}</span>
                        </div>
                        <div className='flex justify-between'>
                            <span className='font-semibold'>Delivery Fee</span>
                            <span className='font-semibold text-green-600'>₹{deliveryFee}</span>
                        </div>
                        <div className='flex justify-between font-bold text-lg border-t pt-3'>
                            <span>Final Total</span>
                            <span className='font-semibold text-green-600'>₹{finalTotal}</span>
                        </div>
                    </div>
                    
                    <motion.button
                        whileTap={{ scale: 0.93 }}
                        disabled={orderLoading}
                        className='w-full mt-6 bg-green-600 text-white py-3 rounded-full hover:bg-green-700 transition-all font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50'
                        onClick={() => {
                            if (paymentMethod === "cod") {
                                handleCod()
                            } else {
                                handleOnlinePayment()
                            }
                        }}
                    >
                        {orderLoading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : paymentMethod === "cod" ? (
                            "Place Order"
                        ) : (
                            "Pay & Place Order"
                        )}
                    </motion.button>
                </motion.div>
            </div>
        </div>
    )
}

export default Checkout