


export function createPageUrl(pageName: string) {
    const path = '/' + pageName.toLowerCase().replace(/ /g, '-');
    if (pageName.toLowerCase() === 'home' || pageName === '') return '/';
    
    // Redirect all other pages to the main application
    const baseUrl = import.meta.env.VITE_BASE44_BACKEND_URL || 'https://jamukitointernasional.base44.app';
    return `${baseUrl}${path}`;
}