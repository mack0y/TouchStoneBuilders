import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const icons = {
  dashboard: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6Zm0 9.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6Zm0 9.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>,
  products: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>,
  sales: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>,
  purchases: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" /></svg>,
  customers: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>,
  suppliers: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Z" /></svg>,
  reports: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>,
  users: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>,
  collapseLeft: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" /></svg>,
  collapseRight: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" /></svg>,
  logout: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>,
  menu: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>,
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: icons.dashboard },
  { to: '/products', label: 'Products', icon: icons.products },
  { to: '/sales', label: 'Sales', icon: icons.sales },
  { to: '/purchases', label: 'Purchases', icon: icons.purchases },
  { to: '/customers', label: 'Customers', icon: icons.customers },
]

const adminNavItems = [
  { to: '/suppliers', label: 'Suppliers', icon: icons.suppliers },
  { to: '/reports', label: 'Reports', icon: icons.reports },
  { to: '/users', label: 'Users', icon: icons.users },
]

function NavItem({ item, collapsed }) {
  return (
    <li>
      <NavLink
        to={item.to}
        end={item.to === '/'}
        aria-label={item.label}
        className={({ isActive }) => (isActive ? 'active' : '') + (collapsed ? ' tooltip tooltip-right' : '')}
        data-tip={collapsed ? item.label : undefined}
      >
        {item.icon}
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
    </li>
  )
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { profile, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await logout()
    } catch (err) {
      console.error('Logout failed:', err)
    }
    navigate('/login')
  }

  const initial = profile?.full_name?.charAt(0)?.toUpperCase() || '?'

  return (
    <div className="drawer lg:drawer-open">
      <input id="sidebar-drawer" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex flex-col min-h-screen">
        <nav className="navbar bg-base-100 border-b border-base-200 gap-2">
          <div className="flex-none lg:hidden">
            <label htmlFor="sidebar-drawer" className="btn btn-square btn-ghost">
              {icons.menu}
            </label>
          </div>
          <div className="flex-1 font-bold truncate">TouchStone Builders</div>
          <div className="flex-none flex items-center gap-2">
            <div className="avatar placeholder hidden sm:flex">
              <div className="bg-primary text-primary-content rounded-full w-8 text-xs font-bold">
                {initial}
              </div>
            </div>
            <span className="text-sm hidden sm:inline text-base-content/70">
              {profile?.full_name || 'User'}
            </span>
            <button className="btn btn-ghost btn-sm btn-square" onClick={handleLogout} aria-label="Logout" title="Logout">
              {icons.logout}
            </button>
          </div>
        </nav>

        <main className="flex-1 p-4 lg:p-6 bg-base-100">
          <Outlet />
        </main>
      </div>

      <div className="drawer-side">
        <label htmlFor="sidebar-drawer" className="drawer-overlay"></label>

        <aside aria-label="Sidebar navigation" className={`flex flex-col min-h-full bg-base-200 border-r border-base-300 transition-all duration-200 ${collapsed ? 'w-[4.5rem]' : 'w-64'}`}>
          <div className={`flex items-center p-4 border-b border-base-300 ${collapsed ? 'justify-center' : 'justify-between'}`}>
            {!collapsed && (
              <div>
                <h1 className="font-bold truncate">TouchStone</h1>
                <p className="text-xs text-base-content/50 truncate">{profile?.full_name || 'User'}</p>
              </div>
            )}
            <button
              className="btn btn-ghost btn-square btn-sm hidden lg:flex"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? icons.collapseRight : icons.collapseLeft}
            </button>
          </div>

          <ul className={`menu p-2 gap-1 flex-1 ${collapsed ? 'items-center' : ''}`}>
            {navItems.map((item) => (
              <NavItem key={item.to} item={item} collapsed={collapsed} />
            ))}

            {isAdmin && (
              <>
                <li className={`menu-title ${collapsed ? 'hidden' : ''}`}><span>Administration</span></li>
                {adminNavItems.map((item) => (
                  <NavItem key={item.to} item={item} collapsed={collapsed} />
                ))}
              </>
            )}
          </ul>

          <div className={`p-2 border-t border-base-300 ${collapsed ? 'flex justify-center' : ''}`}>
            <button className={`btn btn-soft btn-sm ${collapsed ? 'btn-square' : 'w-full'}`} onClick={handleLogout} aria-label="Logout">
              {icons.logout}
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
