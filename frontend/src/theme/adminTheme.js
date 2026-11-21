import { createTheme } from '@mui/material/styles';

export const adminDesignTokens = {
  color: {
    primary: '#172b45',
    primaryHover: '#102137',
    primarySubtle: '#eaf0f6',
    background: '#f4f6f9',
    surface: '#ffffff',
    text: '#18283b',
    textSecondary: '#65758a',
    border: '#e1e6ed',
    focus: '#416fa8',
    success: '#247653',
    warning: '#93650a',
    error: '#b4232f'
  },
  radius: {
    small: '8px',
    medium: '12px',
    large: '16px'
  },
  shadow: {
    subtle: '0 1px 2px rgba(19, 38, 61, 0.04)',
    raised: '0 8px 24px rgba(19, 38, 61, 0.08)'
  },
  spacingUnit: '8px'
};

const { color, radius, shadow } = adminDesignTokens;
const fontFamily = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const adminTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: color.primary,
      dark: color.primaryHover,
      light: color.primarySubtle,
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#536b87',
      dark: '#405671',
      light: '#edf2f7',
      contrastText: '#ffffff'
    },
    background: {
      default: color.background,
      paper: color.surface
    },
    text: {
      primary: color.text,
      secondary: color.textSecondary
    },
    divider: color.border,
    success: { main: color.success },
    warning: { main: color.warning },
    error: { main: color.error }
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily,
    h1: { fontWeight: 700, letterSpacing: '-0.035em' },
    h2: { fontWeight: 700, letterSpacing: '-0.025em' },
    h3: { fontWeight: 650, letterSpacing: '-0.02em' },
    h4: { fontWeight: 650, letterSpacing: '-0.015em' },
    h5: { fontWeight: 650 },
    h6: { fontWeight: 650 },
    button: { fontWeight: 650, textTransform: 'none' },
    caption: { color: color.textSecondary }
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minHeight: 40,
          borderRadius: radius.small,
          padding: '9px 16px',
          textTransform: 'none',
          transition: 'background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease',
          '&.Mui-focusVisible': {
            outline: `3px solid ${color.focus}`,
            outlineOffset: 2
          }
        },
        contained: {
          boxShadow: shadow.subtle,
          '&:hover': { boxShadow: shadow.subtle }
        },
        outlined: { borderColor: color.border }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${color.border}`,
          borderRadius: radius.medium,
          backgroundColor: color.surface,
          boxShadow: shadow.subtle
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        rounded: { borderRadius: radius.medium },
        outlined: { borderColor: color.border }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          minHeight: 42,
          borderRadius: radius.small,
          backgroundColor: color.surface,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: color.border },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#aab6c5' },
          '&.Mui-focused': { boxShadow: `0 0 0 3px ${color.focus}26` },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: color.focus,
            borderWidth: 1
          }
        }
      }
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: color.textSecondary,
          '&.Mui-focused': { color: color.primary }
        }
      }
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: { marginLeft: 2 }
      }
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 44 },
        indicator: { height: 2, borderRadius: '2px 2px 0 0' }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 44,
          padding: '10px 16px',
          color: color.textSecondary,
          fontWeight: 600,
          textTransform: 'none',
          '&.Mui-selected': { color: color.primary }
        }
      }
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          border: `1px solid ${color.border}`,
          borderRadius: radius.medium,
          backgroundColor: color.surface,
          boxShadow: 'none',
          overflowX: 'auto'
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '13px 16px',
          borderBottomColor: color.border
        },
        head: {
          backgroundColor: '#f8f9fb',
          color: color.textSecondary,
          fontWeight: 650,
          whiteSpace: 'nowrap'
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:last-child td, &:last-child th': { borderBottom: 0 },
          '&:hover': { backgroundColor: '#f8fafd' }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: '999px', fontWeight: 600 }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: radius.small }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          border: `1px solid ${color.border}`,
          borderRadius: radius.large,
          boxShadow: shadow.raised
        }
      }
    }
  }
});
