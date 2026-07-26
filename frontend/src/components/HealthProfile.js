import { useState } from "react";
import { FiX, FiCheck, FiUser, FiHeart, FiActivity, FiDroplet, FiShield, FiWind } from "react-icons/fi";
import { apiJson } from "../api";
import "../auth/Auth.css";

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function splitTags(value) {
  return value.split(",").map(item => item.trim()).filter(Boolean);
}

export default function HealthProfile({ user, onClose, onSaved, standalone = false }) {
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
  const [error, setError] = useState("");

  const conditionTags = splitTags(form.conditions);
  const allergyTags = splitTags(form.allergies);
  const completedFields = [
    form.age,
    form.height,
    form.weight,
    form.gender,
    form.bloodGroup,
    form.conditions,
    form.allergies,
    form.smoking,
    form.alcohol,
    form.activityLevel
  ].filter(Boolean).length;
  const completionPercent = Math.round((completedFields / 10) * 100);

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function save() {
    try {
      setError("");

      const updatedUser = await apiJson("/api/auth/profile", {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          conditions: conditionTags,
          allergies: allergyTags
        })
      });

      onSaved?.(updatedUser);
      setSavedSuccess(true);
      if (!standalone) {
        setTimeout(() => onClose?.(), 1000);
      }
    } catch (err) {
      setError(err.message || "Failed to save profile");
    }
  }

  return (
    <div className={standalone ? "profile-page-card" : "auth-overlay"}>
      <div className={`profile-card ${standalone ? "profile-card-standalone" : ""}`}>
        <div className="profile-card-header">
          <div className="profile-header-title">
            <FiActivity className="profile-icon" />
            <div>
              <h2>{standalone ? "Profile details" : "Health Profile"}</h2>
              <p>Keep your health context accurate for better consultations.</p>
            </div>
          </div>
          {!standalone && (
            <button className="profile-close-btn" onClick={onClose}>
              <FiX />
            </button>
          )}
        </div>

        <div className="profile-overview">
          <div className="profile-completion">
            <div className="profile-completion-ring" style={{ "--profile-completion": `${completionPercent}%` }}>
              <span>{completionPercent}%</span>
            </div>
            <div>
              <span className="profile-summary-label">Profile completion</span>
              <strong>{completedFields} of 10 fields completed</strong>
            </div>
          </div>

          <div className="profile-summary-grid">
            <div className="profile-summary-card">
              <span className="profile-summary-label">Vitals</span>
              <strong>{form.age || "--"}y / {form.height || "--"}cm / {form.weight || "--"}kg</strong>
            </div>
            <div className="profile-summary-card">
              <span className="profile-summary-label">Identity</span>
              <strong>{form.gender || "Not set"} / {form.bloodGroup || "Blood group not set"}</strong>
            </div>
            <div className="profile-summary-card">
              <span className="profile-summary-label">Lifestyle</span>
              <strong>{form.activityLevel || "Activity not set"} / Smoking {form.smoking || "--"}</strong>
            </div>
          </div>
        </div>

        {savedSuccess && (
          <div className="profile-success-banner">
            <FiCheck /> Profile updated successfully.
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

        <div className="profile-form-grid">
          <section className="form-section form-section-wide">
            <div className="section-heading">
              <span className="section-title"><FiUser /> Physical Stats</span>
              <p>Basic measurements used as consultation context.</p>
            </div>
            <div className="input-row">
              <div className="input-group">
                <label>Age (years)</label>
                <input type="number" min="0" placeholder="e.g. 25" value={form.age} onChange={event => updateField("age", event.target.value)} />
              </div>
              <div className="input-group">
                <label>Height (cm)</label>
                <input type="number" min="0" placeholder="e.g. 175" value={form.height} onChange={event => updateField("height", event.target.value)} />
              </div>
              <div className="input-group">
                <label>Weight (kg)</label>
                <input type="number" min="0" placeholder="e.g. 70" value={form.weight} onChange={event => updateField("weight", event.target.value)} />
              </div>
            </div>

            <div className="input-row-2">
              <div className="input-group">
                <label>Gender</label>
                <select value={form.gender} onChange={event => updateField("gender", event.target.value)}>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              <div className="input-group">
                <label><FiDroplet /> Blood Group</label>
                <select value={form.bloodGroup} onChange={event => updateField("bloodGroup", event.target.value)}>
                  <option value="">Select blood group</option>
                  {bloodGroups.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="form-section">
            <div className="section-heading">
              <span className="section-title"><FiHeart /> Medical Background</span>
              <p>Add comma-separated entries. They become quick tags below.</p>
            </div>
            <div className="input-group">
              <label>Known Conditions</label>
              <input placeholder="e.g. Asthma, Diabetes" value={form.conditions} onChange={event => updateField("conditions", event.target.value)} />
            </div>
            {conditionTags.length > 0 && (
              <div className="profile-chip-row">
                {conditionTags.map(item => <span key={item} className="profile-chip">{item}</span>)}
              </div>
            )}
          </section>

          <section className="form-section">
            <div className="section-heading">
              <span className="section-title"><FiShield /> Allergies</span>
              <p>Include medicine, food, and environmental allergies.</p>
            </div>
            <div className="input-group">
              <label>Allergies</label>
              <input placeholder="e.g. Penicillin, Peanuts" value={form.allergies} onChange={event => updateField("allergies", event.target.value)} />
            </div>
            {allergyTags.length > 0 && (
              <div className="profile-chip-row">
                {allergyTags.map(item => <span key={item} className="profile-chip profile-chip-warn">{item}</span>)}
              </div>
            )}
          </section>

          <section className="form-section form-section-wide">
            <div className="section-heading">
              <span className="section-title"><FiWind /> Lifestyle Factors</span>
              <p>Simple lifestyle signals help make guidance more relevant.</p>
            </div>
            <div className="input-row-3">
              <div className="input-group">
                <label>Smoking</label>
                <select value={form.smoking} onChange={event => updateField("smoking", event.target.value)}>
                  <option value="">Select smoking habit</option>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                  <option value="Occasionally">Occasionally</option>
                </select>
              </div>
              <div className="input-group">
                <label>Alcohol</label>
                <select value={form.alcohol} onChange={event => updateField("alcohol", event.target.value)}>
                  <option value="">Select alcohol use</option>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                  <option value="Occasionally">Occasionally</option>
                </select>
              </div>
              <div className="input-group">
                <label>Activity Level</label>
                <select value={form.activityLevel} onChange={event => updateField("activityLevel", event.target.value)}>
                  <option value="">Select activity level</option>
                  <option value="Low">Low</option>
                  <option value="Moderate">Moderate</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        <div className="form-section form-section-emphasis">
          <span className="section-title"><FiShield /> Safety note</span>
          <p className="profile-helper-copy">
            This information helps tailor guidance and follow-up questions. It does not replace a clinician, diagnosis, or emergency care.
          </p>
        </div>

        <div className="profile-actions">
          {!standalone && <button className="btn-cancel" onClick={onClose}>Cancel</button>}
          <button className="btn-save" onClick={save}>Save Health Profile</button>
        </div>
      </div>
    </div>
  );
}
