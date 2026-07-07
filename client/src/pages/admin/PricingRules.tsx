import { useState, useEffect, useMemo } from 'react';
import { DollarSign, RotateCcw, Search, Filter, Award, Layers, Sparkles, TrendingUp } from 'lucide-react';
import axios from '../../lib/axios';
import { toast } from 'sonner';

interface Category {
    _id: string;
    name: string;
    description: string;
}

interface Rule {
    categoryId: string;
    level: string;
    price: number;
    originalPrice?: number;
}

const LEVELS = [
    "Rising Mentor",
    "Professional Mentor",
    "Senior Mentor",
    "Elite Mentor",
    "FAANG Mentor"
];

export default function PricingRules() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [rules, setRules] = useState<Rule[]>([]);
    const [loading, setLoading] = useState(true);
    const [resetting, setResetting] = useState(false);

    // Search and filter states
    const [searchTerm, setSearchTerm] = useState("");

    // Grid local edit state: categoryId -> level -> price
    const [editedPrices, setEditedPrices] = useState<Record<string, Record<string, number>>>({});
    const [editedOriginalPrices, setEditedOriginalPrices] = useState<Record<string, Record<string, number>>>({});

    const fetchData = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            // Get full matrix rules and active categories
            const matrixRes = await axios.get('/api/pricing');
            if (matrixRes.data.success) {
                const allCats: Category[] = matrixRes.data.categories || [];
                setCategories(allCats);

                // Load rules
                const allRules = (matrixRes.data.rules || [])
                    .filter((r: any) => r.duration === 30 && !r.skillId)
                    .map((r: any) => ({
                        categoryId: r.categoryId,
                        level: r.level,
                        price: r.price,
                        originalPrice: r.originalPrice || 0
                    }));
                setRules(allRules);

                // Build initial edit state
                const edits: Record<string, Record<string, number>> = {};
                const origEdits: Record<string, Record<string, number>> = {};
                allRules.forEach((r: Rule) => {
                    if (!edits[r.categoryId]) edits[r.categoryId] = {};
                    edits[r.categoryId][r.level] = r.price;

                    if (!origEdits[r.categoryId]) origEdits[r.categoryId] = {};
                    origEdits[r.categoryId][r.level] = r.originalPrice || 0;
                });
                setEditedPrices(edits);
                setEditedOriginalPrices(origEdits);
            }
        } catch (error) {
            console.error("Failed to load pricing configurations:", error);
            toast.error("Failed to load pricing configurations");
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(true);
    }, []);

    // Price change handler for keystrokes
    const handlePriceChange = (catId: string, level: string, value: string) => {
        const parsed = parseInt(value, 10) || 0;
        setEditedPrices(prev => ({
            ...prev,
            [catId]: {
                ...prev[catId],
                [level]: parsed
            }
        }));
    };

    // Original Price change handler for keystrokes
    const handleOriginalPriceChange = (catId: string, level: string, value: string) => {
        const parsed = parseInt(value, 10) || 0;
        setEditedOriginalPrices(prev => ({
            ...prev,
            [catId]: {
                ...prev[catId],
                [level]: parsed
            }
        }));
    };

    // Instant single price save handler on blur or enter key
    const handleSinglePriceSave = async (categoryId: string, level: string, value: string, originalPriceVal: number) => {
        const parsed = parseInt(value, 10) || 0;
        
        // Find if this is different from original rule price
        const originalRule = rules.find(r => r.categoryId === categoryId && r.level === level);
        const originalPrice = originalRule ? originalRule.price : null;
        
        if (parsed === originalPrice) {
            // No change, ignore
            return;
        }

        try {
            // Optimistic update of local states to prevent lag
            const newRules = rules.map(r => 
                (r.categoryId === categoryId && r.level === level) 
                    ? { ...r, price: parsed } 
                    : r
            );
            if (!originalRule) {
                newRules.push({ categoryId, level, price: parsed, originalPrice: originalPriceVal });
            }
            setRules(newRules);

            // Call bulk update API with this single update
            const res = await axios.post('/api/pricing/bulk-update', {
                updates: [{ categoryId, level, price: parsed, originalPrice: originalPriceVal }]
            });

            if (res.data.success) {
                toast.success("Price updated successfully!");
                fetchData(false); // Silent sync with database
            }
        } catch (error) {
            console.error("Failed to save pricing rules:", error);
            toast.error("Failed to save price");
            fetchData(true); // Rollback to original DB values with spinner
        }
    };

    // Instant single original price save handler on blur or enter key
    const handleSingleOriginalPriceSave = async (categoryId: string, level: string, priceVal: number, value: string) => {
        const parsed = parseInt(value, 10) || 0;
        
        // Find if this is different from original rule originalPrice
        const originalRule = rules.find(r => r.categoryId === categoryId && r.level === level);
        const originalPrice = originalRule ? (originalRule.originalPrice || 0) : null;
        
        if (parsed === originalPrice) {
            // No change, ignore
            return;
        }

        try {
            // Optimistic update of local states to prevent lag
            const newRules = rules.map(r => 
                (r.categoryId === categoryId && r.level === level) 
                    ? { ...r, originalPrice: parsed } 
                    : r
            );
            if (!originalRule) {
                newRules.push({ categoryId, level, price: priceVal, originalPrice: parsed });
            }
            setRules(newRules);

            // Call bulk update API with this single update
            const res = await axios.post('/api/pricing/bulk-update', {
                updates: [{ categoryId, level, price: priceVal, originalPrice: parsed }]
            });

            if (res.data.success) {
                toast.success("Original price updated successfully!");
                fetchData(false); // Silent sync with database
            }
        } catch (error) {
            console.error("Failed to save pricing rules:", error);
            toast.error("Failed to save original price");
            fetchData(true); // Rollback to original DB values with spinner
        }
    };

    // Reset default pricing
    const handleReset = async () => {
        if (!confirm("Are you sure you want to reset all pricing rules to default matrix? This will overwrite your current settings.")) {
            return;
        }
        setResetting(true);
        try {
            const res = await axios.post('/api/pricing/reset');
            if (res.data.success) {
                toast.success("Pricing rules reset to default template");
                await fetchData();
            }
        } catch (error) {
            console.error("Error resetting pricing rules:", error);
            toast.error("Failed to reset pricing rules");
        } finally {
            setResetting(false);
        }
    };

    // Calculate metrics
    const metrics = useMemo(() => {
        const totalCats = categories.length;
        const totalLevels = LEVELS.length;
        
        let activeRulesCount = 0;
        let sumPrice = 0;

        categories.forEach(cat => {
            LEVELS.forEach(level => {
                const val = editedPrices[cat._id]?.[level];
                if (val !== undefined && val > 0) {
                    activeRulesCount++;
                    sumPrice += val;
                }
            });
        });

        const avgPrice = activeRulesCount > 0 ? Math.round(sumPrice / activeRulesCount) : 0;

        return {
            totalCats,
            totalLevels,
            activeRulesCount,
            avgPrice
        };
    }, [categories, editedPrices]);

    // Filter categories by search
    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <Award className="w-7 h-7 text-purple-600" />
                        Admin Pricing Management
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Control expert session rates dynamically based on Category and Level. Settings save automatically.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleReset}
                        disabled={resetting || loading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition border border-purple-200/50 disabled:opacity-50 shadow-sm"
                    >
                        <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
                        Reset to Defaults
                    </button>
                </div>
            </div>

            {/* Top Dashboard Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Categories Card */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-300" />
                    <div className="flex items-center gap-3 mb-3">
                        <span className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                            <Layers className="w-5 h-5" />
                        </span>
                        <span className="text-sm font-semibold text-gray-500">Total Categories</span>
                    </div>
                    <div className="text-2xl font-extrabold text-gray-900">{metrics.totalCats}</div>
                    <p className="text-[11px] text-gray-400 mt-1">Managed categories</p>
                </div>

                {/* Levels Card */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-300" />
                    <div className="flex items-center gap-3 mb-3">
                        <span className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                            <Award className="w-5 h-5" />
                        </span>
                        <span className="text-sm font-semibold text-gray-500">Expert Levels</span>
                    </div>
                    <div className="text-2xl font-extrabold text-gray-900">{metrics.totalLevels}</div>
                    <p className="text-[11px] text-gray-400 mt-1">Rising to FAANG Mentors</p>
                </div>

                {/* Active Rules Card */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-300" />
                    <div className="flex items-center gap-3 mb-3">
                        <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                            <Sparkles className="w-5 h-5" />
                        </span>
                        <span className="text-sm font-semibold text-gray-500">Active Pricing Rules</span>
                    </div>
                    <div className="text-2xl font-extrabold text-gray-900">{metrics.activeRulesCount}</div>
                    <p className="text-[11px] text-gray-400 mt-1">Defined pricing combinations</p>
                </div>

                {/* Avg Session Price Card */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-300" />
                    <div className="flex items-center gap-3 mb-3">
                        <span className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                            <TrendingUp className="w-5 h-5" />
                        </span>
                        <span className="text-sm font-semibold text-gray-500">Avg Session Price</span>
                    </div>
                    <div className="text-2xl font-extrabold text-gray-900">₹{metrics.avgPrice.toLocaleString("en-IN")}</div>
                    <p className="text-[11px] text-gray-400 mt-1">Weighted base hourly average</p>
                </div>
            </div>

            {/* Main Pricing Grid */}
            <div className="w-full space-y-4">
                {/* Controls Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search Category..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 bg-gray-50/50"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Filtered list</span>
                    </div>
                </div>

                {/* Table Container */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                            <RotateCcw className="w-8 h-8 animate-spin mb-3 text-purple-600" />
                            <p className="font-semibold text-sm">Loading pricing rules matrix...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                                        {LEVELS.map(level => (
                                            <th key={level} className="py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
                                                {level}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredCategories.length > 0 ? (
                                        filteredCategories.map(cat => (
                                            <tr key={cat._id} className="hover:bg-purple-50/10 transition-colors">
                                                {/* Category Details */}
                                                <td className="py-4 px-6">
                                                    <div className="font-bold text-gray-900 text-[14px]">{cat.name}</div>
                                                    <div className="text-[11px] text-gray-400 font-medium max-w-[180px] truncate">{cat.description}</div>
                                                </td>

                                                {/* Level Pricing Cells */}
                                                {LEVELS.map(level => {
                                                    const price = editedPrices[cat._id]?.[level] ?? 0;
                                                    const originalPrice = editedOriginalPrices[cat._id]?.[level] ?? 0;
                                                    const isChanged = price !== (rules.find(r => r.categoryId === cat._id && r.level === level)?.price ?? 0);
                                                    const isOrigChanged = originalPrice !== (rules.find(r => r.categoryId === cat._id && r.level === level)?.originalPrice ?? 0);
                                                    return (
                                                        <td key={level} className="py-4 px-3 text-center">
                                                            <div className="flex flex-col gap-1.5 items-center">
                                                                {/* Offer Price Input */}
                                                                <div className="relative w-28">
                                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-purple-600 text-[10px] font-bold">Offer:</span>
                                                                    <input
                                                                        type="number"
                                                                        value={price || ''}
                                                                        placeholder="0"
                                                                        onChange={(e) => handlePriceChange(cat._id, level, e.target.value)}
                                                                        onBlur={(e) => handleSinglePriceSave(cat._id, level, e.target.value, originalPrice)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                (e.target as HTMLInputElement).blur();
                                                                            }
                                                                        }}
                                                                        className={`w-full pl-11 pr-1 py-1 text-center text-xs font-bold border rounded-lg focus:outline-none transition-colors ${
                                                                            isChanged 
                                                                                ? 'border-purple-500 bg-purple-50/30 text-purple-900 focus:ring-1 focus:ring-purple-500' 
                                                                                : 'border-gray-200 text-gray-800 focus:border-purple-500 bg-gray-50/30'
                                                                        }`}
                                                                    />
                                                                </div>

                                                                {/* Original Price Input */}
                                                                <div className="relative w-28">
                                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">Orig:</span>
                                                                    <input
                                                                        type="number"
                                                                        value={originalPrice || ''}
                                                                        placeholder="0"
                                                                        onChange={(e) => handleOriginalPriceChange(cat._id, level, e.target.value)}
                                                                        onBlur={(e) => handleSingleOriginalPriceSave(cat._id, level, price, e.target.value)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                (e.target as HTMLInputElement).blur();
                                                                            }
                                                                        }}
                                                                        className={`w-full pl-9 pr-1 py-1 text-center text-[10px] font-semibold border rounded-lg focus:outline-none transition-colors ${
                                                                            isOrigChanged
                                                                                ? 'border-purple-400 bg-purple-50/20 text-purple-800'
                                                                                : 'border-gray-200 text-slate-500 bg-gray-50/10 focus:border-purple-400'
                                                                        }`}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={LEVELS.length + 1} className="py-12 text-center text-gray-400 text-sm italic">
                                                No categories match your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
