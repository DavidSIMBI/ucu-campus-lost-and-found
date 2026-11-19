export default function ClaimStatusBadge({ status }) {
  const normalized = String(status || 'UNKNOWN').toLowerCase();
  return <span className={`claim-status claim-status-${normalized}`}>{String(status || 'Unknown').replaceAll('_', ' ')}</span>;
}
