
import express from 'express';
import { getSkillsByCategory, createSkill, getAllSkills } from '../controllers/skillController.js';

const router = express.Router();

router.get('/', getAllSkills);
router.get('/category/:categoryId', getSkillsByCategory);
router.post('/', createSkill);

export default router;
