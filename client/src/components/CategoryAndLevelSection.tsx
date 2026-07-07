import { useState, useEffect } from "react";
import axios from "../lib/axios";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { PrimaryButton } from "../pages/ExpertDashboard";
import { Award, CheckSquare, Square } from "lucide-react";

interface CategoryAndLevelSectionProps {
  onUpdate?: () => void;
  profileData?: any;
}

const AVAILABLE_LEVELS = [
  "Rising Mentor",
  "Professional Mentor",
  "Senior Mentor",
  "Elite Mentor",
  "FAANG Mentor"
];

export default function CategoryAndLevelSection({ onUpdate }: CategoryAndLevelSectionProps) {
  const { user } = useAuth();
  
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLevels, setSelectedLevels] = useState<string[]>(["Rising Mentor"]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [personalRes, profRes, catRes] = await Promise.all([
        axios.get("/api/expert/personalinfo"),
        axios.get("/api/expert/profession"),
        axios.get("/api/categories")
      ]);

      const catList = Array.isArray(catRes.data) ? catRes.data : [];
      setCategories(catList.filter((c: any) => c.name).map((c: any) => ({ _id: c._id, name: c.name })));

      if (personalRes.data.success && personalRes.data.data) {
        setSelectedCategory(personalRes.data.data.category || "");
      }
      if (profRes.data.success && profRes.data.data) {
        const data = profRes.data.data;
        const initialLevels = data.levels && data.levels.length > 0
          ? data.levels
          : [data.level || "Rising Mentor"];
        setSelectedLevels(initialLevels);
      }
    } catch (err) {
      console.error("Failed to load Category & Level data:", err);
      toast.error("Failed to load details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  const handleToggleLevel = (level: string) => {
    setSelectedLevels(prev => {
      if (prev.includes(level)) {
        // Keep at least one level selected
        if (prev.length <= 1) {
          toast.warning("Please keep at least one level selected");
          return prev;
        }
        return prev.filter(l => l !== level);
      } else {
        return [...prev, level];
      }
    });
  };

  const handleSave = async () => {
    if (!selectedCategory) {
      toast.error("Please choose a category");
      return;
    }
    if (selectedLevels.length === 0) {
      toast.error("Please select at least one mentor level");
      return;
    }

    try {
      setSaving(true);

      // 1. Fetch current personal info to merge and update category
      const personalRes = await axios.get("/api/expert/personalinfo");
      const existingPersonal = personalRes.data.success ? personalRes.data.data : {};
      const updatedPersonal = {
        userName: existingPersonal.userName,
        mobile: existingPersonal.mobile,
        gender: existingPersonal.gender,
        dob: existingPersonal.dob,
        country: existingPersonal.country,
        state: existingPersonal.state,
        city: existingPersonal.city,
        category: selectedCategory
      };

      // 2. Fetch current professional details to merge and update levels
      const profRes = await axios.get("/api/expert/profession");
      const existingProf = profRes.data.success ? profRes.data.data : {};
      const updatedProf = {
        ...existingProf,
        levels: selectedLevels,
        level: selectedLevels[0] // Set first selected as the primary level fallback
      };

      // Save both
      await Promise.all([
        axios.put("/api/expert/personalinfo", updatedPersonal),
        axios.put("/api/expert/profession", { professionalDetails: updatedProf })
      ]);

      toast.success("Category & Level settings saved!");
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      console.error("Failed to save category and level:", err);
      toast.error(err.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-500 font-medium">Loading details...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 py-2">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-4">
        <div className="p-2 bg-blue-50 rounded-lg text-blue-600 shrink-0">
          <Award className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Category & Level</h3>
          <p className="text-xs text-gray-500">Configure your expertise category and choose your mentor levels.</p>
        </div>
      </div>

      <div className="space-y-6">
        {!isEditing ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-500">Expertise Category</label>
              <p className="text-base font-bold text-gray-900">{selectedCategory || "Not specified"}</p>
            </div>

            <div className="flex flex-col gap-2.5">
              <label className="text-sm font-semibold text-gray-500">Expert Levels</label>
              <div className="flex flex-wrap gap-2">
                {selectedLevels.map((level) => (
                  <span key={level} className="bg-blue-50 text-blue-700 border border-blue-100/60 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm">
                    {level}
                  </span>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Expertise Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 font-medium"
              >
                <option value="">Choose Expertise Category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">Choose the main field you want to conduct sessions for.</p>
            </div>

            <div className="flex flex-col gap-2.5">
              <label className="text-sm font-semibold text-gray-700">Expert Levels (Choose Multi-option)</label>
              <p className="text-xs text-gray-500 mb-2">Select all levels you wish to support. Candidates can choose their preferred tier when booking you.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AVAILABLE_LEVELS.map((level) => {
                  const isChecked = selectedLevels.includes(level);
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handleToggleLevel(level)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                        isChecked
                          ? "border-blue-600 bg-blue-50/40 text-blue-900 shadow-sm font-semibold cursor-pointer"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 cursor-pointer"
                      }`}
                    >
                      <div className="shrink-0 text-blue-600">
                        {isChecked ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <span className="text-sm">{level}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <div className="pt-6 border-t border-gray-100 mt-6 flex justify-end">
          {isEditing ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  fetchInitialData();
                  setIsEditing(false);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <PrimaryButton
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all"
              >
                {saving ? "Saving Changes..." : "Save Settings"}
              </PrimaryButton>
            </div>
          ) : (
            <PrimaryButton
              onClick={() => setIsEditing(true)}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all"
            >
              Edit Category & Level
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}
