import React, { useState } from "react"
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar"
import { LayoutDashboard, UserCog, Settings, LogOut, Workflow, Shield, ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export function SidebarDemoPage() {
  const links = [
    {
      label: "Dashboard",
      href: "/godmode",
      icon: <LayoutDashboard className="text-gray-900 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Agent",
      href: "/architecture",
      icon: <Workflow className="text-gray-900 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Crisis",
      href: "/crisis",
      icon: <Shield className="text-gray-900 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Profile",
      href: "#",
      icon: <UserCog className="text-gray-900 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Settings",
      href: "#",
      icon: <Settings className="text-gray-900 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Logout",
      href: "#",
      icon: <LogOut className="text-gray-900 h-5 w-5 flex-shrink-0" />,
    },
  ]

  const [open, setOpen] = useState(false)

  return (
    <div
      className={cn(
        "rounded-md flex flex-col md:flex-row bg-surface-900 w-full flex-1 mx-auto overflow-hidden",
        "h-[calc(100vh-56px)]"
      )}
    >
      <Sidebar open={open} setOpen={setOpen} animate={true}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: "Same Wavelength",
                href: "/",
                icon: (
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center">
                    <span className="text-xs font-bold text-white">S</span>
                  </div>
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      <Dashboard />
    </div>
  )
}

export const Logo = () => {
  return (
    <Link
      to="/"
      className="font-normal flex space-x-2 items-center text-sm text-white py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-gradient-to-br from-accent-blue to-accent-purple rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-white whitespace-pre"
      >
        Same Wavelength
      </motion.span>
    </Link>
  )
}

export const LogoIcon = () => {
  return (
    <Link
      to="/"
      className="font-normal flex space-x-2 items-center text-sm text-white py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-gradient-to-br from-accent-blue to-accent-purple rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
    </Link>
  )
}

// Dashboard content area
const Dashboard = () => {
  return (
    <div className="flex flex-1">
      <div className="p-4 md:p-8 rounded-tl-2xl border border-border-subtle bg-surface-800 flex flex-col gap-4 flex-1 w-full h-full overflow-y-auto">
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-sm text-gray-900 mt-1">Here is what is happening with your project today.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Agents", value: "5", icon: "🤖", color: "#4da6ff" },
            { label: "Active Tasks", value: "3", icon: "📋", color: "#4dff88" },
            { label: "Risk Level", value: "Safe", icon: "🛡️", color: "#ffcc4d" },
            { label: "Uptime", value: "99.9%", icon: "⚡", color: "#b44dff" },
          ].map((stat, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-surface-900 border border-border-subtle flex items-center gap-3"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                style={{ backgroundColor: `${stat.color}18` }}
              >
                {stat.icon}
              </div>
              <div>
                <p className="text-xs text-gray-900">{stat.label}</p>
                <p className="text-lg font-bold text-white">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1">
          <div className="lg:col-span-2 p-4 rounded-xl bg-surface-900 border border-border-subtle">
            <h2 className="text-sm font-semibold text-white mb-3">Recent Activity</h2>
            <div className="space-y-3">
              {[
                { title: "Decision Agent: L2 plan activated", time: "2 min ago", color: "accent-blue" },
                { title: "Memory recall: 3 long-term entries", time: "15 min ago", color: "accent-purple" },
                { title: "Safety scan: all clear", time: "1 hour ago", color: "accent-green" },
                { title: "Cross-device sync completed", time: "2 hours ago", color: "accent-yellow" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-surface-800 transition-colors cursor-pointer">
                  <div className={`w-2 h-2 rounded-full bg-${item.color} mt-1.5 flex-shrink-0`}
                    style={{ backgroundColor: `var(--color-${item.color})` }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-900">{item.time}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-900 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-surface-900 border border-border-subtle">
            <h2 className="text-sm font-semibold text-white mb-3">Quick Actions</h2>
            <div className="space-y-2">
              {["Run Safety Scan", "View Memory Logs", "Check Device Sync", "Export Report"].map((action, i) => (
                <button
                  key={i}
                  className="w-full text-left px-3 py-2.5 rounded-lg bg-surface-800 border border-border-subtle text-sm text-gray-900 hover:text-white hover:border-accent-blue/30 transition-all"
                >
                  {action}
                </button>
              ))}
            </div>

            <div className="mt-4 p-3 rounded-lg bg-accent-blue/5 border border-accent-blue/20">
              <p className="text-xs text-accent-blue font-medium">Pro Tip</p>
              <p className="text-xs text-gray-900 mt-1">Use the God Mode dashboard to simulate different user states and watch how the Decision Agent adapts in real-time.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
