export function regenerateSession(req: Express.Request) {
  return new Promise<void>((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export function saveSession(req: Express.Request) {
  return new Promise<void>((resolve, reject) => {
    req.session.save((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export function deleteSession(req: Express.Request) {
  return new Promise<void>((resolve, reject) => {
    req.session.destroy((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
