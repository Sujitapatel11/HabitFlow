export const environment = {
  production: false,
  apiUrl: '/api',           // proxied through Angular dev server → localhost:3001
  socketUrl: 'http://localhost:3001', // socket.io connects directly (not proxied)
};
