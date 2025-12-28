import { useState } from "react";

export default function HealthProfile({ user, onClose }) {
  const [form, setForm] = useState({
    age: user.age || "",
    height: user.height || "",
    weight: user.weight || ""
  });

  const save = async () => {
    await fetch("http://localhost:5000/api/auth/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("token")
      },
      body: JSON.stringify(form)
    });
    onClose();
  };

  return (
    <div className="profile-modal">
      <h3>Health Profile</h3>
      <input placeholder="Age" value={form.age} onChange={e=>setForm({...form,age:e.target.value})}/>
      <input placeholder="Height (cm)" value={form.height} onChange={e=>setForm({...form,height:e.target.value})}/>
      <input placeholder="Weight (kg)" value={form.weight} onChange={e=>setForm({...form,weight:e.target.value})}/>
      <button onClick={save}>Save</button>
    </div>
  );
}
