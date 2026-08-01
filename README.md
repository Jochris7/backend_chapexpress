# ChapExpress — Backend

API NestJS pour la plateforme e-commerce ChapExpress (produits, catégories, zones de livraison, commandes, authentification admin).

## Prérequis

- Node.js 20+
- npm
- PostgreSQL 14+ (local, Docker, ou distant)

## Installation

```bash
npm install
```

## Configuration

Copie `.env.example` vers `.env` puis ajuste les valeurs si besoin :

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DATABASE_HOST` | Hôte PostgreSQL (`localhost` en dev) |
| `DATABASE_PORT` | Port PostgreSQL (`5432` par défaut) |
| `DB_USERNAME` | Utilisateur PostgreSQL |
| `DB_PASSWORD` | Mot de passe PostgreSQL |
| `DATABASE_NAME` | Nom de la base (`ecommerce`) |
| `JWT_SECRET` | Secret utilisé pour signer les tokens JWT admin — à changer en production |
| `PORT` | Port d'écoute de l'API (`3001` par défaut) |

## Configurer PostgreSQL en local

### Option A — avec Docker (recommandé)

```bash
docker run --name chapexpress-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ecommerce \
  -p 5432:5432 \
  -d postgres:16
```

Adapte `POSTGRES_USER` / `POSTGRES_PASSWORD` pour qu'ils correspondent à `DB_USERNAME` / `DB_PASSWORD` dans ton `.env`.

Pour l'arrêter / le relancer plus tard :

```bash
docker stop chapexpress-postgres
docker start chapexpress-postgres
```

### Option B — sans Docker

1. Installe PostgreSQL localement (postgresql.org, ou via le gestionnaire de paquets de ton OS).
2. Crée la base de données :

```bash
createdb -U postgres ecommerce
```

ou depuis `psql` :

```sql
CREATE DATABASE ecommerce;
```

3. Renseigne les identifiants correspondants dans `.env`.

## Synchronisation du schéma

Le projet n'utilise pas encore de migrations TypeORM manuelles. `TypeOrmModule` est configuré avec `synchronize: true` (voir `src/app.module.ts`) : au démarrage, TypeORM compare les entités du code aux tables existantes et applique automatiquement les différences (création des tables, colonnes, types enum, contraintes de clé étrangère...).

Aucune commande à lancer : il suffit de démarrer le serveur (étape suivante) avec une base PostgreSQL vide et accessible — les tables sont créées automatiquement au premier démarrage.

> `synchronize: true` est acceptable en développement local mais ne doit jamais être utilisé en production (risque de perte de données lors de changements de schéma) — il faudra migrer vers de vraies migrations TypeORM avant un déploiement.

## Démarrer le serveur

```bash
npm run start:dev
```

L'API écoute sur `http://localhost:3001`. Le CORS est configuré pour n'accepter que les requêtes venant de `http://localhost:3000` (le frontend Next.js), avec `credentials: true`.

## Créer le premier compte admin

Il n'y a qu'un seul compte admin pour toute la plateforme. Une fois le serveur démarré, appelle l'endpoint de seed une seule fois :

```bash
curl -X POST http://localhost:3001/auth/seed-admin \
  -H "Content-Type: application/json" \
  -d '{ "email": "ton-email@exemple.com", "password": "UnMotDePasseSolide123" }'
```

Cet endpoint ne fait rien (`409 Conflict`) si un compte admin existe déjà — il ne peut donc servir qu'une seule fois. Récupère ensuite un token via `POST /auth/login` avec ces mêmes identifiants (voir tableau des endpoints ci-dessous).

## Seed des zones de livraison

Les 11 zones de livraison d'Abidjan (Yopougon, Cocody, Marcory, Abobo, Anyama, Attécoubé, Koumassi, Plateau, Port-Bouet, Treichville, Expédition) peuvent être insérées en une fois :

```bash
curl -X POST http://localhost:3001/delivery-zones/seed
```

Cet endpoint est public et idempotent : il ne fait rien s'il existe déjà des zones en base, donc il est sans risque de le rappeler.

## Endpoints disponibles

Toutes les routes protégées attendent un header `Authorization: Bearer <token>` obtenu via `POST /auth/login`.

### Auth

| Méthode | URL | Accès | Body |
|---|---|---|---|
| POST | `/auth/login` | Public | `{ email, password }` → `{ access_token }` |
| POST | `/auth/seed-admin` | Public (une seule fois, 409 si admin déjà existant) | `{ email, password }` |
| GET | `/auth/me` | Protégé | — |

### Categories

| Méthode | URL | Accès | Body |
|---|---|---|---|
| GET | `/categories` | Public | — (triées par `name`) |
| POST | `/categories` | Protégé | `{ name }` |
| DELETE | `/categories/:id` | Protégé | — (400 si des produits utilisent cette catégorie) |

### Products

| Méthode | URL | Accès | Body |
|---|---|---|---|
| GET | `/products` | Public | Query params optionnels : `categoryId`, `search`, `includeOutOfStock` (`true`/`false`) |
| GET | `/products/:id` | Public | — |
| POST | `/products` | Protégé | `multipart/form-data` : `title`, `description?`, `categoryId`, `price`, `quantity`, `size?`, `image` (fichier) |
| PATCH | `/products/:id` | Protégé | `multipart/form-data`, tous les champs optionnels, `image` optionnelle (remplace l'ancienne) |
| DELETE | `/products/:id` | Protégé | — (400 si le produit est référencé par des commandes) |

Images accessibles publiquement via `http://localhost:3001/uploads/products/<fichier>`.

### Delivery Zones

| Méthode | URL | Accès | Body |
|---|---|---|---|
| GET | `/delivery-zones` | Public | — (triées par `name`) |
| POST | `/delivery-zones/seed` | Public, idempotent | — |
| POST | `/delivery-zones` | Protégé | `{ name, city, fee }` |
| PATCH | `/delivery-zones/:id` | Protégé | `{ name?, city?, fee? }` |
| DELETE | `/delivery-zones/:id` | Protégé | — |

### Orders

| Méthode | URL | Accès | Body |
|---|---|---|---|
| POST | `/orders` | Public | `{ customerName, phone1, phone2?, city, deliveryZoneId, district?, promoCode?, paymentMethod: "wave"\|"cash_on_delivery", items: [{ productId, quantity, size? }] }` |
| GET | `/orders` | Protégé | — (triées par `createdAt` décroissant, avec items et deliveryZone chargés) |
| GET | `/orders/:id` | Protégé | — |
| PATCH | `/orders/:id/status` | Protégé | `{ status: "pending"\|"paid"\|"delivered"\|"cancelled" }` |

`POST /orders` vérifie le stock de chaque article, calcule `subtotal`/`total`, décrémente le stock et crée la commande dans une transaction unique : soit tout réussit, soit rien n'est modifié en base.

## Scripts utiles

```bash
npm run start:dev   # démarrage en mode watch
npm run build       # compilation TypeScript
npm run lint         # ESLint (avec --fix)
npm run test         # tests unitaires
npm run test:e2e     # tests end-to-end
```
