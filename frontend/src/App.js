import { Routes, Route } from "react-router-dom";
import "./App.css";
import Login from "./auth/Login";
import Signup from "./auth/Signup";
import MainApp from "./MainApp";
import HealthProfilePage from "./pages/HealthProfilePage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/profile" element={<HealthProfilePage />} />
      <Route path="/" element={<MainApp />} />
    </Routes>
  );
}
