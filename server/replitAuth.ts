import connectPg from "connect-pg-simple";
import type {
	Express,
	NextFunction,
	Request,
	RequestHandler,
	Response,
} from "express";
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
		try {
			return await client.discovery(
				new URL(process.env.OIDC_ISSUER_URL ?? "https://replit.com/oidc"),
				process.env.OIDC_CLIENT_ID!,
				{ client_secret: process.env.OIDC_CLIENT_SECRET },
			);
		} catch (error) {
			console.error("OIDC discovery error:", error);
			throw error;
		}
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
		id: existingUser.id,
		email: claims["email"],
		firstName: claims["first_name"],
		lastName: claims["last_name"],
		profileImageUrl: claims["profile_image_url"],
		sub: claims["sub"],
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
		try {
			const claims = tokens.claims();
			if (!claims) {
				console.error("No claims in token response");
				verified(new Error("Invalid token response"), false);
				return;
			}
			console.log("OAuth claims received:", {
				sub: claims.sub,
				email: claims.email,
			});

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
			//const user = {};
			const dbUser = await storage.getUserByEmail(claims.email);
			if (!dbUser) {
		        // This should not happen, but it's a safe check
		        verified(new Error("Failed to retrieve user profile after auth."), false);
		        return;
		      }
			updateUserSession(dbUser, tokens);
			verified(null, dbUser);
		} catch (error) {
			console.error("Error in OAuth verify function:", error);
			verified(error as Error, false);
		}
	};

	for (const domain of process.env.REPLIT_DOMAINS!.split(",")) {
		console.log("domain", domain);
		const strategy = new Strategy(
			{
				name: `replitauth:${domain}`,
				config,
				scope:
					"openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
				callbackURL: `https://${domain}/api/callback`,
			},

			verify,
		);
		passport.use(strategy);
	}

	passport.serializeUser((user: Express.User, cb) => cb(null, user));
	passport.deserializeUser((user: Express.User, cb) => cb(null, user));

	
	app.get("/api/login", (req: Request, res: Response, next: NextFunction) => {
		const domains = process.env.REPLIT_DOMAINS!.split(",");
		if (!domains.includes(req.hostname)) {
			return res.status(400).json({ error: "Invalid hostname" });
		}
		passport.authenticate(`replitauth:${req.hostname}`, {
			//prompt: "login consent",
			prompt: "none",
			scope: [
				"openid",
				"https://www.googleapis.com/auth/userinfo.email",
				"https://www.googleapis.com/auth/userinfo.profile",
			],
		})(req, res, next);
	});

	app.get(
		"/api/callback",
		(req: Request, res: Response, next: NextFunction) => {
			const domains = process.env.REPLIT_DOMAINS!.split(",");
			if (!domains.includes(req.hostname)) {
				console.log(req.hostname);
				console.error("Invalid hostname");
				return res.status(400).json({ error: "Invalid hostname" });
			}
			console.log("host:::::::", req.hostname);
			passport.authenticate(`replitauth:${req.hostname}`, {
				successReturnToOrRedirect: "/dashboard",
				failureRedirect: "/unauthorized",
				failureMessage: true,
			})(req, res, next);
		},
		(err: any, req: Request, res: Response, next: NextFunction) => {
			if (err) {
				console.error("full Error", JSON.stringify(err, null, 2));
				console.error("OAuth callback error:", err.message);
				console.error("Error stack:", err.stack);
				console.error("Error name:", err.name);
				console.error("Error code:", err.code);
				console.error("Error status:", err.status);
				console.error(
					"Error body:",
					err.body || (err.response && err.response.body),
				);
				console.error("Request URL:", req.url);
				console.error("Request query:", JSON.stringify(req.query));
				console.error("Request hostname:", req.hostname);
			}
			next(err);
		},
	);

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

	app.get("/api/logout", (req: any, res: any, next: any) => {
	  // Use the modern error-first callback for req.logout
	  req.logout(function(err: any) {
	    if (err) {
	      // If logout fails, log it and pass the error
	      console.error("req.logout error:", err);
	      return next(err);
	    }
	
	    // On success, try to build the OIDC logout URL
	    try {
	      // We must get the config object again inside this function scope
	      // Note: This assumes 'config' is available in this scope.
	      // If 'config' was defined inside setupAuth, this is correct.
	      const logoutUrl = client.buildEndSessionUrl(config, {
	        client_id: process.env.OIDC_CLIENT_ID!,
	        
	        // Add the trailing slash to redirect to the root path "/"
	        post_logout_redirect_uri: `${req.protocol}://${req.hostname}/`,
	      });
	      
	      // Redirect the user to Replit's OIDC logout page
	      res.redirect(logoutUrl.href);
	
	    } catch (error) {
	      console.error("Error building end session URL:", error);
	      // If building the URL fails, just redirect to the homepage
	      // This prevents the "Service Unavailable" crash.
	      res.redirect("/");
	    }
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
		console.error("Refresh token error:", error);
		res.status(401).json({ message: "Unauthorized" });
		return;
	}
};
