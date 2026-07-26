import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import HealthProfile from "../components/HealthProfile";
import { apiJson, clearToken, getToken } from "../api";
import "../auth/Auth.css";

export default function HealthProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.body.classList.add("profile-route");

    return () => {
      document.body.classList.remove("profile-route");
    };
  }, []);

  useEffect(() => {
    if (!getToken()) {
      navigate("/login", { state: { error: "Please log in to edit your health profile." } });
      return;
    }

    apiJson("/api/auth/me")
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(err => {
        if (err.status === 401) {
          clearToken();
          navigate("/login", {
            state: { error: err.message || "Your session has expired. Please log in again." }
          });
          return;
        }

        setError(err.message || "Failed to load your profile.");
        setLoading(false);
      });
  }, [navigate]);

  return (
    <div className="profile-page-shell">
      <div className="profile-page-topbar">
        <button className="profile-page-back" onClick={() => navigate("/")}>
          <FiArrowLeft /> Back to consultations
        </button>
        <div className="profile-page-meta">
          <span className="profile-page-eyebrow">Health profile</span>
          <h1>Your Health Profile</h1>
          <p>Review the health context the assistant can use while answering your questions.</p>
        </div>
      </div>

      {loading ? (
        <div className="profile-page-loading">Loading your profile...</div>
      ) : error ? (
        <div className="error-banner profile-page-error">{error}</div>
      ) : (
        <HealthProfile
          user={user || {}}
          onSaved={setUser}
          standalone
        />
      )}
    </div>
  );
}
