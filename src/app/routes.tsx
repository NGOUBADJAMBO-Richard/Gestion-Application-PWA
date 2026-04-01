import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { Projects } from './pages/Projects';
import { Invoicing } from './pages/Invoicing';
import { Support } from './pages/Support';
import { Help } from './pages/Help';
import { NotFound } from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'clients', Component: Clients },
      { path: 'projects', Component: Projects },
      { path: 'invoicing', Component: Invoicing },
      { path: 'support', Component: Support },
      { path: 'help', Component: Help },
      { path: '*', Component: NotFound },
    ],
  },
]);