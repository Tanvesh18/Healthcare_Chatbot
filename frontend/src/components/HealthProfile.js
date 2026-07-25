import { useState } from "react";
import { FiX, FiCheck, FiUser, FiHeart, FiActivity } from "react-icons/fi";
import "../auth/Auth.css";

export default function HealthProfile({ user, onClose }) {
  const [form, setForm] = useState({
    age: user.age || "",
    height: user.height || "",
    weight: user.weight || "",
    gender: user.gender || "",
    bloodGroup: user.bloodGroup || "",
    conditions: (user.conditions || []).join(", "),
    allergies: (user.allergies || []).join(", "),
    smoking: user.smoking || "",
    alcohol: user.alcohol || "",
    activityLevel: user.activityLevel || ""
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const save = async () => {
    try {
      await fetch("http://localhost:5000/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("token")
        },
        body: JSON.stringify({
          ...form,
          conditions: form.conditions ? form.conditions.split(",").map(c => c.trim()) : [],
          allergies: form.allergies ? form.allergies.split(",").map(a => a.trim()) : []
        })
      });
      setSavedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error("Failed to save profile", err);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="profile-modal-card">
        <div className="profile-modal-header">
          <div className="profile-header-title">
            <FiActivity className="profile-icon" />
            <div>
              <h3>Health Profile</h3>
              <p>Personalize your AI medical consultations</p>
            </div>
          </div>
          <button className="profile-close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        {savedSuccess && (
          <div className="profile-success-banner">
            <FiCheck /> Profile updated successfully!
          </div>
        )}

        <div className="profile-form-grid">
          {/* Section 1: Physical Parameters */}
          <div className="form-section">
            <span className="section-title"><FiUser /> Physical Stats</span>
            <div className="input-row">
              <div className="input-group">
                <label>Age (years)</label>
                <input placeholder="e.g. 25" value={form.age} onChange={e=>setForm({...form,age:e.target.value})}/>
              </div>
              <div className="input-group">
                <label>Height (cm)</label>
                <input placeholder="e.g. 175" value={form.height} onChange={e=>setForm({...form,height:e.target.value})}/>
              </div>
              <div className="input-group">
                <label>Weight (kg)</label>
                <input placeholder="e.g. 70" value={form.weight} onChange={e=>setForm({...form,weight:e.target.value})}/>
              </div>
            </div>

            <div className="input-row-2">
              <div className="input-group">
                <label>Gender</label>
                <input placeholder="Male / Female / Other" value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}/>
              </div>
              <div className="input-group">
                <label>Blood Group</label>
                <input placeholder="e.g. O+, A+, B-" value={form.bloodGroup} onChange={e=>setForm({...form,bloodGroup:e.target.value})}/>
              </div>
            </div>
          </div>

          {/* Section 2: Medical Conditions */}
          <div className="form-section">
            <span className="section-title"><FiHeart /> Medical Conditions & Allergies</span>
            <div className="input-group">
              <label>Known Conditions (comma separated)</label>
              <input placeholder="e.g. Asthma, Diabetes" value={form.conditions} onChange={e=>setForm({...form,conditions:e.target.value})}/>
            </div>
            <div className="input-group">
              <label>Allergies (comma separated)</label>
              <input placeholder="e.g. Penicillin, Peanuts" value={form.allergies} onChange={e=>setForm({...form,allergies:e.target.value})}/>
            </div>
          </div>

          {/* Section 3: Lifestyle */}
          <div className="form-section">
            <span className="section-title">🌿 Lifestyle Factors</span>
            <div className="input-row-3">
              <div className="input-group">
                <label>Smoking</label>
                <input placeholder="No / Yes / Occasionally" value={form.smoking} onChange={e=>setForm({...form,smoking:e.target.value})}/>
              </div>
              <div className="input-group">
                <label>Alcohol</label>
                <input placeholder="No / Yes / Occasionally" value={form.alcohol} onChange={e=>setForm({...form,alcohol:e.target.value})}/>
              </div>
              <div className="input-group">
                <label>Activity Level</label>
                <input placeholder="Low / Moderate / High" value={form.activityLevel} onChange={e=>setForm({...form,activityLevel:e.target.value})}/>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={save}>Save Health Profile</button>
        </div>
      </div>
    </div>
  );
}
