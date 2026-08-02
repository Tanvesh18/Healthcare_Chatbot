import { useState } from "react";
import {
  FiX,
  FiCheck,
  FiUser,
  FiHeart,
  FiActivity,
  FiDroplet,
  FiShield,
  FiWind,
  FiPlus,
  FiTrash2,
  FiPackage,
  FiAlertTriangle
} from "react-icons/fi";
import { apiFetch, apiJson } from "../api";
import "../auth/Auth.css";

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function splitTags(value) {
  return value.split(",").map(item => item.trim()).filter(Boolean);
}

function getProfileForm(user = {}) {
  return {
    age: user.age || "",
    height: user.height || "",
    weight: user.weight || "",
    gender: user.gender || "",
    bloodGroup: user.bloodGroup || "",
    conditions: (user.conditions || []).join(", "),
    allergies: (user.allergies || []).join(", "),
    medications: (user.medications || []).map(medication => ({
      name: medication.name || "",
      dosage: medication.dosage || "",
      frequency: medication.frequency || "",
      notes: medication.notes || ""
    })),
    adverseReactions: (user.adverseReactions || []).map(reaction => ({
      substance: reaction.substance || "",
      reaction: reaction.reaction || ""
    })),
    smoking: user.smoking || "",
    alcohol: user.alcohol || "",
    activityLevel: user.activityLevel || ""
  };
}

function getPrivacyConsentValues(user = {}) {
  return {
    aiProfilePersonalization:
      user.privacyConsents?.aiProfilePersonalization?.enabled === true,
    locationCareSearch:
      user.privacyConsents?.locationCareSearch?.enabled === true
  };
}

export default function HealthProfile({ user, onClose, onSaved, standalone = false }) {
  const [form, setForm] = useState(() => getProfileForm(user));
  const [privacyConsents, setPrivacyConsents] = useState(() => getPrivacyConsentValues(user));
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState("");
  const [privacyStatus, setPrivacyStatus] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeletingData, setIsDeletingData] = useState(false);

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
    form.medications.length > 0,
    form.adverseReactions.length > 0,
    form.smoking,
    form.alcohol,
    form.activityLevel
  ].filter(Boolean).length;
  const completionPercent = Math.round((completedFields / 12) * 100);

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function updatePrivacyConsent(field, enabled) {
    setPrivacyConsents(prev => ({ ...prev, [field]: enabled }));
  }

  function addMedication() {
    setForm(prev => ({
      ...prev,
      medications: [
        ...prev.medications,
        { name: "", dosage: "", frequency: "", notes: "" }
      ]
    }));
  }

  function updateMedication(index, field, value) {
    setForm(prev => ({
      ...prev,
      medications: prev.medications.map((medication, medicationIndex) =>
        medicationIndex === index ? { ...medication, [field]: value } : medication
      )
    }));
  }

  function removeMedication(index) {
    setForm(prev => ({
      ...prev,
      medications: prev.medications.filter((_, medicationIndex) => medicationIndex !== index)
    }));
  }

  function addAdverseReaction() {
    setForm(prev => ({
      ...prev,
      adverseReactions: [
        ...prev.adverseReactions,
        { substance: "", reaction: "" }
      ]
    }));
  }

  function updateAdverseReaction(index, field, value) {
    setForm(prev => ({
      ...prev,
      adverseReactions: prev.adverseReactions.map((reaction, reactionIndex) =>
        reactionIndex === index ? { ...reaction, [field]: value } : reaction
      )
    }));
  }

  function removeAdverseReaction(index) {
    setForm(prev => ({
      ...prev,
      adverseReactions: prev.adverseReactions.filter((_, reactionIndex) => reactionIndex !== index)
    }));
  }

  async function save() {
    try {
      setError("");

      if (form.medications.some(medication => !medication.name.trim())) {
        throw new Error("Each medication entry requires a medicine name.");
      }

      if (form.adverseReactions.some(reaction => !reaction.substance.trim())) {
        throw new Error("Each adverse reaction requires a medicine or substance.");
      }

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

  async function savePrivacySettings() {
    try {
      setError("");
      setPrivacyStatus("");
      const updatedUser = await apiJson("/api/auth/privacy-consents", {
        method: "PATCH",
        body: JSON.stringify(privacyConsents)
      });
      setPrivacyConsents(getPrivacyConsentValues(updatedUser));
      onSaved?.(updatedUser);
      setPrivacyStatus("Privacy settings saved.");
    } catch (err) {
      setError(err.message || "Failed to save privacy settings.");
    }
  }

  async function exportData() {
    try {
      setError("");
      const response = await apiFetch("/api/auth/data-export");
      if (!response.ok) {
        throw new Error("Failed to export your data.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "curalink-data-export.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setPrivacyStatus("Your data export has been downloaded.");
    } catch (err) {
      setError(err.message || "Failed to export your data.");
    }
  }

  async function deleteData() {
    if (deleteConfirmation !== "DELETE") {
      setError("Type DELETE to confirm data deletion.");
      return;
    }

    try {
      setError("");
      setIsDeletingData(true);
      const result = await apiJson("/api/auth/data", {
        method: "DELETE",
        body: JSON.stringify({ confirm: "DELETE" })
      });
      const clearedUser = result.user || {};
      setForm(getProfileForm(clearedUser));
      setPrivacyConsents(getPrivacyConsentValues(clearedUser));
      setDeleteConfirmation("");
      onSaved?.(clearedUser);
      setPrivacyStatus("Your health profile and chat history have been deleted. Your account remains available.");
    } catch (err) {
      setError(err.message || "Failed to delete your data.");
    } finally {
      setIsDeletingData(false);
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
              <strong>{completedFields} of 12 fields completed</strong>
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
            <div className="section-heading profile-section-heading-actions">
              <div>
                <span className="section-title"><FiPackage /> Current Medicines</span>
                <p>Include prescriptions, over-the-counter medicines, vitamins, and supplements.</p>
              </div>
              <button
                type="button"
                className="profile-add-entry"
                onClick={addMedication}
                disabled={form.medications.length >= 20}
              >
                <FiPlus /> Add medicine
              </button>
            </div>

            {form.medications.length === 0 ? (
              <p className="profile-entry-empty">No current medicines recorded.</p>
            ) : (
              <div className="profile-entry-list">
                {form.medications.map((medication, index) => (
                  <div className="medication-entry" key={`medication-${index}`}>
                    <div className="input-group">
                      <label htmlFor={`medication-name-${index}`}>Medicine name</label>
                      <input
                        id={`medication-name-${index}`}
                        placeholder="e.g. Metformin"
                        value={medication.name}
                        maxLength={120}
                        onChange={event => updateMedication(index, "name", event.target.value)}
                        required
                      />
                    </div>
                    <div className="input-group">
                      <label htmlFor={`medication-dosage-${index}`}>Dosage</label>
                      <input
                        id={`medication-dosage-${index}`}
                        placeholder="e.g. 500 mg"
                        value={medication.dosage}
                        maxLength={160}
                        onChange={event => updateMedication(index, "dosage", event.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <label htmlFor={`medication-frequency-${index}`}>Frequency</label>
                      <input
                        id={`medication-frequency-${index}`}
                        placeholder="e.g. twice daily"
                        value={medication.frequency}
                        maxLength={160}
                        onChange={event => updateMedication(index, "frequency", event.target.value)}
                      />
                    </div>
                    <div className="input-group medication-notes">
                      <label htmlFor={`medication-notes-${index}`}>Notes</label>
                      <input
                        id={`medication-notes-${index}`}
                        placeholder="e.g. take with food"
                        value={medication.notes}
                        maxLength={300}
                        onChange={event => updateMedication(index, "notes", event.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="profile-remove-entry"
                      onClick={() => removeMedication(index)}
                      aria-label={`Remove ${medication.name || `medicine ${index + 1}`}`}
                      title="Remove medicine"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="form-section form-section-wide">
            <div className="section-heading profile-section-heading-actions">
              <div>
                <span className="section-title"><FiAlertTriangle /> Previous Adverse Reactions</span>
                <p>Record medicines or substances that previously caused an unwanted reaction.</p>
              </div>
              <button
                type="button"
                className="profile-add-entry"
                onClick={addAdverseReaction}
                disabled={form.adverseReactions.length >= 20}
              >
                <FiPlus /> Add reaction
              </button>
            </div>

            {form.adverseReactions.length === 0 ? (
              <p className="profile-entry-empty">No previous adverse reactions recorded.</p>
            ) : (
              <div className="profile-entry-list">
                {form.adverseReactions.map((item, index) => (
                  <div className="reaction-entry" key={`reaction-${index}`}>
                    <div className="input-group">
                      <label htmlFor={`reaction-substance-${index}`}>Medicine or substance</label>
                      <input
                        id={`reaction-substance-${index}`}
                        placeholder="e.g. Ibuprofen"
                        value={item.substance}
                        maxLength={120}
                        onChange={event => updateAdverseReaction(index, "substance", event.target.value)}
                        required
                      />
                    </div>
                    <div className="input-group">
                      <label htmlFor={`reaction-description-${index}`}>What happened?</label>
                      <input
                        id={`reaction-description-${index}`}
                        placeholder="e.g. facial swelling"
                        value={item.reaction}
                        maxLength={300}
                        onChange={event => updateAdverseReaction(index, "reaction", event.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="profile-remove-entry"
                      onClick={() => removeAdverseReaction(index)}
                      aria-label={`Remove reaction to ${item.substance || `entry ${index + 1}`}`}
                      title="Remove reaction"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
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
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                  <option value="occasionally">Occasionally</option>
                </select>
              </div>
              <div className="input-group">
                <label>Alcohol</label>
                <select value={form.alcohol} onChange={event => updateField("alcohol", event.target.value)}>
                  <option value="">Select alcohol use</option>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                  <option value="occasionally">Occasionally</option>
                </select>
              </div>
              <div className="input-group">
                <label>Activity Level</label>
                <select value={form.activityLevel} onChange={event => updateField("activityLevel", event.target.value)}>
                  <option value="">Select activity level</option>
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </section>

          <section className="form-section form-section-wide privacy-settings">
            <div className="section-heading">
              <span className="section-title"><FiShield /> Privacy settings</span>
              <p>These choices control optional data sharing. They are off until you enable them.</p>
            </div>

            <fieldset className="privacy-consent-list">
              <legend>Optional sharing permissions</legend>
              <label className="privacy-consent-option">
                <input
                  type="checkbox"
                  checked={privacyConsents.aiProfilePersonalization}
                  onChange={event => updatePrivacyConsent("aiProfilePersonalization", event.target.checked)}
                />
                <span>
                  <strong>Use my saved health profile to personalize AI responses</strong>
                  <small>Relevant saved health details are sent to Groq only when this setting is enabled.</small>
                </span>
              </label>
              <label className="privacy-consent-option">
                <input
                  type="checkbox"
                  checked={privacyConsents.locationCareSearch}
                  onChange={event => updatePrivacyConsent("locationCareSearch", event.target.checked)}
                />
                <span>
                  <strong>Use my location to find nearby care</strong>
                  <small>Your coordinates are sent to OpenStreetMap Overpass, with Nominatim as a fallback, only for a nearby-care request.</small>
                </span>
              </label>
            </fieldset>

            <div className="privacy-actions">
              <button type="button" className="btn-cancel" onClick={savePrivacySettings}>Save privacy settings</button>
              <button type="button" className="btn-cancel" onClick={exportData}>Export my data</button>
            </div>
            {privacyStatus && <p className="privacy-status" role="status">{privacyStatus}</p>}

            <div className="privacy-delete-panel">
              <strong>Delete health data and chat history</strong>
              <p>This permanently deletes saved health profile information, privacy settings, and chat history. Your account remains available.</p>
              <label htmlFor="delete-data-confirmation">Type DELETE to confirm</label>
              <div className="privacy-delete-actions">
                <input
                  id="delete-data-confirmation"
                  value={deleteConfirmation}
                  onChange={event => setDeleteConfirmation(event.target.value)}
                  placeholder="DELETE"
                  aria-describedby="delete-data-help"
                />
                <button type="button" className="privacy-delete-button" onClick={deleteData} disabled={isDeletingData}>
                  {isDeletingData ? "Deleting..." : "Delete my data"}
                </button>
              </div>
              <small id="delete-data-help">This action cannot be undone.</small>
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
