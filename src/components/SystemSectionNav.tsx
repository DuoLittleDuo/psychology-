import { useEffect, useState } from "react"
import { BookOpenText, LayoutDashboard, Shield, Workflow } from "lucide-react"
import { cn } from "../lib/utils"

export const SYSTEM_SECTIONS = [
  {
    id: "overview",
    to: "/app/system-overview",
    label: "运行总览",
    icon: LayoutDashboard,
  },
  {
    id: "agent-guide",
    to: "/app/system-overview?section=agent-guide",
    label: "Agent 运作说明",
    icon: BookOpenText,
  },
  {
    id: "architecture",
    to: "/app/system-overview?section=architecture",
    label: "Agent 架构",
    icon: Workflow,
  },
  {
    id: "crisis",
    to: "/app/system-overview?section=crisis",
    label: "安全响应",
    icon: Shield,
  },
]

export function getSystemSectionElementId(sectionId: string) {
  return `system-section-${sectionId}`
}

export function getActiveSystemSection(scrollContainer: HTMLElement) {
  const containerTop = scrollContainer.getBoundingClientRect().top
  let currentSection = SYSTEM_SECTIONS[0].id

  for (const section of SYSTEM_SECTIONS) {
    const element = document.getElementById(getSystemSectionElementId(section.id))
    if (element && element.getBoundingClientRect().top - containerTop <= 180) {
      currentSection = section.id
    }
  }

  return currentSection
}

export default function SystemSectionNav({ className }: { className?: string }) {
  const [activeSection, setActiveSection] = useState(SYSTEM_SECTIONS[0].id)

  useEffect(() => {
    const scrollContainer = document.querySelector("main")
    if (!(scrollContainer instanceof HTMLElement)) return

    const updateActiveSection = () => setActiveSection(getActiveSystemSection(scrollContainer))

    scrollContainer.addEventListener("scroll", updateActiveSection, { passive: true })
    updateActiveSection()

    return () => scrollContainer.removeEventListener("scroll", updateActiveSection)
  }, [])

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    document.getElementById(getSystemSectionElementId(sectionId))?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }

  return (
    <div className={cn("no-scrollbar min-w-0 overflow-x-auto", className)}>
      <nav
        aria-label="系统总览子目录"
        className="flex w-max min-w-full items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/80 p-1"
      >
        {SYSTEM_SECTIONS.map((section) => {
          const Icon = section.icon
          const isActive = activeSection === section.id

          return (
            <button
              key={section.id}
              type="button"
              aria-current={isActive ? "location" : undefined}
              onClick={() => scrollToSection(section.id)}
              className={cn(
                "flex min-h-8 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition-colors",
                isActive
                  ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                  : "border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-900",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap">{section.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
