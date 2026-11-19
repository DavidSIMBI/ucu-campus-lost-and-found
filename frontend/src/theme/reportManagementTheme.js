import { createTheme } from '@mui/material/styles';

export const reportManagementTheme = createTheme({
  palette: {
    primary: {
      main: '#174b3a',
      dark: '#10392d',
      light: '#e5efe8',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#6f8c76',
      light: '#edf3ee',
      dark: '#496451'
    },
    background: {
      default: '#f4f7f3',
      paper: '#ffffff'
    },
    text: {
      primary: '#19332b',
      secondary: '#677870'
    },
    divider: '#e1e8e2',
    success: { main: '#356344' },
    warning: { main: '#876b27' },
    error: { main: '#9a393e' }
  },
  shape: { borderRadius: 9 },
  typography: {
    fontFamily: '"DM Sans", Arial, sans-serif',
    h1: {
      fontFamily: 'Manrope, "DM Sans", Arial, sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.04em'
    },
    h2: {
      fontFamily: 'Manrope, "DM Sans", Arial, sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.025em'
    },
    h3: {
      fontFamily: 'Manrope, "DM Sans", Arial, sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.02em'
    },
    button: { textTransform: 'none', fontWeight: 700 }
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, padding: '10px 17px' }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#ffffff'
        },
        notchedOutline: { borderColor: '#d5e0d8' }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: { borderColor: '#e1e8e2', boxShadow: '0 5px 20px rgba(25, 51, 43, 0.035)' }
      }
    },
    MuiPaper: {
      styleOverrides: {
        outlined: { borderColor: '#e1e8e2' }
      }
    }
  }
});
