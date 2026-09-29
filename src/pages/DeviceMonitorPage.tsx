import { useLocation, useNavigate } from "react-router-dom"
import LandingPage from "./LandingPage"
import CrossDevicePage from "./CrossDevicePage"

export default function DeviceMonitorPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const monitoring = new URLSearchParams(location.search).get("stage") === "monitor"

  if (monitoring) {
    return (
      <CrossDevicePage
        embedded
        onBackToSetup={() => navigate("/app")}
      />
    )
  }

  return <LandingPage onComplete={() => navigate("/app?stage=monitor")} />
}
