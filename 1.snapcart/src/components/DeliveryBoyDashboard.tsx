'use client'
import { getSocket } from '@/lib/socket'
import { RootState } from '@/redux/store'
import axios from 'axios'
import React, { useEffect, useState, useCallback } from 'react'
import { useSelector } from 'react-redux'
import LiveMap from './LiveMap'
import DeliveryChat from './DeliveryChat'
import { Loader } from 'lucide-react'
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface ILocation {
  latitude: number,
  longitude: number
}

function DeliveryBoyDashboard({ earning }: { earning: number }) {
  const [assignments, setAssignments] = useState<any[]>([])
  const { userData } = useSelector((state: RootState) => state.user)
  const [activeOrder, setActiveOrder] = useState<any>(null)
  const [showOtpBox, setShowOtpBox] = useState(false)
  const [otpError, setOtpError] = useState("")
  const [sendOtpLoading, setSendOtpLoading] = useState(false)
  const [verifyOtpLoading, setVerifyOtpLoading] = useState(false)
  const [otp, setOtp] = useState("")
  
  const [userLocation, setUserLocation] = useState<ILocation>({
    latitude: 0,
    longitude: 0
  })
  const [deliveryBoyLocation, setDeliveryBoyLocation] = useState<ILocation>({
    latitude: 0,
    longitude: 0
  })

  // 🎯 FIXED: Wrapped inside useCallback to keep the reference stable and satisfy TypeScript rules
  const fetchAssignments = useCallback(async () => {
    try {
      const result = await axios.get("/api/delivery/get-assignments")
      setAssignments(result.data || [])
    } catch (error) {
      console.error("❌ Failed to pull open broadcast queue:", error)
    }
  }, [])

  // 🎯 FIXED: Wrapped inside useCallback to prevent infinite layout re-rendering loops
  const fetchCurrentOrder = useCallback(async () => {
    try {
      const result = await axios.get("/api/delivery/current-order")
      if (result.data && result.data.active && result.data.assignment?.order) {
        setActiveOrder(result.data.assignment)
        
        const addr = result.data.assignment.order.address;
        const lat = Number(addr?.latitude) || Number(result.data.assignment.order.location?.coordinates?.[1]) || 0;
        const lon = Number(addr?.longitude) || Number(result.data.assignment.order.location?.coordinates?.[0]) || 0;
        
        setUserLocation({ latitude: lat, longitude: lon })
      } else {
        setActiveOrder(null)
      }
    } catch (error) {
      console.error("❌ Error fetching current assigned active order status:", error)
    }
  }, [])

  // GPS Tracking Watcher Loop
  useEffect(() => {
    const socket = getSocket()
    const targetUserId = userData?._id?.toString();
    if (!targetUserId || !navigator.geolocation) return

    const watcher = navigator.geolocation.watchPosition((pos) => {
      const lat = pos.coords.latitude
      const lon = pos.coords.longitude
      setDeliveryBoyLocation({ latitude: lat, longitude: lon })
      
      try {
        socket.emit("update-location", {
          userId: targetUserId,
          latitude: lat,
          longitude: lon
        })
      } catch (e) {
        console.warn("⚠️ WebSocket connection offline, location packet skipped.")
      }
    }, (err) => {
      console.error("GPS Watcher failure tracking coordinates:", err)
    }, { enableHighAccuracy: true })

    return () => navigator.geolocation.clearWatch(watcher)
  }, [userData])

  // Real-Time Socket Event Listener
  useEffect(() => {
    try {
      const socket = getSocket()
      socket.on("new-assignment", (deliveryAssignment) => {
        setAssignments((prev) => {
          const alreadyExists = prev.some(item => item._id === deliveryAssignment._id);
          if (alreadyExists) return prev;
          return [...prev, deliveryAssignment];
        })
      })
      return () => { socket.off("new-assignment") }
    } catch (e) {
      console.error("Socket link not available for streaming events.")
    }
  }, [])

  const handleAccept = async (id: string) => {
    try {
      await axios.put(`/api/delivery/assignment/${id}/accept-assignment`)
      await fetchCurrentOrder()
      await fetchAssignments()
    } catch (error: any) {
      console.error("🔥 Error committing assignment acceptance state:", error?.response?.data || error.message)
    }
  }

  useEffect(() => {
    try {
      const socket = getSocket()
      socket.on("update-deliveryBoy-location", ({ userId, location }) => {
        if (location?.coordinates) {
          setDeliveryBoyLocation({
            latitude: location.coordinates[1],
            longitude: location.coordinates[0]
          })
        }
      })
      return () => { socket.off("update-deliveryBoy-location") }
    } catch (e) {
      console.warn("Real-time listener registration skipped.")
    }
  }, [])

  // 🎯 FIXED DEPENDENCY ARRAY: Safely tracking stable function dependencies on line 147
  useEffect(() => {
    const validRiderId = userData?._id;

    if (validRiderId) {
      fetchCurrentOrder()
      fetchAssignments()

      const backupPollInterval = setInterval(() => {
        fetchAssignments()
        fetchCurrentOrder()
      }, 4000)

      return () => clearInterval(backupPollInterval)
    }
  }, [userData, fetchAssignments, fetchCurrentOrder])

  const sendOtp = async () => {
    if (!activeOrder?.order?._id) return
    setSendOtpLoading(true)
    try {
      await axios.post("/api/delivery/otp/send", { orderId: activeOrder.order._id })
      setShowOtpBox(true)
    } catch (error) {
      console.error("Failed to trigger validation SMS transmission pipeline:", error)
    } finally {
      setSendOtpLoading(false)
    }
  }

  const verifyOtp = async () => {
    if (!activeOrder?.order?._id) return
    setVerifyOtpLoading(true)
    setOtpError("")
    try {
      await axios.post("/api/delivery/otp/verify", { orderId: activeOrder.order._id, otp })
      
      setActiveOrder(null)
      setAssignments([])
      setShowOtpBox(false)
      setOtp("")
      
      await Promise.all([fetchCurrentOrder(), fetchAssignments()])
      window.location.reload()
    } catch (error) {
      setOtpError("Invalid verification code profile. Please recheck parameters.")
    } finally {
      setVerifyOtpLoading(false)
    }
  }

  // 🎯 RENDERING ZONE A: Dashboard Performance View
  if (!activeOrder && assignments.length === 0) {
    const todayEarning = [
      {
        name: "Today",
        earning: earning || 0,
        deliveries: earning ? earning / 40 : 0
      }
    ]

    return (
      <div className='flex items-center justify-center min-h-screen bg-gradient-to-br from-white to-green-50 p-6'>
        <div className='max-w-md w-full text-center'>
          <h2 className='text-2xl font-bold text-gray-800'>No Active Deliveries 🚛</h2>
          <p className='text-gray-500 mb-5'>Stay online to receive new orders</p>

          <div className='bg-white border rounded-xl shadow-xl p-6'>
            <h2 className='font-medium text-green-700 mb-2'>Today's Performance</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={todayEarning}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="earning" name="Earnings (₹)" fill="#16a34a" />
                <Bar dataKey="deliveries" name="Deliveries" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
            <p className='mt-4 text-lg font-bold text-green-700'>{earning || 0} Earned today</p>
            <button className='mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg' onClick={() => window.location.reload()}>Refresh Earning</button>
          </div>
        </div>
      </div>
    )
  }

  // 🎯 RENDERING ZONE B: Active Delivery Map View Panel
  if (activeOrder) {
    return (
      <div className='p-4 pt-[120px] min-h-screen bg-gray-50'>
        <div className='max-w-3xl mx-auto'>
          <h1 className='text-2xl font-bold text-green-700 mb-2'>Active Delivery</h1>
          <p className='text-gray-600 text-sm mb-4'>order#{activeOrder?.order?._id?.slice(-6)}</p>

          {(userLocation.latitude === 0 && userLocation.longitude === 0) && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4 rounded-r-lg text-sm text-amber-800">
              ⚠️ <b>Location Notice:</b> Order coordinates are reading as 0. Please ensure address values are completely filled in MongoDB.
            </div>
          )}

          <div className='rounded-xl border shadow-lg overflow-hidden mb-6'>
            <LiveMap userLocation={userLocation} deliveryBoyLocation={deliveryBoyLocation} />
          </div>
          
          <DeliveryChat orderId={activeOrder?.order?._id} deliveryBoyId={userData?._id?.toString()!} />
          
          <div className='mt-6 bg-white rounded-xl border shadow p-6'>
            {!activeOrder?.order?.deliveryOtpVerification && !showOtpBox && (
              <button
                onClick={sendOtp}
                disabled={sendOtpLoading}
                className='w-full py-4 bg-green-600 hover:bg-green-700 text-center text-white font-bold rounded-lg flex items-center justify-center gap-2'
              >
                {sendOtpLoading ? <Loader size={16} className='animate-spin text-white' /> : "Mark as Delivered"}
              </button>
            )}
            {showOtpBox && (
              <div className='mt-4'>
                <input type="text" className='w-full py-3 border rounded-lg text-center font-bold text-lg' placeholder='Enter Otp' maxLength={4} onChange={(e) => setOtp(e.target.value)} value={otp} />
                <button disabled={verifyOtpLoading} className='w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-3 text-center rounded-lg font-bold flex items-center justify-center gap-2' onClick={verifyOtp}>
                  {verifyOtpLoading ? <Loader size={16} className='animate-spin text-white' /> : "Verify OTP"}
                </button>
                {otpError && <div className='text-red-600 mt-2 text-center text-sm font-semibold'>{otpError}</div>}
              </div>
            )}
            {activeOrder?.order?.deliveryOtpVerification && <div className='text-green-700 text-center font-bold'>Delivery completed!</div>}
          </div>
        </div>
      </div>
    )
  }

  // 🎯 RENDERING ZONE C: Available Assignments Queue Pool List
  return (
    <div className='w-full min-h-screen bg-gray-50 p-4'>
      <div className="max-w-3xl mx-auto">
        <h2 className='text-2xl font-bold mt-[120px] mb-[30px]'>Delivery Assignments</h2>

        {assignments.map((a, index) => (
          // 💡 FIXED UNIQUE KEYS: Appending explicit indexes to eliminate duplicate key warning outputs
          <div key={`${a._id || 'assignment'}-${index}`} className='p-5 bg-white rounded-xl shadow mb-4 border'>
            <p><b>Order Id </b> #{a?.order?._id?.slice(-6)}</p>
            <p className='text-gray-600 mt-1'>{a?.order?.address?.fullAddress || "No explicit delivery address provided."}</p>

            <div className='flex gap-3 mt-4'>
              <button className='flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold shadow' onClick={() => handleAccept(a._id)}>
                Accept
              </button>
              <button className='flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-bold'>
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DeliveryBoyDashboard;