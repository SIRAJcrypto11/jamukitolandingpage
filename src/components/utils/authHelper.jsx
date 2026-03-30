// Authentication helper to prevent redirect loops
export const isAuthenticated = async () => {
  try {
    const { User } = await import('@/entities/User');
    const userData = await User.me();
    return !!userData && !!userData.id;
  } catch (error) {
    return false;
  }
};

export const redirectToLogin = () => {
  const currentPath = window.location.pathname;
  const publicPaths = ['/', '/pricing'];
  
  if (!publicPaths.includes(currentPath)) {
    window.location.href = '/';
  }
};

export const redirectToDashboard = () => {
  window.location.href = '/dashboard';
};