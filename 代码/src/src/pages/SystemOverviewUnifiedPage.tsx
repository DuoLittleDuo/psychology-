import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { getSystemSectionElementId } from "../components/SystemSectionNav"
import AgentArchitecturePage from "./AgentArchitecturePage"
import AgentGuidePage from "./AgentGuidePage"
import CrisisFlowPage from "./CrisisFlowPage"
import SystemOverviewPage from "./SystemOverviewPage"

const VALID_SECTIONS = new Set(["overview", "agent-guide", "architecture", "crisis"])

const SECTION_DIVIDER_GRADIENT = "from-sky-500 via-blue-700 to-slate-950"

function SectionDivider({
  index,
  label,
}: {
  index: string
  label: string
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] items-center gap-3 px-4 pb-2 pt-7 md:px-6 md:pt-9">
      <span className="h-8 w-1 shrink-0 rounded-full bg-blue-600" />
      <span className="shrink-0 text-xs font-black tracking-[0.18em] text-blue-700">{index}</span>
      <h2
        className={`min-w-0 bg-gradient-to-r ${SECTION_DIVIDER_GRADIENT} bg-clip-text text-4xl font-black leading-none tracking-normal text-transparent md:text-5xl`}
      >
        {label}
      </h2>
      <span className="ml-2 h-px min-w-8 flex-1 bg-gradient-to-r from-slate-300 to-transparent" />
    </div>
  )
}

export default function SystemOverviewUnifiedPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const requestedSection = searchParams.get("section")
    if (!requestedSection || !VALID_SECTIONS.has(requestedSection)) return

    const scrollTimer = window.setTimeout(() => {
      document.getElementById(getSystemSectionElementId(requestedSection))?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }, 80)

    const cleanupTimer = window.setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete("section")
      setSearchParams(nextParams, { replace: true })
    }, 900)

    return () => {
      window.clearTimeout(scrollTimer)
      window.clearTimeout(cleanupTimer)
    }
  }, [searchParams, setSearchParams])

  return (
    <div className="min-h-full bg-slate-50">
      <section id={getSystemSectionElementId("overview")} className="h-screen min-h-0">
        <SystemOverviewPage />
      </section>

      <section
        id={getSystemSectionElementId("agent-guide")}
        className="min-h-screen scroll-mt-4 bg-slate-50"
      >
        <SectionDivider index="02" label="Agent 运作说明" />
        <AgentGuidePage />
      </section>

      <section
        id={getSystemSectionElementId("architecture")}
        className="min-h-screen scroll-mt-4 bg-slate-50"
      >
        <SectionDivider index="03" label="Agent 架构" />
        <AgentArchitecturePage />
      </section>

      <section
        id={getSystemSectionElementId("crisis")}
        className="min-h-screen scroll-mt-4 bg-slate-50"
      >
        <SectionDivider index="04" label="安全响应" />
        <CrisisFlowPage />
      </section>
    </div>
  )
}
