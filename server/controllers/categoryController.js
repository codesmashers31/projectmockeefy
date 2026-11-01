import Category from '../models/Category.js';
import cacheService from '../services/cacheService.js';

const CATEGORIES_CACHE_KEY = 'mockeefy:categories:all';

// Get all categories with caching
export const getAllCategories = async (req, res) => {
    try {
        const categories = await cacheService.getOrSet(
            CATEGORIES_CACHE_KEY,
            () => Category.find().lean(),
            600 // 10 minutes TTL
        );
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create a new category
export const createCategory = async (req, res) => {
    const { name, description, icon, type, amount, status } = req.body;

    try {
        const newCategory = new Category({
            name,
            description,
            icon,
            type,
            amount,
            status
        });

        const savedCategory = await newCategory.save();
        await cacheService.del(CATEGORIES_CACHE_KEY);
        res.status(201).json(savedCategory);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Update a category (only provided fields; amount = base price for 30 min)
export const updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name, description, icon, type, amount, status } = req.body;

    try {
        const update = {};
        if (name !== undefined) update.name = name;
        if (description !== undefined) update.description = description;
        if (icon !== undefined) update.icon = icon;
        if (type !== undefined) update.type = type;
        if (amount !== undefined) update.amount = amount === "" || amount === null ? null : Number(amount);
        if (status !== undefined) update.status = status;

        const updatedCategory = await Category.findByIdAndUpdate(id, update, { new: true });
        if (!updatedCategory) return res.status(404).json({ message: "Category not found" });

        await cacheService.del(CATEGORIES_CACHE_KEY);
        res.status(200).json(updatedCategory);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Seed initial categories
export const seedCategories = async (req, res) => {
    const initialCategories = [
        // Programming Languages
        { name: 'JavaScript', type: 'technical', description: 'Web development language', amount: 500 },
        { name: 'Python', type: 'technical', description: 'General purpose & AI language', amount: 500 },
        { name: 'Java', type: 'technical', description: 'Enterprise application development', amount: 500 },
        { name: 'C++', type: 'technical', description: 'System and high-performance computing', amount: 600 },
        { name: 'Go', type: 'technical', description: 'Cloud and backend development', amount: 600 },
        { name: 'Rust', type: 'technical', description: 'Memory-safe systems programming', amount: 700 },

        // Frontend
        { name: 'React', type: 'technical', description: 'Component-based UI library', amount: 550 },
        { name: 'Vue.js', type: 'technical', description: 'Progressive JavaScript framework', amount: 500 },
        { name: 'Angular', type: 'technical', description: 'Full-featured enterprise framework', amount: 550 },

        // Backend
        { name: 'Node.js', type: 'technical', description: 'JavaScript runtime for server-side', amount: 550 },
        { name: 'Django', type: 'technical', description: 'Python high-level web framework', amount: 550 },
        { name: 'Spring Boot', type: 'technical', description: 'Java enterprise backend framework', amount: 600 },

        // Cloud & DevOps
        { name: 'AWS', type: 'technical', description: 'Amazon Web Services cloud platform', amount: 700 },
        { name: 'Docker', type: 'technical', description: 'Containerization technology', amount: 600 },
        { name: 'Kubernetes', type: 'technical', description: 'Container orchestration platform', amount: 750 },

        // AI & Data
        { name: 'Machine Learning', type: 'technical', description: 'ML algorithms and modeling', amount: 800 },
        { name: 'Data Science', type: 'technical', description: 'Data analysis and visualization', amount: 750 },
        { name: 'System Design', type: 'technical', description: 'Large-scale distributed systems', amount: 900 },

        // Behavioral & Roles
        { name: 'HR Interview', type: 'non-technical', description: 'Behavioral and culture fit prep', amount: 400 },
        { name: 'Product Management', type: 'non-technical', description: 'Product sense, execution & metrics', amount: 750 },
        { name: 'Engineering Manager', type: 'non-technical', description: 'Leadership and team management', amount: 850 }
    ];

    try {
        await Category.deleteMany();
        const createdCategories = await Category.insertMany(initialCategories);
        await cacheService.del(CATEGORIES_CACHE_KEY);
        res.status(201).json({ message: 'Categories seeded successfully', data: createdCategories });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
