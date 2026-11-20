import { createTheme } from '@mui/material/styles';

export const reportManagementTheme = createTheme({
  palette: {
    primary: {
      main: '#214d68',
      dark: '#142f45',
      light: '#e5edf3',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#398078',
      light: '#e5f1ef',
      dark: '#2d6c65'
    },
    background: {
      default: '#f4f7f9',
      paper: '#ffffff'
    },
    text: {
      primary: '#172e42',
      secondary: '#66798a'
    },
    divider: '#e1e7ec',
    success: { main: '#27766e' },
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
        notchedOutline: { borderColor: '#d7e0e7' }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: { borderColor: '#e1e7ec', boxShadow: '0 5px 20px rgba(23, 46, 66, 0.035)' }
      }
    },
    MuiPaper: {
      styleOverrides: {
        outlined: { borderColor: '#e1e7ec' }
      }
    }
  }
});
