'use client'
import React from 'react'
import { motion } from "motion/react"
import Link from 'next/link'
import { Facebook, Instagram, Mail, MapPin, Phone, Twitter, Linkedin } from 'lucide-react'

function Footer() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="bg-linear-to-r from-green-600 to-green-700 text-white mt-20"
    >
      {/* Main Grid Wrapper */}
      <div className='w-[90%] md:w-[80%] mx-auto py-10 grid grid-cols-1 md:grid-cols-3 gap-10 border-b border-green-500/40'>
        
        {/* Brand Column */}
        <div>
          <h2 className='text-2xl font-bold mb-3'>Snapcart</h2>
          <p className='text-sm text-green-100 leading-relaxed'> 
            Your one-stop online grocery store delivering freshness to your doorstep.  
            Shop smart, eat fresh, and save more every day!
          </p>
        </div>

        {/* Quick Links Column */}
        <div>
          <h2 className='text-xl font-semibold mb-3'>Quick Links</h2>
          <ul className='space-y-2 text-green-100 text-sm'>
            <li><Link href={"/"} className='hover:text-white transition'>Home</Link></li>
            <li><Link href={"/cart"} className='hover:text-white transition'>Cart</Link></li>
            <li><Link href={"/my-orders"} className='hover:text-white transition'>My Orders</Link></li>
          </ul>
        </div>

        {/* Contact & Socials Column */}
        <div>
          <h3 className="text-xl font-semibold mb-3">Contact Us</h3>
          <ul className="space-y-2 text-green-100 text-sm">
            <li className="flex items-center gap-2">
              <MapPin size={16} />  Jatani, Odisha, 752020, India
            </li>
            <li className="flex items-center gap-2">
              <Phone size={16} /> +91 8658846620
            </li>
            <li className="flex items-center gap-2">
              <Mail size={16} /> pattanaikbiswajit07@gmail.com
            </li>
          </ul>

          {/* 🌐 Social Links */}
          <div className="flex gap-4 mt-4">
            <Link href="https://facebook.com" target="_blank">
              <Facebook className="w-5 h-5 hover:text-white transition" />
            </Link>
            <Link href="https://instagram.com" target="_blank">
              <Instagram className="w-5 h-5 hover:text-white transition" />
            </Link>
            <Link href="https://twitter.com" target="_blank">
              <Twitter className="w-5 h-5 hover:text-white transition" />
            </Link>
          </div>
        </div>

      </div>

      {/* 🎯 Bottom Copyright & Developer Bar */}
      <div className="bg-green-800/40 py-4 text-center text-sm text-green-100 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>&copy; {new Date().getFullYear()} <span className="font-semibold">Snapcart</span>. All rights reserved.</p>
          
          {/* Developer Attribution with Linked LinkedIn Option */}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-green-200">
            <span>Developed with ❤️ by</span>
            <Link 
              href="https://linkedin.com" // 💡 Change this string to your real LinkedIn profile URL
              target="_blank" 
              className="group flex items-center gap-1.5 font-bold text-white tracking-wide hover:text-lime-300 transition duration-200"
            >
              Biswajit Pattanaik
              <Linkedin className="w-4 h-4 text-green-200 group-hover:text-lime-300 transition duration-200 transform group-hover:scale-110" />
            </Link>
          </div>
        </div>
      </div>

    </motion.div>
  )
}

export default Footer