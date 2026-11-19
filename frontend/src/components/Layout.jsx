import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';

export default function Layout() {
  const { pathname } = useLocation();
  const isAdminWorkspace = pathname.startsWith('/admin/');

  return (
    <>
      {!isAdminWorkspace && <Navbar />}
      <main id="main-content"><Outlet /></main>
      {!isAdminWorkspace && <Footer />}
    </>
  );
}
