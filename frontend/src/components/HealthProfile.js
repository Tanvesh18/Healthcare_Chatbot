import { useState } from "react";
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

  const save = async () => {
    await fetch("http://localhost:5000/api/auth/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("token")
      },
      body: JSON.stringify({
        ...form,
        conditions: form.conditions.split(",").map(c => c.trim()),
        allergies: form.allergies.split(",").map(a => a.trim())
      })
    });
    onClose();
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <h2>Health Profile</h2>

        <input placeholder="Age" value={form.age} onChange={e=>setForm({...form,age:e.target.value})}/>
        <input placeholder="Height (cm)" value={form.height} onChange={e=>setForm({...form,height:e.target.value})}/>
        <input placeholder="Weight (kg)" value={form.weight} onChange={e=>setForm({...form,weight:e.target.value})}/>

        <input placeholder="Gender" value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}/>
        <input placeholder="Blood Group" value={form.bloodGroup} onChange={e=>setForm({...form,bloodGroup:e.target.value})}/>
        <input placeholder="Known Conditions (comma separated)" value={form.conditions} onChange={e=>setForm({...form,conditions:e.target.value})}/>
        <input placeholder="Allergies (comma separated)" value={form.allergies} onChange={e=>setForm({...form,allergies:e.target.value})}/>
        <input placeholder="Smoking (yes / no / occasionally)" value={form.smoking} onChange={e=>setForm({...form,smoking:e.target.value})}/>
        <input placeholder="Alcohol (yes / no / occasionally)" value={form.alcohol} onChange={e=>setForm({...form,alcohol:e.target.value})}/>
        <input placeholder="Activity Level (low / moderate / high)" value={form.activityLevel} onChange={e=>setForm({...form,activityLevel:e.target.value})}/>

        <button onClick={save}>Save Profile</button>
        <button className="auth-btn logout" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
