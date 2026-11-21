import { ThemeProvider } from '@mui/material/styles';
import { adminDesignTokens, adminTheme } from './adminTheme.js';
import './admin-foundations.css';

const { color, radius, shadow, spacingUnit } = adminDesignTokens;

const foundationStyle = {
  '--admin-color-primary': color.primary,
  '--admin-color-primary-hover': color.primaryHover,
  '--admin-color-primary-subtle': color.primarySubtle,
  '--admin-color-background': color.background,
  '--admin-color-surface': color.surface,
  '--admin-color-text': color.text,
  '--admin-color-text-secondary': color.textSecondary,
  '--admin-color-border': color.border,
  '--admin-color-focus': color.focus,
  '--admin-radius-small': radius.small,
  '--admin-radius-medium': radius.medium,
  '--admin-radius-large': radius.large,
  '--admin-shadow-subtle': shadow.subtle,
  '--admin-shadow-raised': shadow.raised,
  '--admin-spacing-unit': spacingUnit
};

export default function AdminThemeProvider({ children }) {
  return (
    <ThemeProvider theme={adminTheme}>
      <div className="admin-theme-root" style={foundationStyle}>
        {children}
      </div>
    </ThemeProvider>
  );
}
