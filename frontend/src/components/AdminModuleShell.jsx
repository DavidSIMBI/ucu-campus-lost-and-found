import { useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery
} from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AdminThemeProvider from '../theme/AdminThemeProvider.jsx';

const drawerWidth = 272;

const coreNavigation = [
  { label: 'Overview', path: '/account', section: 'admin-overview', mark: 'OV' },
  { label: 'Claims', path: '/admin/claims', mark: 'CL' },
  { label: 'Users', path: '/admin/users', mark: 'US' }
];

const campusNavigation = [
  { label: 'Browse items', path: '/items', mark: 'BI' },
  { label: 'My reports', path: '/my-reports', mark: 'MR' }
];

function isNavigationItemActive(item, pathname, search) {
  if (item.section) {
    return pathname === item.path && new URLSearchParams(search).get('section') === item.section;
  }

  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

function AdminWorkspace({ title, eyebrow, children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isDesktop = useMediaQuery('(min-width: 900px)');
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const name = user?.fullName || user?.email || 'Administrator';
  const initial = name.trim().slice(0, 1).toUpperCase();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const navigationSections = [
    { title: 'Workspace', items: coreNavigation },
    ...(isSuperAdmin
      ? [{
          title: 'Super Admin',
          items: [{
            label: 'Admin management',
            path: '/account',
            section: 'super-admin-management',
            mark: 'SA'
          }]
        }]
      : []),
    { title: 'Campus', items: campusNavigation }
  ];

  useEffect(() => {
    setMobileNavigationOpen(false);
  }, [location.pathname, location.search]);

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', px: 2, py: 2.5 }}>
      <Stack
        component={RouterLink}
        to="/"
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: 'center',
          minHeight: 48,
          mb: 3.5,
          px: 0.75,
          color: 'text.primary',
          textDecoration: 'none'
        }}
        aria-label="UCU Campus Lost and Found home"
      >
        <Avatar
          variant="rounded"
          sx={{
            width: 40,
            height: 40,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontSize: 17,
            fontWeight: 800
          }}
        >
          U
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 750, lineHeight: 1.3 }}>
            UCU Campus
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.4 }}>
            Administration
          </Typography>
        </Box>
      </Stack>

      <Box component="nav" aria-label="Administration navigation">
        {navigationSections.map(({ title: sectionTitle, items }) => (
          <Box component="section" key={sectionTitle} sx={{ mb: 2.5 }}>
            <Typography
              component="h2"
              variant="overline"
              sx={{
                display: 'block',
                px: 1.25,
                mb: 0.75,
                color: 'text.secondary',
                fontSize: 10,
                fontWeight: 750,
                letterSpacing: '0.1em',
                lineHeight: 1.8
              }}
            >
              {sectionTitle}
            </Typography>
            <List disablePadding>
              {items.map((item) => {
                const selected = isNavigationItemActive(item, location.pathname, location.search);
                return (
                  <ListItemButton
                    component={RouterLink}
                    to={item.section
                      ? `${item.path}?section=${encodeURIComponent(item.section)}`
                      : item.path}
                    key={item.label}
                    selected={selected}
                    aria-current={selected ? 'page' : undefined}
                    onClick={() => setMobileNavigationOpen(false)}
                    sx={{
                      minHeight: 44,
                      mb: 0.5,
                      px: 1.25,
                      borderRadius: 2,
                      color: selected ? 'primary.main' : 'text.secondary',
                      '&.Mui-selected': {
                        bgcolor: 'primary.light',
                        color: 'primary.main',
                        '&:hover': { bgcolor: 'primary.light' }
                      },
                      '&:hover': { bgcolor: '#f5f7fa', color: 'text.primary' },
                      '&.Mui-focusVisible': {
                        outline: '3px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: 2
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>
                      <Box
                        aria-hidden="true"
                        sx={{
                          display: 'grid',
                          width: 27,
                          height: 27,
                          placeItems: 'center',
                          border: '1px solid',
                          borderColor: selected ? 'primary.main' : 'divider',
                          borderRadius: 1.5,
                          bgcolor: selected ? 'background.paper' : 'transparent',
                          fontSize: 9,
                          fontWeight: 750,
                          letterSpacing: '0.02em'
                        }}
                      >
                        {item.mark}
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      sx={{
                        '& .MuiListItemText-primary': {
                          fontSize: 13,
                          fontWeight: selected ? 700 : 550
                        }
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      <Box sx={{ flexGrow: 1 }} />
      <Divider sx={{ mb: 1.75 }} />
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0, px: 0.5 }}>
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: 'primary.light',
            color: 'primary.main',
            fontSize: 13,
            fontWeight: 700
          }}
        >
          {initial}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ color: 'text.primary', fontSize: 12, fontWeight: 700 }}>
            {name}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            {isSuperAdmin ? 'Super administrator' : 'Administrator'}
          </Typography>
        </Box>
        <Tooltip title="Sign out">
          <Button
            type="button"
            size="small"
            onClick={logout}
            aria-label="Log out"
            sx={{
              minWidth: 0,
              px: 1,
              color: 'text.secondary',
              fontSize: 11,
              '&:hover': { bgcolor: '#f5f7fa', color: 'text.primary' }
            }}
          >
            Log out
          </Button>
        </Tooltip>
      </Stack>
    </Box>
  );

  return (
    <Box
      component="section"
      className="admin-workspace"
      aria-label="Administration workspace"
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: 'background.default',
        color: 'text.primary'
      }}
    >
      <Drawer
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={isDesktop || mobileNavigationOpen}
        onClose={() => setMobileNavigationOpen(false)}
        sx={{
          width: isDesktop ? drawerWidth : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }
        }}
      >
        {drawer}
      </Drawer>

      <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
        <Box
          component="header"
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: (theme) => theme.zIndex.appBar,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            minHeight: { xs: 68, sm: 76 },
            px: { xs: 2, sm: 3, lg: 4 },
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
            {!isDesktop && (
              <IconButton
                onClick={() => setMobileNavigationOpen(true)}
                aria-label="Open administration navigation"
                aria-expanded={mobileNavigationOpen}
                sx={{
                  width: 42,
                  height: 42,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  color: 'text.primary',
                  fontSize: 18
                }}
              >
                <span aria-hidden="true">☰</span>
              </IconButton>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="overline"
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  color: 'text.secondary',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  lineHeight: 1.5
                }}
              >
                {eyebrow}
              </Typography>
              <Typography
                component="h1"
                sx={{
                  overflow: 'hidden',
                  color: 'text.primary',
                  fontSize: { xs: 17, sm: 20 },
                  fontWeight: 700,
                  letterSpacing: '-0.025em',
                  lineHeight: 1.3,
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {title}
              </Typography>
            </Box>
          </Stack>
          <Tooltip title={name}>
            <Avatar
              aria-label={`${name}, ${isSuperAdmin ? 'Super administrator' : 'Administrator'}`}
              sx={{
                display: { xs: 'none', sm: 'flex' },
                width: 38,
                height: 38,
                bgcolor: 'primary.light',
                color: 'primary.main',
                fontSize: 13,
                fontWeight: 700
              }}
            >
              {initial}
            </Avatar>
          </Tooltip>
        </Box>
        <Box sx={{ width: 'min(100%, 1440px)', mx: 'auto', p: { xs: 2, sm: 3, lg: 4 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

export default function AdminModuleShell({ title, eyebrow = 'Administration', children }) {
  return (
    <AdminThemeProvider>
      <AdminWorkspace title={title} eyebrow={eyebrow}>
        {children}
      </AdminWorkspace>
    </AdminThemeProvider>
  );
}
