import rateLimit from 'express-rate-limit';

/**
 * Limiteur pour les actions d'authentification sensibles (connexion, oubli/réinitialisation de mdp).
 * Bloque une IP après un certain nombre de tentatives pour prévenir les attaques par force brute.
 */
export const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 10, // Limite chaque IP à 10 requêtes par fenêtre de 15 minutes
	message: {
		message: 'Trop de tentatives depuis cette IP. Veuillez réessayer dans 15 minutes.'
	},
	standardHeaders: true, // Retourne les informations de limite dans les en-têtes `RateLimit-*`
	legacyHeaders: false, // Désactive les en-têtes `X-RateLimit-*` (obsolètes)
});

/**
 * Limiteur plus strict pour la création de compte afin de prévenir le spam.
 */
export const createAccountLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 heure
	max: 5, // Limite chaque IP à 5 créations de compte par heure
	message: {
		message: 'Trop de comptes créés depuis cette IP. Veuillez réessayer dans une heure.'
	},
	standardHeaders: true,
	legacyHeaders: false,
});