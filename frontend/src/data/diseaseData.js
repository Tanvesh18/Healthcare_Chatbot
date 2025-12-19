const diseaseData = {
    dengue: {
      name: "Dengue Fever",
      symptoms: ["fever", "rash", "joint pain", "headache", "nausea", "body pain"],
      prevention: [
        "Avoid stagnant water",
        "Use mosquito nets and repellents",
        "Wear long sleeves",
        "Cover water storage"
      ],
      whenToSeeDoctor: "High fever > 2 days, abdominal pain, vomiting, bleeding"
    },
  
    flu: {
      name: "Influenza (Flu)",
      symptoms: ["fever", "cough", "sore throat", "body ache", "headache"],
      prevention: [
        "Vaccination",
        "Hand washing",
        "Avoid sick people"
      ],
      whenToSeeDoctor: "Shortness of breath, chest pain, high fever"
    },
  
    malaria: {
      name: "Malaria",
      symptoms: ["fever", "chills", "sweating", "headache", "nausea"],
      prevention: ["Mosquito nets", "Cover skin", "Avoid stagnant water"],
      whenToSeeDoctor: "High fever after travel to infected areas"
    }
  };
  
  export default diseaseData;
  