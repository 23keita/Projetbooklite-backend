import express from 'express';

const router = express.Router();

router.post('/test', async (req, res) => {
  try {
    const { type, orderId } = req.body;
    
    // Simulation d'envoi d'email
    console.log(`Sending ${type} email for order ${orderId || 'N/A'}`);
    
    res.json({ 
      message: `Test ${type} email sent successfully`,
      type,
      orderId 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;