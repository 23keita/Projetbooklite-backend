# Booklite - Backend

Ce dépôt contient le serveur backend du projet **Booklite**, une plateforme de conception et de vente de produits digitaux. Il expose une API RESTful complète pour gérer les utilisateurs, les produits, les commandes et la livraison sécurisée des actifs numériques.

## ✨ Fonctionnalités

*   **Authentification Robuste :** Inscription et connexion sécurisées (email/mot de passe & Google OAuth).
*   **Sécurité JWT :** Utilisation de jetons d'accès (Access Tokens) et de rafraîchissement (Refresh Tokens) avec rotation et une liste de blocage côté serveur pour une sécurité renforcée.
*   **Gestion des Utilisateurs :** Mise à jour de profil, changement de mot de passe et suppression de compte.
*   **Réinitialisation de Mot de Passe :** Flux sécurisé de "mot de passe oublié" par e-mail.
*   **Gestion des Produits :** Opérations CRUD pour les produits numériques.
*   **Gestion des Commandes :** Création, consultation et gestion des commandes clients.
*   **Simulation de Paiement :** Endpoint pour simuler un paiement et mettre à jour le statut d'une commande.
*   **Téléchargements Numériques Sécurisés :**
    *   Intégration avec Google Drive pour un stockage privé des fichiers.
    *   Génération de liens de téléchargement uniques, limités dans le temps et en nombre d'utilisations.
*   **Génération de PDF :** Création à la volée de reçus PDF pour les commandes.
*   **Fonctionnalités Admin :** Endpoints dédiés à la gestion des utilisateurs, des commandes et des produits.

## 🛠️ Stack Technique

*   **Runtime :** [Node.js](https://nodejs.org/)
*   **Framework :** [Express.js](https://expressjs.com/)
*   **Base de données :** [MongoDB](https://www.mongodb.com/) avec l'ODM [Mongoose](https://mongoosejs.com/)
*   **Authentification :** [Passport.js](http://www.passportjs.org/) (stratégies `local`, `google-oauth20`), JSON Web Tokens (JWT)
*   **Sécurité :** Helmet, CORS, bcrypt.js
*   **Stockage Fichiers :** API Google Drive
*   **Génération de PDF :** PDFKit
*   **Envoi d'e-mails :** Nodemailer (configurable pour tout service SMTP)

---

## 🚀 Démarrage Rapide

### Prérequis

*   Node.js (v18.x ou plus récent recommandé)
*   npm ou yarn
*   Une instance MongoDB (locale ou sur le cloud comme MongoDB Atlas)

### Installation & Configuration

1.  **Clonez le dépôt :**
    ```bash
    git clone <votre-url-de-depot>
    cd Projetbooklite-backend
    ```

2.  **Installez les dépendances :**
    ```bash
    npm install
    ```

3.  **Créez le fichier d'environnement :**
    Copiez le fichier `.env.example` vers un nouveau fichier nommé `.env`.
    ```bash
    cp .env.example .env
    ```

4.  **Configurez votre fichier `.env` :**
    Ouvrez le fichier `.env` et remplissez les valeurs requises.

    ```dotenv
    # Configuration du serveur
    PORT=5000
    NODE_ENV=development
    BASE_URL=http://localhost:5000
    FRONTEND_URL=http://localhost:5173

    # Base de données
    MONGO_URI=mongodb://localhost:27017/booklite

    # Secrets JWT (générez des chaînes aléatoires robustes pour ces clés)
    JWT_SECRET=votre_cle_secrete_jwt
    JWT_REFRESH_SECRET=votre_cle_secrete_de_rafraichissement_jwt
    JWT_EXPIRE=15m

    # Identifiants Google OAuth 2.0
    GOOGLE_CLIENT_ID=votre_id_client_google.apps.googleusercontent.com
    GOOGLE_CLIENT_SECRET=votre_secret_client_google

    # API Google Drive (Compte de service)
    # Voir README-GoogleDrive.md pour les instructions détaillées
    GOOGLE_SERVICE_ACCOUNT_EMAIL=votre-compte-de-service@projet.iam.gserviceaccount.com
    GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nCLE_PRIVEE_SUR_UNE_LIGNE\n-----END PRIVATE KEY-----\n"
    GOOGLE_DRIVE_FOLDER_ID=votre_id_de_dossier_google_drive

    # Configuration des liens de téléchargement
    DOWNLOAD_EXPIRY_DAYS=7
    MAX_DOWNLOADS=3

    # Service d'e-mail (ex: SendGrid, Mailgun)
    EMAIL_HOST=smtp.example.com
    EMAIL_PORT=587
    EMAIL_USER=votre_utilisateur_email
    EMAIL_PASS=votre_mot_de_passe_email
    EMAIL_FROM="Booklite <no-reply@booklite.org>"
    ADMIN_EMAIL=votre_email_admin@example.com
    ```
    > **Important :** Pour la configuration de Google Drive, veuillez suivre les instructions détaillées dans le fichier `README-GoogleDrive.md`.

### Lancement de l'application

*   **Mode développement (avec rechargement automatique) :**
    ```bash
    npm run dev
    ```
    Le serveur démarrera sur le port spécifié dans votre `.env` (par défaut : 5000).

*   **Mode production :**
    ```bash
    npm start
    ```

---

## 🔐 Concepts de Sécurité

### Flux d'Authentification

L'application utilise un système d'authentification par jetons robuste :

1.  **Connexion :** Lors d'une connexion réussie, le serveur génère un **Access Token** (courte durée, ex: 15 minutes) et un **Refresh Token** (longue durée, ex: 7 jours).
2.  **Stockage :** L'Access Token est stocké dans la mémoire du client. Le Refresh Token est stocké dans un cookie `httpOnly` sécurisé.
3.  **Requêtes API :** Le client envoie l'Access Token dans l'en-tête `Authorization` pour les routes protégées.
4.  **Expiration du Jeton :** Lorsque l'Access Token expire, le client effectue une requête vers un endpoint `/refresh-token`.
5.  **Rotation des Jetons :** Le serveur valide le Refresh Token depuis le cookie, l'invalide, et émet une *nouvelle* paire d'Access et de Refresh Tokens. Cette rotation empêche la réutilisation des jetons et renforce la sécurité.
6.  **Déconnexion :** Lors de la déconnexion, l'ID unique de l'Access Token (`jti`) est ajouté à une liste de blocage en base de données, et le Refresh Token est effacé du document utilisateur et du cookie client, garantissant une invalidation complète de la session.

### Téléchargements de Fichiers Sécurisés

Pour protéger les produits numériques contre le partage non autorisé :

1.  Les fichiers sont stockés dans un **dossier Google Drive privé**, inaccessible au public.
2.  Après un achat réussi, le client demande un lien de téléchargement pour un produit.
3.  Le backend génère un **jeton unique** et le stocke dans la collection `downloadlinks` avec une date d'expiration et une limite de téléchargements.
4.  L'utilisateur reçoit une URL de type `https://booklite.org/api/download/<token>`.
5.  Lorsque cette URL est accédée, le backend :
    *   Valide le jeton.
    *   Vérifie l'expiration, la révocation et le nombre de téléchargements.
    *   Incrémente le compteur de téléchargements.
    *   Streame le fichier directement depuis Google Drive vers l'utilisateur.

Ce mécanisme empêche l'accès direct au fichier et le partage de liens.

---

## 📖 Endpoints de l'API

Voici un résumé des routes principales de l'API. Toutes les routes protégées nécessitent un Access Token JWT valide.

### Authentification (`/api/auth`)

*   `POST /register`: Inscrire un nouvel utilisateur.
*   `POST /login`: Se connecter et recevoir les jetons.
*   `POST /logout`: Se déconnecter et invalider les jetons.
*   `POST /refresh-token`: Obtenir un nouvel access token via le refresh token.
*   `GET /me`: Obtenir le profil de l'utilisateur authentifié.
*   `PUT /profile`: Mettre à jour le profil de l'utilisateur.
*   `PUT /change-password`: Changer le mot de passe de l'utilisateur.
*   `POST /forgot-password`: Demander un lien de réinitialisation de mot de passe.
*   `POST /reset-password`: Réinitialiser le mot de passe avec un jeton valide.
*   `GET /google`: Initier le flux Google OAuth.
*   `GET /google/callback`: Callback pour Google OAuth.

### Commandes (`/api/orders`)

*   `POST /`: Créer une nouvelle commande.
*   `GET /myorders`: Obtenir toutes les commandes de l'utilisateur authentifié.
*   `GET /:id`: Obtenir une commande spécifique par son ID.
*   `POST /:id/pay`: Simuler le paiement d'une commande.
*   `GET /:id/receipt`: Générer et télécharger un reçu PDF pour une commande.
*   `POST /:id/products/:productId/download-link`: Générer un lien de téléchargement pour un produit acheté.

### Routes Administrateur

*   `GET /api/orders/all`: Obtenir toutes les commandes du système.
*   `PUT /api/orders/:id/status`: Mettre à jour le statut d'une commande.
*   `GET /api/users`: Obtenir tous les utilisateurs.
*   `DELETE /api/users/:id`: Supprimer un utilisateur.
*   ... et d'autres routes pour la gestion des produits et les statistiques du tableau de bord.

---