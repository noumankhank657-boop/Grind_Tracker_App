import { Routes, Route } from "react-router";
import AppLayout from "@/components/AppLayout";
import Today from "@/pages/Today";
import Setup from "@/pages/Setup";
import Reports from "@/pages/Reports";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Today />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/reports" element={<Reports />} />
      </Route>
    </Routes>
  );
}
