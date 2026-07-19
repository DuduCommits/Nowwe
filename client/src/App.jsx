import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect, createContext, useContext } from "react";
import Landing from "./pages/Landing";
import GroupSetup from "./pages/GroupSetup";
import JoinGroup from "./pages/JoinGroup";
import AppLayout from "./components/AppLayout";
import ExpenseLogger from "./pages/ExpenseLogger";
import Dashboard from "./pages/Dashboard";
import ScenarioPlanner from "./pages/ScenarioPlanner";
import FairnessReport from "./pages/FairnessReport";
import Settings from "./pages/Settings";

export const GroupContext = createContext();

export function useGroup() {
  return useContext(GroupContext);
}

function getStoredGroup() {
  try {
    const stored = localStorage.getItem("balanceboard_group");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [currentGroup, setCurrentGroup] = useState(getStoredGroup);

  useEffect(() => {
    if (currentGroup) {
      localStorage.setItem("balanceboard_group", JSON.stringify(currentGroup));
    } else {
      localStorage.removeItem("balanceboard_group");
    }
  }, [currentGroup]);

  return (
    <GroupContext.Provider value={{ currentGroup, setCurrentGroup }}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/setup" element={<GroupSetup />} />
        <Route path="/join/:code" element={<JoinGroup />} />
        <Route
          path="/group/:code"
          element={
            currentGroup ? (
              <AppLayout>
                <ExpenseLogger />
              </AppLayout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/group/:code/dashboard"
          element={
            currentGroup ? (
              <AppLayout>
                <Dashboard />
              </AppLayout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/group/:code/scenarios"
          element={
            currentGroup ? (
              <AppLayout>
                <ScenarioPlanner />
              </AppLayout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/group/:code/report"
          element={
            currentGroup ? (
              <AppLayout>
                <FairnessReport />
              </AppLayout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/group/:code/settings"
          element={
            currentGroup ? (
              <AppLayout>
                <Settings />
              </AppLayout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </GroupContext.Provider>
  );
}
