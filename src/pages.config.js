import Home from './pages/Home';
import MinimalLayout from './components/MinimalLayout';

export const PAGES = {
    "Home": Home,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: MinimalLayout,
};