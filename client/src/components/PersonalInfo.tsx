import { useState, useEffect, useMemo, useRef } from 'react';
import axios from '../lib/axios';
import { toast } from "sonner";
import { PrimaryButton } from '../pages/ExpertDashboard';
import { useAuth } from '../context/AuthContext';
import { Country, State, City } from 'country-state-city';
import { AlertCircle, Lock, ChevronDown, Check } from 'lucide-react';

const FormInput = ({ label, value, onChange, placeholder, type = "text", error, maxLength, disabled }: any) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={disabled}
            className={`border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-200 ${error ? "border-red-500 focus:border-red-500 bg-red-50" : "border-gray-300 focus:border-blue-500"
                }`}
        />
        {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
);

function CustomSelect({
  value,
  options,
  onChange,
  placeholder,
  error,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  const handleToggle = () => {
    if (!open) {
      if (dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 340) {
          setOpenUp(true);
        } else {
          setOpenUp(false);
        }
      }
    }
    setOpen((v) => !v);
  };

  const selected = options.find((o) => o.value === value);
  const showSearch = options.length > 5;

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    return options.filter((o) =>
      o.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center justify-between gap-2 bg-white border rounded-xl px-3 py-2.5 text-left shadow-sm transition-all cursor-pointer ${
          error
            ? "border-red-500 focus:border-red-500 bg-red-50"
            : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"
        }`}
      >
        <span className={`text-sm font-semibold truncate ${selected ? "text-slate-800" : "text-slate-400"}`}>
          {selected ? selected.label : placeholder || "Select option"}
        </span>
        <ChevronDown size={16} className={`text-slate-500 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className={`absolute z-30 w-full rounded-xl border border-slate-200 bg-white shadow-xl left-0 flex flex-col overflow-hidden ${
          openUp ? "bottom-full mb-2" : "top-full mt-2"
        }`}>
          {showSearch && (
            <div className="p-2 border-b border-slate-100 bg-slate-50/50 sticky top-0 bg-white z-10 shrink-0">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 bg-white"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <div className="max-h-48 overflow-y-auto p-1.5 w-full">
            {filteredOptions.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-3 font-semibold">
                No results found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isActive = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-sm font-semibold transition-colors cursor-pointer ${
                      isActive ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {isActive && <Check size={12} className="shrink-0 text-blue-600" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const FormSelect = ({ label, value, onChange, options, disabled, error, placeholder }: any) => {
    const displayLabel = options.find((opt: any) => opt.value === value)?.label || value || "";

    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{label}</label>
            {disabled ? (
                <input
                    type="text"
                    value={displayLabel}
                    disabled
                    placeholder={placeholder}
                    className="border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed outline-none transition-all"
                />
            ) : (
                <CustomSelect
                    value={value}
                    onChange={onChange}
                    options={options}
                    placeholder={placeholder}
                    error={error}
                />
            )}
            {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
    );
};

interface PersonalInfoProps {
    onUpdate?: () => void;
    profileData?: any;
    isMissing?: boolean;
}

const PersonalInfo = ({ onUpdate, profileData, isMissing }: PersonalInfoProps) => {
    const { user } = useAuth();

    const [countryCode, setCountryCode] = useState("");
    const [stateCode, setStateCode] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    const initialProfile = {
        personal: {
            name: "",
            phone: "",
            gender: "",
            dob: "",
            country: "",
            state: "",
            city: "",
            category: ""
        }
    };
    const [profile, setProfile] = useState(initialProfile);
    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);

    const allCountries = useMemo(() => Country.getAllCountries().map(c => ({
        value: c.isoCode,
        label: c.name,
        name: c.name
    })), []);

    const allStates = useMemo(() => {
        if (!countryCode) return [];
        return State.getStatesOfCountry(countryCode).map(s => ({
            value: s.isoCode,
            label: s.name,
            name: s.name
        }));
    }, [countryCode]);

    const allCities = useMemo(() => {
        if (!countryCode || !stateCode) return [];
        return City.getCitiesOfState(countryCode, stateCode).map(c => ({
            value: c.name,
            label: c.name
        }));
    }, [countryCode, stateCode]);


    const setPersonalField = (field: string, value: string) => {
        setProfile((p) => ({ ...p, personal: { ...p.personal, [field]: value } }));

        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleCountryChange = (isoCode: string) => {
        const countryObj = allCountries.find(c => c.value === isoCode);
        setCountryCode(isoCode);
        setPersonalField("country", countryObj ? countryObj.name : "");
        setPersonalField("state", "");
        setPersonalField("city", "");
        setStateCode("");
    };

    const handleStateChange = (isoCode: string) => {
        const stateObj = allStates.find(s => s.value === isoCode);
        setStateCode(isoCode);
        setPersonalField("state", stateObj ? stateObj.name : "");
        setPersonalField("city", "");
    };

    useEffect(() => {
        if (profile.personal.country && !countryCode) {
            const c = allCountries.find(x => x.name === profile.personal.country);
            if (c) setCountryCode(c.value);
        }
    }, [profile.personal.country, allCountries, countryCode]);

    useEffect(() => {
        if (countryCode && profile.personal.state && !stateCode) {
            const s = State.getStatesOfCountry(countryCode).find(x => x.name === profile.personal.state);
            if (s) setStateCode(s.isoCode);
        }
    }, [countryCode, profile.personal.state, stateCode]);


    const validate = () => {
        const newErrors: Record<string, string> = {};
        const p = profile.personal;

        const mobileRegex = /^\d{10}$/;
        if (!p.phone) newErrors.phone = "Phone number is required";
        else if (!mobileRegex.test(p.phone)) newErrors.phone = "Enter a valid 10-digit mobile number";

        if (!p.dob) {
            newErrors.dob = "Date of Birth is required";
        } else {
            const birthDate = new Date(p.dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            if (age < 18) newErrors.dob = "You must be at least 18 years old";
        }

        if (!p.name.trim()) newErrors.name = "Full Name is required";
        if (!p.gender) newErrors.gender = "Gender is required";
        if (!p.country) newErrors.country = "Country is required";
        if (!p.state) newErrors.state = "State is required";
        if (!p.city) newErrors.city = "City is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const fetchData = async () => {
        try {
            const [personalRes, catRes] = await Promise.all([
                axios.get(`/api/expert/personalinfo`),
                axios.get(`/api/categories`)
            ]);
            const catList = Array.isArray(catRes.data) ? catRes.data : [];
            setCategories(catList.filter((c: any) => c.name).map((c: any) => ({ _id: c._id, name: c.name })));

            if (personalRes.data.success && personalRes.data.data) {
                const data = personalRes.data.data;
                setProfile({
                    personal: {
                        name: data.userName || user?.name || "",
                        phone: data.mobile || "",
                        gender: data.gender || "",
                        dob: data.dob ? data.dob.split("T")[0] : "",
                        country: data.country || "",
                        state: data.state || "",
                        city: data.city || "",
                        category: data.category || ""
                    }
                });
            } else if (user?.name) {
                setProfile(prev => ({ ...prev, personal: { ...prev.personal, name: user.name || "" } }));
            }
        } catch (err: any) {
            console.error("Failed to fetch data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchData();
    }, [user]);

    const savePersonal = async () => {
        if (!validate()) {
            toast.error("Please fix the validation errors");
            return;
        }

        try {
            const payload = {
                userName: profile.personal.name,
                mobile: profile.personal.phone,
                gender: profile.personal.gender,
                dob: profile.personal.dob,
                country: profile.personal.country,
                state: profile.personal.state,
                city: profile.personal.city,
                category: profile.personal.category
            };

            const response = await axios.put(
                `/api/expert/personalinfo`,
                payload,
                { headers: { "Content-Type": "application/json" } }
            );

            if (response.data.success) {
                toast.success("Personal info updated successfully!");
                setIsEditing(false);
                if (onUpdate) onUpdate();
            } else {
                toast.error("Failed to update personal info");
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || "Server error");
        }
    };

    if (loading) return (
        <div className="flex flex-col space-y-4 animate-pulse">
            <div className="h-48 bg-gray-100 rounded-xl"></div>
            <div className="h-48 bg-gray-100 rounded-xl"></div>
        </div>
    );

    return (
        <div className="h-full">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        Personal Information
                        {isMissing && <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Action Required</span>}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Update your basic details and location</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <FormInput
                        label="Full Name"
                        placeholder="e.g. Mugunth Kumar"
                        value={profile.personal?.name || ""}
                        onChange={(v: string) => setPersonalField("name", v)}
                        error={errors.name}
                        disabled={!isEditing}
                    />

                    <FormInput
                        label="Phone Number"
                        placeholder="10 digit mobile number"
                        value={profile.personal?.phone || ""}
                        onChange={(v: string) => {
                            if (v === "" || /^[0-9\b]+$/.test(v)) {
                                setPersonalField("phone", v);
                            }
                        }}
                        maxLength={10}
                        error={errors.phone}
                        disabled={!isEditing}
                    />

                    <FormSelect
                        label="Gender"
                        value={profile.personal?.gender || ""}
                        onChange={(v: string) => setPersonalField("gender", v)}
                        options={["Male", "Female", "Other"].map(g => ({ value: g, label: g }))}
                        placeholder="Select Gender"
                        error={errors.gender}
                        disabled={!isEditing}
                    />

                    <FormInput
                        label="Date of Birth"
                        type="date"
                        value={profile.personal?.dob || ""}
                        onChange={(v: string) => setPersonalField("dob", v)}
                        error={errors.dob}
                        disabled={!isEditing}
                    />
                </div>

                <div className="space-y-4">
                    <FormSelect
                        label="Country"
                        value={countryCode}
                        onChange={(v: string) => handleCountryChange(v)}
                        options={allCountries}
                        placeholder="Select Country"
                        error={errors.country}
                        disabled={!isEditing}
                    />

                    <FormSelect
                        label="State"
                        value={stateCode}
                        onChange={(v: string) => handleStateChange(v)}
                        options={allStates}
                        disabled={!countryCode || !isEditing}
                        placeholder="Select State"
                        error={errors.state}
                    />

                    <FormSelect
                        label="City"
                        value={profile.personal.city}
                        onChange={(v: string) => setPersonalField("city", v)}
                        options={allCities}
                        disabled={!stateCode || !isEditing}
                        placeholder="Select City"
                        error={errors.city}
                    />
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                {isEditing ? (
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                fetchData();
                                setErrors({});
                                setIsEditing(false);
                            }}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <PrimaryButton onClick={savePersonal} className="px-8">
                            Save Personal Information
                        </PrimaryButton>
                    </div>
                ) : (
                    <PrimaryButton onClick={() => setIsEditing(true)} className="px-8">
                        Edit Personal Information
                    </PrimaryButton>
                )}
            </div>
        </div>
    );
};

export default PersonalInfo;
