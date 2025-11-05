import connectPg from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import session from "express-session";
import memoize from "memoizee";
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
	throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
	async () => {
		return await client.discovery(
			new URL(process.env.OIDC_ISSUER_URL ?? "https://replit.com/oidc"),
			process.env.OIDC_CLIENT_ID!,
		);
	},
	{ maxAge: 3600 * 1000 },
);

export function getSession() {
	const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
	const pgStore = connectPg(session);
	const sessionStore = new pgStore({
		conString: process.env.DATABASE_URL,
		createTableIfMissing: false,
		ttl: sessionTtl,
		tableName: "sessions",
	});
	return session({
		secret: process.env.SESSION_SECRET!,
		store: sessionStore,
		resave: false,
		saveUninitialized: false,
		cookie: {
			httpOnly: true,
			secure: true,
			maxAge: sessionTtl,
		},
	});
}

function updateUserSession(
	user: any,
	tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
) {
	user.claims = tokens.claims();
	user.access_token = tokens.access_token;
	user.refresh_token = tokens.refresh_token;
	user.expires_at = user.claims?.exp;
}

async function verifyAndUpdateUser(claims: any): Promise<boolean> {
	// Check if user exists by email (primary identifier for pre-registered users)
	const email = claims["email"];
	if (!email) {
		console.log("Login attempt with no email claim");
		return false;
	}

	const existingUser = await storage.getUserByEmail(email);

	if (!existingUser) {
		console.log(`Login denied: User with email ${email} not found in system`);
		return false;
	}

	// User exists - update their profile with latest OIDC data
	await storage.upsertUser({
		id: claims["sub"],
		email: claims["email"],
		firstName: claims["first_name"],
		lastName: claims["last_name"],
		profileImageUrl: claims["profile_image_url"],
	});

	return true;
}

export async function setupAuth(app: Express) {
	app.set("trust proxy", 1);
	app.use(getSession());
	app.use(passport.initialize());
	app.use(passport.session());

	const config = await getOidcConfig();

	const verify: VerifyFunction = async (
		tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
		verified: passport.AuthenticateCallback,
	) => {
		const claims = tokens.claims();

		// Check if user is authorized (exists in Users table)
		const isAuthorized = await verifyAndUpdateUser(claims);

		if (!isAuthorized) {
			// User not found - reject login
			verified(
				new Error("User not authorized. Please contact your administrator."),
				false,
			);
			return;
		}

		// User authorized - proceed with login
		const user = {};
		updateUserSession(user, tokens);
		verified(null, user);
	};

	for (const domain of process.env.REPLIT_DOMAINS!.split(",")) {
		const strategy = new Strategy(
			{
				name: `replitauth:${domain}`,
				config,
				scope: "openid email profile",
				callbackURL: `https://${domain}/api/callback`,
			},
			verify,
		);
		passport.use(strategy);
	}

	passport.serializeUser((user: Express.User, cb) => cb(null, user));
	passport.deserializeUser((user: Express.User, cb) => cb(null, user));

	app.get("/api/login", (req, res, next) => {
		passport.authenticate(`replitauth:${req.hostname}`, {
			prompt: "login consent",
			scope: ["openid", "email", "profile"],
		})(req, res, next);
	});

	app.get("/api/callback", (req, res, next) => {
		passport.authenticate(`replitauth:${req.hostname}`, {
			successReturnToOrRedirect: "/dashboard",
			failureRedirect: "/unauthorized",
			failureMessage: true,
		})(req, res, next);
	});

	// Unauthorized access page
	app.get("/unauthorized", (req, res) => {
		res.status(403).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Access Denied - Finni Health</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              max-width: 400px;
            }
            h1 { color: #e74c3c; margin-bottom: 1rem; }
            p { color: #555; line-height: 1.6; }
            a {
              display: inline-block;
              margin-top: 1.5rem;
              padding: 0.75rem 1.5rem;
              background: #3498db;
              color: white;
              text-decoration: none;
              border-radius: 4px;
            }
            a:hover { background: #2980b9; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Access Denied</h1>
            <p>You are not authorized to access this system.</p>
            <p>Please contact your administrator if you believe this is an error.</p>
            <a href="/">Return to Home</a>
          </div>
        </body>
      </html>
    `);
	});

	app.get("/api/logout", (req, res) => {
		req.logout(() => {
			res.redirect(
				client.buildEndSessionUrl(config, {
					client_id: process.env.OIDC_CLIENT_ID!,
					post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
				}).href,
			);
		});
	});
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
	const user = req.user as any;

	if (!req.isAuthenticated() || !user.expires_at) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	const now = Math.floor(Date.now() / 1000);
	if (now <= user.expires_at) {
		return next();
	}

	const refreshToken = user.refresh_token;
	if (!refreshToken) {
		res.status(401).json({ message: "Unauthorized" });
		return;
	}

	try {
		const config = await getOidcConfig();
		const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
		updateUserSession(user, tokenResponse);
		return next();
	} catch (error) {
		res.status(401).json({ message: "Unauthorized" });
		return;
	}
};
