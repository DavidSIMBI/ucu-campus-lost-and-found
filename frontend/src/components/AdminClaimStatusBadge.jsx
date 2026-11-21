import { Chip } from '@mui/material';

const statusColors = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  WITHDRAWN: 'default'
};

export default function AdminClaimStatusBadge({ status }) {
  const normalized = String(status || 'UNKNOWN').toUpperCase();
  const label = String(status || 'Unknown')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  return (
    <Chip
      label={label}
      size="small"
      color={statusColors[normalized] || 'default'}
      variant={normalized === 'APPROVED' || normalized === 'REJECTED' ? 'filled' : 'outlined'}
      sx={{ fontSize: 10, fontWeight: 700 }}
    />
  );
}
