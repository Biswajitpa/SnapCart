import { auth } from '@/auth'
import AdminDashboard from '@/components/AdminDashboard'
import DeliveryBoy from '@/components/DeliveryBoy'
import EditRoleMobile from '@/components/EditRoleMobile'
import Footer from '@/components/Footer'
import GeoUpdater from '@/components/GeoUpdater'
import Nav from '@/components/Nav'
import UserDashboard from '@/components/UserDashboard'
import connectDb from '@/lib/db'
import Grocery, { IGrocery } from '@/models/grocery.model'
import User from '@/models/user.model'
import { redirect } from 'next/navigation'

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function Home({ searchParams }: PageProps) {
  // 🎯 1. Correctly await the dynamic async search params for Next.js 16
  const resolvedParams = await searchParams;
  const searchQuery = resolvedParams?.q || "";

  await connectDb()
  const session = await auth()
  if (!session || !session.user) redirect("/login")

  // 🎯 2. Safely grab the id using fallback options
  const userId = session.user.id || (session.user as any)._id;
  if (!userId) redirect("/login")

  const user = await User.findById(userId)
  if (!user) redirect("/login")

  const inComplete = !user.mobile || !user.role || (!user.mobile && user.role == "user")
  if (inComplete) {
    return <EditRoleMobile />
  }

  const plainUser = JSON.parse(JSON.stringify(user))
  let groceryList: IGrocery[] = []

  if (user.role === "user") {
    // 🎯 3. Clean search evaluation using your query string
    if (searchQuery.trim() !== "") {
      groceryList = await Grocery.find({
        $or: [
          { name: { $regex: searchQuery, $options: "i" } },
          { category: { $regex: searchQuery, $options: "i" } },
        ]
      })
    } else {
      groceryList = await Grocery.find({})
    }
  }

  return (
    <>
      <Nav user={plainUser} />
      <GeoUpdater userId={plainUser._id} />
      {user.role === "user" ? (
        <UserDashboard groceryList={JSON.parse(JSON.stringify(groceryList))} />
      ) : user.role === "admin" ? (
        <AdminDashboard />
      ) : <DeliveryBoy />}
      <Footer />
    </>
  )
}
