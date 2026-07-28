type AuthStateHandlers<T> = {
  setUser: (user: T | null) => void;
  setReady: (ready: boolean) => void;
  signInGuest: () => Promise<unknown>;
};

export async function applyAuthState<T>(nextUser: T | null, handlers: AuthStateHandlers<T>) {
  handlers.setUser(nextUser);
  if (nextUser) {
    handlers.setReady(true);
    return;
  }
  handlers.setReady(false);
  await handlers.signInGuest();
}
