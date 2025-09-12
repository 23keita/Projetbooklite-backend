# Intégration Google Drive API - Guide complet

## 🚀 Configuration initiale

### 1. Installation des dépendances
```bash
npm install googleapis express cors dotenv jsonwebtoken bcryptjs mongoose
```

### 2. Configuration Google Cloud Console

1. **Créer un projet** sur [Google Cloud Console](https://console.cloud.google.com)
2. **Activer l'API Google Drive** dans "APIs & Services"
3. **Créer un Service Account** :
   - Aller dans "IAM & Admin" > "Service Accounts"
   - Créer un nouveau service account
   - Télécharger la clé JSON

### 3. Configuration du dossier Google Drive

```javascript
// Créer un dossier privé dans Google Drive
// Copier l'ID du dossier depuis l'URL : 
// https://drive.google.com/drive/folders/[FOLDER_ID]
```

### 4. Variables d'environnement (.env)

```env
# Google Drive API - Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_DRIVE_FOLDER_ID=1A2B3C4D5E6F7G8H9I0J

# Sécurité
JWT_SECRET=your-jwt-secret
# Clé utilisée pour signer/valider certains flux de téléchargement sécurisés
# Générez une valeur forte avec le script ci-dessous et remplacez la valeur
DOWNLOAD_SECRET=change-me
BASE_URL=http://localhost:5000
```

#### Générer un DOWNLOAD_SECRET fort

Pour générer une valeur sûre pour DOWNLOAD_SECRET, utilisez le script fourni:

```bash
# depuis la racine du backend
node scripts/generate-secret.js
# ou, après avoir rendu le script exécutable
chmod +x scripts/generate-secret.js
./scripts/generate-secret.js
```

Copiez l'une des deux valeurs proposées (hex ou base64url) et collez-la dans votre fichier `.env`:

```env
DOWNLOAD_SECRET=votre-valeur-très-secrète
```

Ne partagez jamais cette valeur et ne versionnez pas votre fichier `.env`.

## 📁 Structure des fichiers

```
src/
├── services/
│   └── googleDrive.js          # Service principal Google Drive
├── routes/
│   └── driveDownload.js        # Routes API
├── middleware/
│   └── auth.js                 # Authentification
├── models/
│   └── User.js                 # Modèle utilisateur
└── app.js                      # Application Express
```

## 🔐 Sécurisation du dossier Google Drive

### Étapes importantes :

1. **Dossier privé** : Ne jamais partager publiquement le dossier
2. **Permissions** : Seul le Service Account a accès
3. **Liens temporaires** : Génération de tokens uniques avec expiration
4. **Limitation** : Nombre de téléchargements contrôlé

## 🛠 Utilisation des APIs

### Générer un lien de téléchargement

```text
// POST /api/generate-link/:fileId
{
  "expiryDays": 7,
  "maxDownloads": 3
}

// Réponse
{
  "success": true,
  "data": {
    "fileId": "1A2B3Cxyz",
    "fileName": "ebook.pdf",
    "downloadUrl": "http://localhost:5000/api/download/abc123token",
    "expires": "2025-01-22T10:00:00Z",
    "maxDownloads": 3
  }
}
```

### Télécharger un fichier

```text
// GET /api/download/:token
// Redirige automatiquement vers Google Drive
```

### Vérifier l'accès à un fichier spécifique (admin)

```http
GET /api/files/:fileId/check
```

- Retourne les métadonnées si le fichier est accessible par le Service Account.
- En cas d'erreur d'accès:
  - 400 + message: "Fichier introuvable ou non accessible: <id>. Vérifiez que l'ID est correct et que le fichier/dossier est partagé avec <service-account>."
  - 400 + message: "Accès interdit ..." si le fichier n'est pas partagé.

### Révoquer un lien

```text
// DELETE /api/revoke-link/:token
{
  "success": true,
  "message": "Lien révoqué avec succès"
}
```

## 🔄 Intégration avec les commandes

```javascript
// Exemple d'utilisation dans le système de commandes
import googleDriveService from './services/googleDrive.js';

// Après paiement confirmé
const generateProductLinks = async (orderId, products) => {
  const downloadLinks = [];
  
  for (const product of products) {
    const link = await googleDriveService.generateSignedDownloadLink(
      product.driveFileId,
      7, // 7 jours
      3  // 3 téléchargements
    );
    
    downloadLinks.push({
      productId: product._id,
      productName: product.title,
      downloadUrl: link.downloadUrl,
      expires: link.expires
    });
  }
  
  return downloadLinks;
};
```

## 🧹 Nettoyage automatique

```javascript
// Nettoyer les liens expirés toutes les heures
setInterval(() => {
  googleDriveService.cleanupExpiredLinks();
}, 60 * 60 * 1000);
```

## 🧰 Dépannage (Troubleshooting)

### Erreur: ERR_OSSL_UNSUPPORTED (DECODER routines::unsupported)

Cette erreur survient généralement lorsque la clé privée du Service Account n'est pas au bon format pour Node/OpenSSL (clé tronquée, sans entêtes PEM, ou retours à la ligne mal gérés).

Vérifications à effectuer:
- Assurez-vous que GOOGLE_PRIVATE_KEY contient la clé complète au format PEM, avec les entêtes:
  "-----BEGIN PRIVATE KEY-----" et "-----END PRIVATE KEY-----".
- Si vous collez la clé dans .env, remplacez chaque retour à la ligne par \n (déjà géré par le code). Exemple:
  GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n...\n-----END PRIVATE KEY-----\n"
- Alternativement, mettez la clé dans un fichier (par ex. ./service-account.pem) et utilisez:
  GOOGLE_PRIVATE_KEY_FILE=./service-account.pem
- Si vous avez une valeur encodée en base64, mettez-la dans GOOGLE_PRIVATE_KEY telle quelle; le backend tentera de la décoder automatiquement.
- Note: Le backend normalise désormais la clé pour s'assurer qu'elle se termine par un saut de ligne final, requis par certains parseurs PEM.

Une fois la clé corrigée, relancez le serveur.

### Exemple de configuration .env correcte

```env
# Identifiants Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=drive-api-service@digitalproductsstore.iam.gserviceaccount.com
# Important: utilisez le project_id TEXTUEL (ex: digitalproductsstore), pas le client_id numérique
GOOGLE_PROJECT_ID=digitalproductsstore

# Méthode A: clé directement dans .env (avec \n entre les lignes, gardez les guillemets)
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Méthode B: clé dans un fichier PEM et pointeur
# GOOGLE_PRIVATE_KEY_FILE=./service-account.pem

# Autres paramètres
GOOGLE_DRIVE_FOLDER_ID=... 
```

## ⚠️ Points importants

1. **Service Account** : Plus sécurisé que OAuth2 pour les applications serveur
2. **Tokens uniques** : Chaque lien est unique et traçable
3. **Expiration** : Liens automatiquement invalidés après expiration
4. **Limitation** : Contrôle du nombre de téléchargements
5. **Révocation** : Possibilité d'annuler un lien avant expiration

## 🚀 Déploiement

Pour la production :
- Utiliser Redis ou MongoDB pour stocker les liens temporaires
- Configurer les variables d'environnement sur le serveur
- Activer HTTPS pour les liens de téléchargement
- Monitorer les téléchargements et les erreurs