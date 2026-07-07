import express from 'express';
import { getHrContacts, createHrContact, deleteHrContact } from '../controllers/hrContactController.js';

const router = express.Router();

router.get('/', getHrContacts);
router.post('/', createHrContact);
router.delete('/:id', deleteHrContact);

export default router;
