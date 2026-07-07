import HrContact from '../models/HrContact.js';

// Get all HR Contacts
export const getHrContacts = async (req, res) => {
    try {
        const contacts = await HrContact.find().populate('categoryId', 'name');
        res.json(contacts);
    } catch (error) {
        console.error("Error in getHrContacts:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Create a new HR Contact
export const createHrContact = async (req, res) => {
    try {
        const { categoryId, name, email, phone, company, designation } = req.body;
        if (!categoryId || !name || !email) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }
        const newContact = await HrContact.create({
            categoryId,
            name,
            email,
            phone,
            company,
            designation
        });
        res.status(201).json(newContact);
    } catch (error) {
        console.error("Error in createHrContact:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Delete an HR Contact
export const deleteHrContact = async (req, res) => {
    try {
        const { id } = req.params;
        const contact = await HrContact.findByIdAndDelete(id);
        if (!contact) {
            return res.status(404).json({ success: false, message: "Contact not found" });
        }
        res.json({ success: true, message: "Contact deleted successfully" });
    } catch (error) {
        console.error("Error in deleteHrContact:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
