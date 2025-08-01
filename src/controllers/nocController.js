import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import NOC from '../models/NOC.js';
import { uploadBufferToCloudinary } from '../utils/uploadToCloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====== APPLY FOR NEW NOC ======
export const applyNOC = async (req, res) => {
  try {
    const { dental_council_name, postal_address } = req.cleanedFormData;
    const userId = req.user._id;

    const requiredFiles = ['tdc_reg_certificate_upload', 'aadhaar_upload'];
    for (const field of requiredFiles) {
      if (!req.fileBufferMap[field]) {
        return res.status(400).json({ error: `Missing required file: ${field}` });
      }
    }

    if (!dental_council_name || !postal_address) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const fullName = [req.user.f_name, req.user.m_name, req.user.l_name].filter(Boolean).join('_').replace(/\s+/g, '_');
    const safeName = fullName.replace(/[^a-zA-Z0-9_]/g, '');

    const savedFiles = {};

    for (const [fieldName, file] of Object.entries(req.fileBufferMap)) {
      const timestamp = Date.now();
      const filename = `${timestamp}-${fieldName}.pdf`;
      const cloudinaryUrl = await uploadBufferToCloudinary(file.buffer, filename, safeName);
      savedFiles[fieldName] = cloudinaryUrl;

      // Optional local backup
      const folderPath = path.join(__dirname, '..', 'uploads', safeName);
      fs.mkdirSync(folderPath, { recursive: true });
      fs.writeFileSync(path.join(folderPath, filename), file.buffer);
    }

    const noc = new NOC({
      user_id: userId,
      dental_council_name,
      postal_address,
      ...savedFiles
    });

    await noc.save();

    res.status(201).json({ success: true, message: 'NOC submitted successfully', data: noc });
  } catch (error) {
    console.error('NOC Submission Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


// ====== GET NOC ======
export const getNOC = async (req, res) => {
  try {
    const userId = req.user._id;
    const applications = await NOC.find({ user_id: userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: applications });
  } catch (error) {
    console.error('Fetch NOC Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};