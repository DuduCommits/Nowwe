import { lazy, Suspense, useState, useEffect, createContext, useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Eager load critical path pages
import Landing from "./pages/Landing";
import GroupSetup from "./pages/GroupSetup";
import JoinGroup from "./pages/JoinGroup";
import AppLayout from "./components/AppLayout";

// Lazy load heavy pages
const ExpenseLogger = lazy(() => import("./pages/ExpenseLogger"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ScenarioPlanner = lazy(() => import("./pages/ScenarioPlanner"));
const FairnessReport = lazy(() => import("./pages/FairnessReport"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

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

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-text-muted">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { currentGroup } = useContext(GroupContext);
  return currentGroup ? children : <Navigate to="/" replace />;
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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/setup" element={<GroupSetup />} />
          <Route path="/join/:code" element={<JoinGroup />} />
          <Route
            path="/group/:code"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ExpenseLogger />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/group/:code/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/group/:code/scenarios"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ScenarioPlanner />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/group/:code/report"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <FairnessReport />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/group/:code/settings"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Settings />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </GroupContext.Provider>
  );
}
