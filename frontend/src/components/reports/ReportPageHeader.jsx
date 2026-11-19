import { Box, Stack, Typography } from '@mui/material';

export default function ReportPageHeader({ eyebrow, title, description, action, compact = false }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', md: 'flex-end' },
        justifyContent: 'space-between',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2.5,
        mb: compact ? { xs: 2, md: 2.5 } : { xs: 3, md: 4 }
      }}
    >
      <Stack spacing={compact ? 0.5 : 0.75}>
        <Typography
          variant="overline"
          sx={{ color: 'secondary.dark', fontWeight: 800, letterSpacing: '0.09em' }}
        >
          {eyebrow}
        </Typography>
        <Typography variant="h1" sx={{ fontSize: compact ? { xs: '1.8rem', sm: '2.15rem' } : { xs: '2rem', sm: '2.5rem' }, lineHeight: 1.12 }}>
          {title}
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 650, lineHeight: 1.7 }}>
          {description}
        </Typography>
      </Stack>
      {action}
    </Box>
  );
}
