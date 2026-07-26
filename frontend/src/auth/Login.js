import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiJson } from "../api";
import SocialAuth from "./SocialAuth";
import "./Auth.css";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(location.state?.error || "");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");

    try {
      setLoading(true);

      const data = await apiJson("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      localStorage.setItem("token", data.token);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleLogin}>
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Sign in to access your health consultations</p>

        {error && <div className="error-banner">{error}</div>}

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={event => setEmail(event.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          required
        />

        <button className="submit-btn" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <SocialAuth />

        <p>
          Don&apos;t have an account?{" "}
          <span className="link-text" onClick={() => navigate("/signup")}>Sign up</span>
        </p>
      </form>
    </div>
  );
}
