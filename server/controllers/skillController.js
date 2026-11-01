import Skill from '../models/Skill.js';
import cacheService from '../services/cacheService.js';

const SKILLS_CACHE_PREFIX = 'mockeefy:skills:';

export const getSkillsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const cacheKey = `${SKILLS_CACHE_PREFIX}cat:${categoryId}`;
        const skills = await cacheService.getOrSet(
            cacheKey,
            () => Skill.find({ categoryId, isActive: true }).lean(),
            600
        );
        res.status(200).json(skills);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createSkill = async (req, res) => {
    try {
        const { name, categoryId, description } = req.body;
        const newSkill = new Skill({ name, categoryId, description });
        await newSkill.save();
        await cacheService.delPattern(`${SKILLS_CACHE_PREFIX}*`);
        res.status(201).json(newSkill);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getAllSkills = async (req, res) => {
    try {
        const cacheKey = `${SKILLS_CACHE_PREFIX}all`;
        const skills = await cacheService.getOrSet(
            cacheKey,
            () => Skill.find({ isActive: true })
                .populate('categoryId', 'name')
                .sort({ name: 1 })
                .lean(),
            600
        );
        res.status(200).json(skills);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
