import React, { useEffect, useRef, useState } from "react"
import ReactDOM from "react-dom/client"
import { HashRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import { BookOpenText, LayoutDashboard, RefreshCw, Shield, Workflow } from "lucide-react"
import PageTransition from "./components/PageTransition"
import { getActiveSystemSection } from "./components/SystemSectionNav"
import { Sidebar, SidebarBody, SidebarLink } from "./components/ui/sidebar"
import { cn } from "./lib/utils"
import DeviceMonitorPage from "./pages/DeviceMonitorPage"
import CrossDevicePage from "./pages/CrossDevicePage"
import OpeningPage from "./pages/OpeningPage"
import SystemOverviewUnifiedPage from "./pages/SystemOverviewUnifiedPage"
import "./index.css"

function AnimatedAppRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route index element={<PageTransition><DeviceMonitorPage /></PageTransition>} />
        <Route path="system-overview" element={<PageTransition><SystemOverviewUnifiedPage /></PageTransition>} />
        <Route path="system-overview/agent-guide" element={<LegacyRedirect to="/app/system-overview?section=agent-guide" />} />
        <Route path="system-overview/architecture" element={<LegacyRedirect to="/app/system-overview?section=architecture" />} />
        <Route path="system-overview/crisis" element={<LegacyRedirect to="/app/system-overview?section=crisis" />} />
        <Route path="cross-device" element={<PageTransition><CrossDevicePage /></PageTransition>} />
        <Route path="agent-guide" element={<LegacyRedirect to="/app/system-overview?section=agent-guide" />} />
        <Route path="architecture" element={<LegacyRedirect to="/app/system-overview?section=architecture" />} />
        <Route path="crisis" element={<LegacyRedirect to="/app/system-overview?section=crisis" />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

function LegacyRedirect({ to }: { to: string }) {
  const location = useLocation()
  return <Navigate to={`${to}${location.search}`} replace />
}

function Logo() {
  return (
    <Link to="/app" className="relative z-20 flex items-center gap-3 py-1">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-950 text-xs font-bold text-white shadow-sm">
        SW
      </div>
      <div className="min-w-0">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="block whitespace-pre text-sm font-bold text-slate-900"
        >
          同频
        </motion.span>
        <span className="block whitespace-pre text-[9px] font-medium tracking-wide text-slate-400">
          Same Wavelength
        </span>
      </div>
    </Link>
  )
}

const primaryNavLinks = [
  {
    label: "设备监测",
    href: "/app",
    icon: <RefreshCw className="h-5 w-5 flex-shrink-0 text-slate-700 transition-colors group-hover/sidebar:text-cyan-700" />,
  },
  {
    label: "系统总览",
    href: "/app/system-overview",
    icon: <LayoutDashboard className="h-5 w-5 flex-shrink-0 text-slate-700 transition-colors group-hover/sidebar:text-cyan-700" />,
  },
]

const systemOverviewLinks = [
  {
    section: "agent-guide",
    label: "Agent 运作说明",
    href: "/app/system-overview?section=agent-guide",
    icon: <BookOpenText className="h-4 w-4 flex-shrink-0 text-slate-500 transition-colors group-hover/sidebar:text-emerald-700 group-data-[active=true]/sidebar:text-emerald-200" />,
  },
  {
    section: "architecture",
    label: "Agent 架构",
    href: "/app/system-overview?section=architecture",
    icon: <Workflow className="h-4 w-4 flex-shrink-0 text-slate-500 transition-colors group-hover/sidebar:text-indigo-700 group-data-[active=true]/sidebar:text-indigo-200" />,
  },
  {
    section: "crisis",
    label: "安全响应",
    href: "/app/system-overview?section=crisis",
    icon: <Shield className="h-4 w-4 flex-shrink-0 text-slate-500 transition-colors group-hover/sidebar:text-rose-600 group-data-[active=true]/sidebar:text-rose-200" />,
  },
]

function AppLayout() {
  const location = useLocation()
  const overviewActive = location.pathname.startsWith("/app/system-overview")
  const mainRef = useRef<HTMLElement>(null)
  const [currentOverviewSection, setCurrentOverviewSection] = useState(
    () => new URLSearchParams(location.search).get("section") ?? "overview",
  )

  useEffect(() => {
    const requestedSection = new URLSearchParams(location.search).get("section")
    if (requestedSection) setCurrentOverviewSection(requestedSection)
  }, [location.search])

  useEffect(() => {
    if (!overviewActive) return

    const scrollContainer = mainRef.current
    if (!scrollContainer) return

    const updateActiveSection = () => {
      setCurrentOverviewSection(getActiveSystemSection(scrollContainer))
    }

    scrollContainer.addEventListener("scroll", updateActiveSection, { passive: true })
    updateActiveSection()

    return () => scrollContainer.removeEventListener("scroll", updateActiveSection)
  }, [overviewActive, location.pathname])

  return (
    <div className={cn("flex h-screen w-full flex-1 flex-col overflow-hidden md:flex-row")}>
      <Sidebar animate={true}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            <Logo />
            <div className="mt-8">
              <div className="mb-2 whitespace-nowrap px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                功能与说明
              </div>
              <div className="flex flex-col gap-2">
                {primaryNavLinks.map((link, idx) => (
                  <SidebarLink
                    key={idx}
                    link={link}
                    className={cn(
                      link.href === "/app/system-overview" && overviewActive && "bg-slate-100",
                    )}
                  />
                ))}
                <div className="ml-5 border-l border-slate-200 pl-2">
                  {systemOverviewLinks.map((link) => (
                    <SidebarLink
                      key={link.href}
                      link={link}
                      active={overviewActive && currentOverviewSection === link.section}
                      className="min-h-9 py-1.5"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: "Same Wavelength",
                href: "/",
                icon: (
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-950">
                    <span className="text-xs font-bold text-white">S</span>
                  </div>
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      <main
        ref={mainRef}
        className="relative z-10 flex flex-1 flex-col overflow-y-auto border-l border-slate-200 bg-slate-50"
      >
        <AnimatedAppRoutes />
      </main>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <HashRouter>
    <Routes>
      <Route path="/" element={<OpeningPage />} />
      <Route path="/app/*" element={<AppLayout />} />
      <Route path="/godmode" element={<LegacyRedirect to="/app/system-overview" />} />
      <Route path="/architecture" element={<LegacyRedirect to="/app/system-overview?section=architecture" />} />
      <Route path="/cross-device" element={<LegacyRedirect to="/app/cross-device" />} />
      <Route path="/crisis" element={<LegacyRedirect to="/app/system-overview?section=crisis" />} />
      <Route path="/agent-guide" element={<LegacyRedirect to="/app/system-overview?section=agent-guide" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </HashRouter>,
)
