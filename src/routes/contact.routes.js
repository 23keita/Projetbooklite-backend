import express from 'express';

const router = express.Router();

// @route   POST /api/contact
// @desc    Handle contact form submission
// @access  Public
router.post('/', (req, res) => {
  const { name, email, subject, message, company, phone } = req.body;

  // Basic validation
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: 'Please fill in all required fields.' });
  }

  console.log('New contact form submission:');
  console.log(`Name: ${name}`);
  console.log(`Email: ${email}`);
  console.log(`Subject: ${subject}`);
  console.log(`Message: ${message}`);
  if (company) console.log(`Company: ${company}`);
  if (phone) console.log(`Phone: ${phone}`);

  // In a real application, you would send an email here.
  // For example, using a service like Nodemailer.

  res.status(200).json({ message: 'Your message has been sent successfully!' });
});

export default router;
