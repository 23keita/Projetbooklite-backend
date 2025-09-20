import nodemailer from 'nodemailer';
import { v2 as cloudinary } from 'cloudinary';

// Configuration du transporteur email
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true', // true pour 465, false pour autres ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Générer des liens de téléchargement sécurisés pour les produits
const generateDownloadLinks = (order) => {
  const links = [];
  
  for (const item of order.items) {
    const product = item.product;
    
    if (product.files && product.files.length > 0) {
      for (const file of product.files) {
        const downloadUrl = cloudinary.url(file.publicId, {
          resource_type: 'auto',
          type: 'upload',
          sign_url: true,
          expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 3600), // Expire dans 7 jours
        });
        
        links.push({
          productTitle: product.title,
          fileName: file.fileName || file.originalName || 'Fichier',
          downloadUrl,
        });
      }
    }
  }
  
  return links;
};

// Fonction générique d'envoi d'email
export const sendEmail = async ({ to, subject, text, html, cc }) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"BookLite" <${process.env.EMAIL_USER}>`,
      to,
      cc,
      subject,
      text,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email envoyé à ${to}`);
    
  } catch (error) {
    console.error('Erreur envoi email:', error);
    throw error;
  }
};

// Envoyer l'email de confirmation de commande
export const sendOrderConfirmationEmail = async (order) => {
  try {
    const transporter = createTransporter();
    const downloadLinks = generateDownloadLinks(order);
    
    // Construire la liste des produits
    const productsList = order.items.map(item => 
      `- ${item.product.title} (x${item.quantity}) - ${item.price}€`
    ).join('\n');
    
    // Construire la liste des liens de téléchargement
    const downloadLinksList = downloadLinks.map(link => 
      `- ${link.productTitle}: ${link.fileName}\n  Lien: ${link.downloadUrl}`
    ).join('\n\n');
    
    const emailContent = `
Bonjour ${order.user.name},

Votre commande #${order.orderNumber} a été confirmée et payée avec succès !

Détails de la commande:
${productsList}

Total: ${order.totalAmount}€

Vos liens de téléchargement (valides 7 jours):
${downloadLinksList}

Ces liens sont personnels et sécurisés. Ne les partagez pas.

Merci pour votre achat !

L'équipe BookLite
    `;

    const mailOptions = {
      from: `"BookLite" <${process.env.EMAIL_USER}>`,
      to: order.user.email,
      cc: process.env.ADMIN_EMAIL,
      subject: `Commande confirmée #${order.orderNumber} - Vos téléchargements`,
      text: emailContent,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Commande confirmée !</h2>
          <p>Bonjour <strong>${order.user.name}</strong>,</p>
          <p>Votre commande <strong>#${order.orderNumber}</strong> a été confirmée et payée avec succès !</p>
          
          <h3>Détails de la commande:</h3>
          <ul>
            ${order.items.map(item => 
              `<li>${item.product.title} (x${item.quantity}) - ${item.price}€</li>`
            ).join('')}
          </ul>
          <p><strong>Total: ${order.totalAmount}€</strong></p>
          
          <h3>Vos téléchargements:</h3>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
            ${downloadLinks.map(link => `
              <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 3px;">
                <strong>${link.productTitle}</strong><br>
                <span style="color: #666;">${link.fileName}</span><br>
                <a href="${link.downloadUrl}" style="color: #007cba; text-decoration: none;">
                  📥 Télécharger maintenant
                </a>
              </div>
            `).join('')}
          </div>
          
          <p style="color: #666; font-size: 12px;">
            Ces liens sont personnels et sécurisés. Ils expirent dans 7 jours.
          </p>
          
          <hr style="margin: 30px 0;">
          <p>Merci pour votre achat !</p>
          <p><strong>L'équipe BookLite</strong></p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email de confirmation envoyé pour commande ${order.orderNumber}`);
    
  } catch (error) {
    console.error('Erreur envoi email:', error);
    throw error;
  }
};