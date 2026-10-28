import { useState, useEffect, useRef } from 'react';
import { Award, Save, Info } from 'lucide-react';
import axios from '../../lib/axios';
import { toast } from 'sonner';
import AdminPageSkeleton, { AdminPageError } from '../../components/AdminPageSkeleton';

interface CertificationRule {
    id?: string;
    categoryId: string;
    minInterviews: number;
    passingPercentage: number;
    validityMonths: number;
    weightage: {
        technical: number;
        communication: number;
        confidence: number;
    };
}

interface Category {
    id?: string;
    _id?: string;
    name: string;
}

export default function CertificationRules() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [rule, setRule] = useState<CertificationRule>({
        categoryId: '',
        minInterviews: 5,
        passingPercentage: 70,
        validityMonths: 12,
        weightage: {
            technical: 40,
            communication: 30,
            confidence: 30
        }
    });
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [categoriesError, setCategoriesError] = useState<string | null>(null);
    const [ruleLoading, setRuleLoading] = useState(false);
    const [ruleError, setRuleError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const ruleRequestId = useRef(0);

    const fetchCategories = async () => {
        setCategoriesLoading(true);
        setCategoriesError(null);
        try {
            const res = await axios.get('/api/categories');
            if (!Array.isArray(res.data)) {
                throw new Error('Invalid categories response');
            }
            setCategories(res.data);
        } catch (error) {
            console.error("Error fetching categories", error);
            setCategoriesError("Categories could not be loaded. Check your connection and try again.");
        } finally {
            setCategoriesLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const loadRule = async (categoryId: string) => {
        if (!categoryId) return;
        const requestId = ++ruleRequestId.current;
        setRuleLoading(true);
        setRuleError(null);
        try {
            const res = await axios.get(`/api/certification-rules/category/${categoryId}`);
            if (requestId !== ruleRequestId.current) return;
            if (!res.data) {
                throw new Error('Invalid certification rule response');
            }
            setRule({
                ...res.data,
                weightage: {
                    technical: 40,
                    communication: 30,
                    confidence: 30,
                    ...(res.data.weightage || {})
                }
            });
        } catch (error) {
            if (requestId !== ruleRequestId.current) return;
            const status = (error as { response?: { status?: number } }).response?.status;
            if (status === 404) {
                setRule({
                    categoryId,
                    minInterviews: 5,
                    passingPercentage: 70,
                    validityMonths: 12,
                    weightage: { technical: 40, communication: 30, confidence: 30 }
                });
            } else {
                console.error("Error fetching certification rule", error);
                setRuleError("Certification rules could not be loaded. Check your connection and try again.");
            }
        } finally {
            if (requestId === ruleRequestId.current) {
                setRuleLoading(false);
            }
        }
    };

    useEffect(() => {
        if (selectedCategory) {
            loadRule(selectedCategory);
        }
        return () => {
            ruleRequestId.current += 1;
        };
    }, [selectedCategory]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCategory) return;

        try {
            setSaving(true);
            const payload = { ...rule, categoryId: selectedCategory };
            await axios.post('/api/certification-rules', payload);
            toast.success('Certification rules saved successfully');
        } catch (error) {
            console.error(error);
            toast.error('Failed to save rules');
        } finally {
            setSaving(false);
        }
    };

    const totalWeightage = (rule.weightage?.technical || 0) + (rule.weightage?.communication || 0) + (rule.weightage?.confidence || 0);

    if (categoriesLoading && categories.length === 0) {
        return <AdminPageSkeleton variant="form" />;
    }

    if (categoriesError && categories.length === 0) {
        return (
            <AdminPageError
                title="Certification categories unavailable"
                message={categoriesError}
                onRetry={fetchCategories}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Certification Rules</h1>
                    <p className="text-gray-500 mt-1">Configure eligibility and scoring criteria for domain certifications.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="max-w-3xl">
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Category</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004fcb] focus:border-transparent"
                        >
                            <option value="">-- Choose a Domain --</option>
                            {categories.map((cat) => {
                                const categoryId = cat.id || cat._id || '';
                                return <option key={categoryId || cat.name} value={categoryId}>{cat.name}</option>;
                            })}
                        </select>
                        {categoriesError && (
                            <div role="alert" className="mt-2 text-sm text-red-700">
                                <span>{categoriesError} </span>
                                <button type="button" onClick={fetchCategories} className="font-semibold underline" disabled={categoriesLoading}>Retry</button>
                            </div>
                        )}
                        {!categoriesLoading && !categoriesError && categories.length === 0 && (
                            <p className="mt-2 text-sm text-gray-500">No categories are available to configure.</p>
                        )}
                    </div>

                    {selectedCategory && (
                        ruleLoading ? (
                            <AdminPageSkeleton variant="form" />
                        ) : ruleError ? (
                            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                                <p>{ruleError}</p>
                                <button type="button" onClick={() => loadRule(selectedCategory)} className="mt-2 font-semibold underline">Retry</button>
                            </div>
                        ) : <form onSubmit={handleSave} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Interviews Required</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={rule.minInterviews}
                                        onChange={(e) => setRule({ ...rule, minInterviews: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004fcb] focus:border-transparent"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">To be eligible for certification</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Passing Percentage</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={rule.passingPercentage}
                                        onChange={(e) => setRule({ ...rule, passingPercentage: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004fcb] focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Validity Period (Months)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={rule.validityMonths}
                                        onChange={(e) => setRule({ ...rule, validityMonths: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004fcb] focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                                    <Award className="w-5 h-5 text-[#004fcb]" />
                                    Uncommon Score Weightage
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Technical Skill (%)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={rule.weightage?.technical || 0}
                                            onChange={(e) => setRule({ ...rule, weightage: { ...rule.weightage, technical: parseInt(e.target.value) } })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004fcb] focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Communication (%)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={rule.weightage?.communication || 0}
                                            onChange={(e) => setRule({ ...rule, weightage: { ...rule.weightage, communication: parseInt(e.target.value) } })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004fcb] focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Confidence (%)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={rule.weightage?.confidence || 0}
                                            onChange={(e) => setRule({ ...rule, weightage: { ...rule.weightage, confidence: parseInt(e.target.value) } })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#004fcb] focus:border-transparent"
                                        />
                                    </div>
                                </div>
                                {totalWeightage !== 100 && (
                                    <div className="mt-3 flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg text-sm">
                                        <Info className="w-4 h-4" />
                                        Total weightage is {totalWeightage}%. It should ideally be 100%.
                                    </div>
                                )}
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-2 bg-[#004fcb] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {saving ? 'Saving...' : 'Save Configuration'}
                                </button>
                            </div>
                        </form>
                    )}

                    {!selectedCategory && (
                        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            <p className="text-gray-500">Please select a category above to configure its certification rules.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
