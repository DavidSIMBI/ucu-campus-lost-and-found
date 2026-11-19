import { Box, Container, ThemeProvider } from '@mui/material';
import { reportManagementTheme } from '../../theme/reportManagementTheme.js';

export default function ReportManagementPage({ children, contentMaxWidth = 1200, compact = false }) {
  return (
    <ThemeProvider theme={reportManagementTheme}>
      <Box
        component="section"
        sx={{
          minHeight: '68vh',
          backgroundColor: 'background.default',
          color: 'text.primary',
          py: compact ? { xs: 2.5, sm: 3, md: 3.5 } : { xs: 4, sm: 5, md: 6 }
        }}
      >
        <Container maxWidth={false} sx={{ width: '100%', maxWidth: `${contentMaxWidth}px` }}>
          {children}
        </Container>
      </Box>
    </ThemeProvider>
  );
}
