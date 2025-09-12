import crypto from 'crypto';

// Génération d'ID de commande
const generateOrderId = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `CMD-${date}-${random}`;
};

// Génération de token de téléchargement sécurisé
const generateDownloadToken = (orderId, productId, expires) => {
  const secret = process.env.DOWNLOAD_SECRET || 'default-secret-key';
  const payload = `${orderId}:${productId}:${expires}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
};

// Génération de lien de téléchargement
const generateDownloadLink = (orderId, productId, domain = 'localhost:5000') => {
  const expires = new Date();
  expires.setDate(expires.getDate() + 7); // 7 jours
  const token = generateDownloadToken(orderId, productId, expires.toISOString());
  
  return `http://${domain}/api/download?token=${token}&expires=${expires.toISOString()}&limit=3&order=${orderId}&product=${productId}`;
};

// Template email de confirmation
const generatePaymentInstructions = (order, customer) => {
  return {
    subject: `Instructions de paiement - Commande #${order.id}`,
    body: `
Bonjour ${customer.name},

Votre commande a été enregistrée avec succès.

Montant à payer: ${order.totalAmount}€
Méthode: Orange Money / MTN Mobile Money

Instructions:
1. Composez #144# (Orange) ou *182# (MTN)
2. Envoyez ${order.totalAmount}€ au +224 622 000 001 (BookLite SARL)
3. Envoyez-nous le SMS de confirmation par retour

Vos produits seront livrés par email dans les 2h suivant la confirmation.

Cordialement,
L'équipe BookLite
    `
  };
};

// Template email de livraison
const generateDeliveryEmail = (order, customer, downloadLinks) => {
  const linksHtml = downloadLinks.map((link, index) => 
    `${index + 1}. ${link.productTitle}\n   ${link.url}`
  ).join('\n\n');

  return {
    subject: `Vos produits digitaux - Commande #${order.id}`,
    body: `
Bonjour ${customer.name},

Votre paiement a été confirmé. Voici vos liens de téléchargement:

${linksHtml}

Validité: 7 jours | Téléchargements max: 3 par produit

Merci pour votre confiance !
L'équipe BookLite
    `
  };
};

export {
  generateOrderId,
  generateDownloadToken,
  generateDownloadLink,
  generatePaymentInstructions,
  generateDeliveryEmail
};