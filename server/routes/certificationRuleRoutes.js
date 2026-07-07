import express from 'express';
import { getRuleByCategory, saveRule } from '../controllers/certificationRuleController.js';

const router = express.Router();

router.get('/category/:categoryId', getRuleByCategory);
router.post('/', saveRule);

export default router;
