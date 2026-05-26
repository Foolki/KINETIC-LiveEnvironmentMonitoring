import { Request, Response, NextFunction } from 'express';

// Erweitere das Express-Request-Interface, um den Benutzer im Kontext zu speichern
declare global {
    namespace Express {
        interface Request {
            tenantContext?: {
                userId: string;
                role: string;
            };
        }
    }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    // Für die lokale Entwicklung und Demonstration erlauben wir einen statischen Test-Token
    // In Produktion würde hier die kryptografische JWT-Verifizierung (jwt.verify) stehen
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: Missing or malformed token' });
        return;
    }

    const token = authHeader.split(' ')[1];

    if (token === 'kinetic-admin-secret-token') {
        // Injektion des stark typisierten Kontextmodells in den downstream Handler
        req.tenantContext = {
            userId: 'usr_nabu_admin_01',
            role: 'admin'
        };
        next();
    } else {
        res.status(403).json({ error: 'Forbidden: Invalid tenant context' });
    }
};