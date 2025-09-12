import { google } from 'googleapis';
import crypto from 'crypto';

class GoogleDriveService {
  constructor() {
    // Authentification avec Service Account
    this.auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        project_id: process.env.GOOGLE_PROJECT_ID,
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    
    this.drive = google.drive({ version: 'v3', auth: this.auth });
    this.folderID = process.env.GOOGLE_DRIVE_FOLDER_ID;
    
    // Stockage des liens temporaires (en production, utiliser Redis ou MongoDB)
    this.temporaryLinks = new Map();
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
   * Génère un lien de téléchargement signé et temporaire
   */
  async generateSignedDownloadLink(fileId, expiryDays = 7, maxDownloads = 3) {
    try {
      // Vérifier que le fichier existe
      const file = await this.drive.files.get({
        fileId,
        fields: 'id,name,size',
      });

      // Générer un token unique
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date();
      expires.setDate(expires.getDate() + expiryDays);

      // Stocker les métadonnées du lien temporaire
      this.temporaryLinks.set(token, {
        fileId,
        fileName: file.data.name,
        expires: expires.toISOString(),
        maxDownloads,
        currentDownloads: 0,
        createdAt: new Date().toISOString(),
      });

      return {
        fileId,
        fileName: file.data.name,
        downloadUrl: `${process.env.BASE_URL || 'http://localhost:5000'}/api/download/${token}`,
        expires: expires.toISOString(),
        maxDownloads,
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
}

export default new GoogleDriveService();