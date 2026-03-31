// auth.js – sdílená auth logika, přidej do každé chráněné stránky

const Auth = {
  getUser() {
    const raw = sessionStorage.getItem('10base_user');
    return raw ? JSON.parse(raw) : null;
  },

  getToken() {
    return sessionStorage.getItem('10base_token');
  },

  // Přesměruje na login, pokud uživatel není přihlášen
  // allowedRoles: např. ['admin', 'member', 'art'] nebo null = vše
  require(allowedRoles = null) {
    const user = this.getUser();
    if (!user) {
      window.location.href = 'login.html';
      return null;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      window.location.href = 'login.html';
      return null;
    }
    return user;
  },

  logout() {
    sessionStorage.removeItem('10base_user');
    sessionStorage.removeItem('10base_token');
    window.location.href = 'login.html';
  }
};
