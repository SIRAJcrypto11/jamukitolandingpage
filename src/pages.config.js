import Home from './pages/Home';
import Katalog from './pages/Katalog';
import MinimalLayout from './components/MinimalLayout';

export const PAGES = {
    "Home": Home,
    "Katalog": Katalog,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: MinimalLayout,
};