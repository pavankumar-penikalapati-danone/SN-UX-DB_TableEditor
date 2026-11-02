import { createBrowserRouter, RouterProvider, NavLink, Outlet } from 'react-router';
import { useState } from 'react';
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  useIsMobile,
} from '@databricks/appkit-ui/react';
import { ClipboardCheck, Menu, ShieldCheck, Wine } from 'lucide-react';
import { SessionProvider, useSession } from './lib/session';
import { DEMO_PERSONAS } from './lib/api';
import { NewRequestPage } from './pages/NewRequestPage';
import { MyRequestsPage } from './pages/MyRequestsPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { RequestDetailPage } from './pages/RequestDetailPage';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`;

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`;

type NavLinkClassFn = (props: { isActive: boolean }) => string;

function NavLinks({
  className,
  linkClass,
  onClick,
  showApprovals,
}: {
  className?: string;
  linkClass: NavLinkClassFn;
  onClick?: () => void;
  showApprovals: boolean;
}) {
  return (
    <nav className={className}>
      <NavLink to="/new" className={linkClass} onClick={onClick}>
        New request
      </NavLink>
      <NavLink to="/my" className={linkClass} onClick={onClick}>
        My requests
      </NavLink>
      {showApprovals ? (
        <NavLink to="/approvals" className={linkClass} onClick={onClick}>
          Approvals
        </NavLink>
      ) : null}
    </nav>
  );
}

function PersonaSwitcher() {
  const { demoUser, changeUser, whoami } = useSession();
  return (
    <div className="flex items-center gap-2">
      {whoami ? (
        <Badge variant="outline" className="gap-1">
          {whoami.isApprover ? (
            <ShieldCheck className="h-3 w-3" />
          ) : (
            <ClipboardCheck className="h-3 w-3" />
          )}
          {whoami.isApprover ? 'Approver' : 'Requester'}
        </Badge>
      ) : null}
      {whoami?.demoMode ? (
        <Select value={demoUser} onValueChange={changeUser}>
          <SelectTrigger className="h-8 w-[200px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEMO_PERSONAS.map((p) => (
              <SelectItem key={p.email} value={p.email} className="text-xs">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : whoami ? (
        <span className="text-xs text-muted-foreground max-w-[200px] truncate">
          {whoami.email}
        </span>
      ) : null}
    </div>
  );
}

function Layout() {
  const isMobile = useIsMobile();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { whoami } = useSession();
  const showApprovals = Boolean(whoami?.isApprover);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b px-4 md:px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Wine className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold text-foreground hidden sm:block">
            UX SN Tasting Sessions
          </h1>
        </div>
        <NavLinks
          className="hidden md:flex gap-1"
          linkClass={navLinkClass}
          showApprovals={showApprovals}
        />
        <div className="ml-auto hidden sm:block">
          <PersonaSwitcher />
        </div>
        <div className="ml-auto md:hidden">
          <Sheet open={mobileNavOpen && isMobile} onOpenChange={setMobileNavOpen}>
            <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(true)}>
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation</span>
            </Button>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-4">
                <PersonaSwitcher />
              </div>
              <NavLinks
                className="flex flex-col gap-1 px-2"
                linkClass={mobileNavLinkClass}
                onClick={() => setMobileNavOpen(false)}
                showApprovals={showApprovals}
              />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <NewRequestPage /> },
      { path: '/new', element: <NewRequestPage /> },
      { path: '/my', element: <MyRequestsPage /> },
      { path: '/approvals', element: <ApprovalsPage /> },
      { path: '/requests/:id', element: <RequestDetailPage /> },
    ],
  },
]);

export default function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  );
}
