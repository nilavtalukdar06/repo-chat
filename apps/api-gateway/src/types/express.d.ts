export interface GatewayUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: GatewayUser;
    }
  }
}

export {};
