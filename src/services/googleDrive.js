import { google } from 'googleapis';
import crypto from 'crypto';
import fs from 'fs';

// --- Helpers pour charger la clé privée du Service Account en toute robustesse ---
function loadServiceAccountPrivateKey() {
  const envKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
  const keyFilePath = process.env.GOOGLE_PRIVATE_KEY_FILE;

  let key = null;

  if (envKeyRaw && envKeyRaw.trim().length > 0) {
    // Remplacer les séquences \n par de vrais retours à la ligne
    let candidate = envKeyRaw.replace(/\\n/g, '\n').trim();

    // Si la valeur ressemble à du base64 (pas d'entêtes PEM), essayer de décoder
    const looksLikePem = candidate.startsWith('-----BEGIN');
    const looksLikeBase64 = !looksLikePem && /^[A-Za-z0-9\+\/=_\-\s]+$/.test(candidate);
    if (!looksLikePem && looksLikeBase64) {
      try {
        candidate = Buffer.from(candidate, 'base64').toString('utf8').trim();
      } catch {}
    }

    // S'assurer que le PEM se termine par un saut de ligne
    if (!candidate.endsWith('\n')) {
      candidate = candidate + '\n';
    }

    key = candidate;
  } else if (keyFilePath) {
    try {
      const fileContent = fs.readFileSync(keyFilePath, 'utf8');
      // Ne pas trim en fin de fichier pour ne pas retirer la newline finale des PEM
      key = fileContent.endsWith('\n') ? fileContent : fileContent + '\n';
    } catch (e) {
      throw new Error(`Impossible de lire GOOGLE_PRIVATE_KEY_FILE: ${e.message}`);
    }
  }

  if (!key) return null;

  // Validation simple: entêtes PEM attendues par google-auth-library
  if (!key.startsWith('-----BEGIN') || !key.includes('PRIVATE KEY') || !key.includes('-----END')) {
    throw new Error('GOOGLE_PRIVATE_KEY invalide: assurez-vous de coller la clé privée PEM complète (avec BEGIN/END) ou de fournir un chemin via GOOGLE_PRIVATE_KEY_FILE.');
  }

  return key;
}

class GoogleDriveService {
  constructor() {
    // Charger et valider les informations du Service Account
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const projectId = process.env.GOOGLE_PROJECT_ID;
    const privateKey = loadServiceAccountPrivateKey();

    if (!clientEmail || !projectId) {
      console.error('Configuration Google Drive manquante: GOOGLE_SERVICE_ACCOUNT_EMAIL et GOOGLE_PROJECT_ID doivent être définis.');
    }
    // Avertir si PROJECT_ID ressemble à un client_id numérique
    if (projectId && /^\d+$/.test(projectId)) {
      console.warn('Attention: GOOGLE_PROJECT_ID semble numérique. Utilisez le project_id (ex: digitalproductsstore), pas le client_id.');
    }
    if (!privateKey) {
      console.error('Configuration Google Drive manquante: GOOGLE_PRIVATE_KEY (ou GOOGLE_PRIVATE_KEY_FILE) doit être défini.');
    }
    // Aider l'utilisateur s'il a laissé la valeur placeholder
    if (process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_PRIVATE_KEY.includes('YOUR_PRIVATE_KEY')) {
      console.error('GOOGLE_PRIVATE_KEY semble être une valeur de placeholder. Veuillez coller la clé privée du Service Account depuis le fichier JSON (remplacez les \n par des \n littéraux) ou utilisez GOOGLE_PRIVATE_KEY_FILE.');
    }

    // Authentification avec Service Account
    this.auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey || undefined,
        project_id: projectId,
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    
    this.drive = google.drive({ version: 'v3', auth: this.auth });
    this.folderID = process.env.GOOGLE_DRIVE_FOLDER_ID;
    
    // Paramètres de sécurité par défaut
    this.defaultExpiryDays = parseInt(process.env.DOWNLOAD_EXPIRY_DAYS || '7', 10);
    this.defaultMaxDownloads = parseInt(process.env.MAX_DOWNLOADS || '3', 10);
    
    // Stockage des liens temporaires (en production, utiliser Redis ou MongoDB)
    this.temporaryLinks = new Map();
  }

  /**
   * Liste les fichiers d'un dossier Google Drive
   */
  async listFilesInFolder(folderId = this.folderID) {
    try {
      const res = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, size, createdTime, modifiedTime)'
      });
      return res.data.files || [];
    } catch (error) {
      throw new Error(`Erreur liste des fichiers: ${error.message}`);
    }
  }

  /**
   * Upload un fichier vers Google Drive
   */
  async uploadFile(filePath, fileName, mimeType = 'application/pdf') {
    try {
      const fileMetadata = {
        name: fileName,
        parents: [this.folderID], // Dossier sécurisé
      };

      const media = {
        mimeType,
        body: filePath, // Stream ou buffer du fichier
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media,
        fields: 'id,name,size',
      });

      // Retirer les permissions publiques (sécurité)
      await this.removePublicAccess(response.data.id);

      return {
        fileId: response.data.id,
        name: response.data.name,
        size: response.data.size,
      };
    } catch (error) {
      throw new Error(`Erreur upload: ${error.message}`);
    }
  }

  /**
   * Upload un fichier et le rend public
   */
  async uploadPublicFile(fileStream, fileName, mimeType) {
    try {
      const fileMetadata = {
        name: fileName,
        parents: [this.folderID],
      };

      const media = {
        mimeType,
        body: fileStream,
      };

      const file = await this.drive.files.create({
        resource: fileMetadata,
        media,
        fields: 'id, webViewLink',
      });

      await this.drive.permissions.create({
        fileId: file.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      return {
        fileId: file.data.id,
        webViewLink: file.data.webViewLink,
      };
    } catch (error) {
      throw new Error(`Erreur upload public: ${error.message}`);
    }
  }

  /**
   * Génère un lien de téléchargement signé et temporaire
   */
  async generateSignedDownloadLink(fileId, expiryDays, maxDownloads) {
    try {
      const effectiveExpiry = typeof expiryDays === 'number' ? expiryDays : this.defaultExpiryDays;
      const effectiveMax = typeof maxDownloads === 'number' ? maxDownloads : this.defaultMaxDownloads;

      // Vérifier que le fichier existe
      const file = await this.drive.files.get({
        fileId,
        fields: 'id,name,size',
      });

      // Générer un token unique
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date();
      expires.setDate(expires.getDate() + effectiveExpiry);

      // Stocker les métadonnées du lien temporaire
      this.temporaryLinks.set(token, {
        fileId,
        fileName: file.data.name,
        expires: expires.toISOString(),
        maxDownloads: effectiveMax,
        currentDownloads: 0,
        createdAt: new Date().toISOString(),
      });

      return {
        fileId,
        fileName: file.data.name,
        token,
        downloadUrl: `${process.env.BASE_URL || 'http://localhost:5000'}/api/download/${token}`,
        expires: expires.toISOString(),
        maxDownloads: effectiveMax,
      };
    } catch (error) {
      throw new Error(`Erreur génération lien: ${error.message}`);
    }
  }

  /**
   * Valide et traite un téléchargement via token
   */
  async processDownload(token) {
    const linkData = this.temporaryLinks.get(token);
    
    if (!linkData) {
      throw new Error('Lien invalide ou expiré');
    }

    // Vérifier l'expiration
    if (new Date() > new Date(linkData.expires)) {
      this.temporaryLinks.delete(token);
      throw new Error('Lien expiré');
    }

    // Vérifier le nombre de téléchargements
    if (linkData.currentDownloads >= linkData.maxDownloads) {
      throw new Error('Limite de téléchargements atteinte');
    }

    // Incrémenter le compteur
    linkData.currentDownloads++;
    this.temporaryLinks.set(token, linkData);

    // Obtenir l'URL de téléchargement direct de Google Drive
    const directUrl = `https://drive.google.com/uc?export=download&id=${linkData.fileId}`;

    return {
      fileId: linkData.fileId,
      fileName: linkData.fileName,
      directUrl,
      remainingDownloads: linkData.maxDownloads - linkData.currentDownloads,
    };
  }

  /**
   * Liste les liens temporaires actifs (ADMIN)
   */
  listTemporaryLinks() {
    const result = [];
    for (const [token, data] of this.temporaryLinks.entries()) {
      result.push({ token, ...data });
    }
    return result;
  }

  /**
   * Réinitialise le compteur d'un lien
   */
  resetLink(token) {
    const data = this.temporaryLinks.get(token);
    if (!data) return { success: false, message: 'Lien non trouvé' };
    data.currentDownloads = 0;
    this.temporaryLinks.set(token, data);
    return { success: true, message: 'Compteur réinitialisé' };
  }

  /**
   * Révoque un lien avant expiration
   */
  async revokeLink(token) {
    const linkData = this.temporaryLinks.get(token);
    
    if (linkData) {
      // Supprimer le lien temporaire
      this.temporaryLinks.delete(token);
      
      return { success: true, message: 'Lien révoqué avec succès' };
    }
    
    return { success: false, message: 'Lien non trouvé' };
  }

  /**
   * Retire l'accès public d'un fichier
   */
  async removePublicAccess(fileId) {
    try {
      const permissions = await this.drive.permissions.list({ fileId });
      
      for (const permission of permissions.data.permissions) {
        if (permission.type === 'anyone') {
          await this.drive.permissions.delete({
            fileId,
            permissionId: permission.id,
          });
        }
      }
    } catch (error) {
      console.error('Erreur suppression permissions:', error.message);
    }
  }

  /**
   * Nettoie les liens temporaires expirés ou épuisés (en mémoire)
   * Retourne le nombre de liens supprimés
   */
  cleanupExpiredLinks() {
    let removed = 0;
    const now = new Date();
    for (const [token, data] of this.temporaryLinks.entries()) {
      const isExpired = now > new Date(data.expires);
      const isExhausted = (data.currentDownloads ?? 0) >= (data.maxDownloads ?? this.defaultMaxDownloads);
      if (isExpired || isExhausted) {
        this.temporaryLinks.delete(token);
        removed++;
      }
    }
    return removed;
  }
}

export default new GoogleDriveService();