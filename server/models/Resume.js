import mongoose from "mongoose";

const resumeSectionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  visible: { type: Boolean, default: true }
});

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  title: {
    type: String,
    default: "My Resume",
    trim: true
  },
  template: {
    type: String,
    enum: ["Modern", "Corporate", "Minimal", "Creative", "Developer", "Fresher", "Executive"],
    default: "Modern"
  },
  settings: {
    primaryColor: { type: String, default: "#2563eb" }, // Default Tailwind Blue-600
    fontFamily: { type: String, default: "Inter" },
    fontSize: { type: String, default: "14px" },
    spacing: { type: String, default: "normal" } // tight, normal, loose
  },
  personalInfo: {
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    bio: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    github: { type: String, default: "" },
    portfolio: { type: String, default: "" }
  },
  education: [{
    degree: { type: String, default: "" },
    institution: { type: String, default: "" },
    field: { type: String, default: "" },
    startYear: { type: Number },
    endYear: { type: Number },
    current: { type: Boolean, default: false }
  }],
  experience: [{
    company: { type: String, default: "" },
    position: { type: String, default: "" },
    startDate: { type: Date },
    endDate: { type: Date },
    current: { type: Boolean, default: false },
    description: { type: String, default: "" }
  }],
  projects: [{
    title: { type: String, default: "" },
    role: { type: String, default: "" },
    link: { type: String, default: "" },
    description: { type: String, default: "" }
  }],
  certifications: [{
    name: { type: String, default: "" },
    issuer: { type: String, default: "" },
    issueDate: { type: Date },
    expiryDate: { type: Date },
    credentialUrl: { type: String, default: "" }
  }],
  skills: {
    technical: { type: [String], default: [] },
    soft: { type: [String], default: [] },
    languages: { type: [String], default: [] }
  },
  achievements: { type: [String], default: [] },
  sectionOrder: {
    type: [resumeSectionSchema],
    default: [
      { id: "personalInfo", title: "Contact Info", visible: true },
      { id: "summary", title: "Summary", visible: true },
      { id: "experience", title: "Work History", visible: true },
      { id: "education", title: "Education", visible: true },
      { id: "projects", title: "Projects", visible: true },
      { id: "skills", title: "Skills", visible: true },
      { id: "certifications", title: "Certifications", visible: true },
      { id: "achievements", title: "Achievements", visible: true }
    ]
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export default mongoose.model("Resume", resumeSchema);
