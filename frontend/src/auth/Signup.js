import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiJson } from "../api";
import SocialAuth from "./SocialAuth";
import "./Auth.css";

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [error, setError] = useState(location.state?.error || "");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      return setError("All fields are required.");
    }

    if (form.password.length < 6) {
      return setError("Password must be at least 6 characters.");
    }

    if (form.password !== form.confirmPassword) {
      return setError("Passwords do not match.");
    }

    try {
      setLoading(true);

      const data = await apiJson("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(form)
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
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Create Account</h2>
        <p className="auth-subtitle">Join CuraLink AI for personal health guidance</p>

        {error && <div className="error-banner">{error}</div>}

        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={form.name}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={form.email}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password (min 6 chars)"
          value={form.password}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password"
          value={form.confirmPassword}
          onChange={handleChange}
          required
        />

        <button className="submit-btn" disabled={loading}>
          {loading ? "Creating Account..." : "Sign Up"}
        </button>

        <SocialAuth />

        <p>
          Already have an account?{" "}
          <span className="link-text" onClick={() => navigate("/login")}>Login</span>
        </p>
      </form>
    </div>
  );
}
