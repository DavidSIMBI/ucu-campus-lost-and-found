import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  LinearProgress,
  Link as MuiLink,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import AdminClaimStatusBadge from '../components/AdminClaimStatusBadge.jsx';
import AdminModuleShell from '../components/AdminModuleShell.jsx';
import useAdminSession from '../hooks/useAdminSession.js';
import { completeHandover, getAdminClaim, reviewClaim } from '../services/adminService.js';
import { downloadBlob, getEvidenceFile } from '../services/claimsService.js';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatEventDate(value) {
  const raw = String(value ?? '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10) || '—';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kampala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function isValidClaimReview(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    value.id != null &&
    value.report &&
    typeof value.report === 'object' &&
    !Array.isArray(value.report) &&
    value.claimant &&
    typeof value.claimant === 'object' &&
    !Array.isArray(value.claimant) &&
    (value.evidenceFiles == null || Array.isArray(value.evidenceFiles))
  );
}

function DetailFact({ label, children }) {
  return (
    <Box component="div" sx={{ minWidth: 0 }}>
      <Typography component="dt" color="text.secondary" sx={{ fontSize: 10, fontWeight: 600 }}>
        {label}
      </Typography>
      <Box component="dd" sx={{ display: 'block', mt: 0.4, mb: 0, color: 'text.primary', fontSize: 12, fontWeight: 600, overflowWrap: 'anywhere' }}>
        {children || '—'}
      </Box>
    </Box>
  );
}

function SectionHeading({ eyebrow, title }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      {eyebrow && (
        <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: 9, fontWeight: 750, letterSpacing: '0.09em' }}>
          {eyebrow}
        </Typography>
      )}
      <Typography component="h3" sx={{ color: 'text.primary', fontSize: 14, fontWeight: 700, overflowWrap: 'anywhere' }}>
        {title}
      </Typography>
    </Box>
  );
}

function EvidenceFileRow({ file, disabled, onDownload }) {
  const sizeInMegabytes = (Number(file.fileSize) / (1024 * 1024)).toFixed(2);
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: 'text.primary', fontSize: 12, fontWeight: 650, overflowWrap: 'anywhere' }}>
            {file.originalFilename}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.35, fontSize: 10 }}>
            {file.mimeType} · {sizeInMegabytes} MB
          </Typography>
        </Box>
        <Button type="button" variant="outlined" size="small" disabled={disabled} onClick={onDownload}>
          Download evidence
        </Button>
      </Stack>
    </Paper>
  );
}

export default function AdminClaimDetailPage() {
  const { id } = useParams();
  const handleUnauthorized = useAdminSession();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setClaim(null);

    async function loadClaim() {
      try {
        const result = await getAdminClaim(id, { signal: controller.signal });
        if (!isValidClaimReview(result)) {
          setError('This claim is unavailable or its details could not be loaded.');
          return;
        }
        setClaim(result);
        setReviewNote(result.reviewNote || '');
      } catch (requestError) {
        if (controller.signal.aborted || await handleUnauthorized(requestError)) return;
        setError(requestError.response?.data?.message || 'Unable to load this claim.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadClaim();
    return () => controller.abort();
  }, [id, retry, handleUnauthorized]);

  function requestDecision(decision) {
    const noteLength = reviewNote.trim().length;
    if (decision === 'REJECT' && noteLength < 5) {
      setActionError('Add a review reason of at least 5 characters before rejecting.');
      return;
    }
    if (noteLength > 0 && noteLength < 5) {
      setActionError('A review note must contain at least 5 characters when provided.');
      return;
    }
    setActionError('');
    setConfirmation({ type: 'review', decision });
  }

  async function confirmAction() {
    if (!confirmation) return;
    const action = confirmation;
    setConfirmation(null);
    setBusy(true);
    setActionError('');
    try {
      if (action.type === 'review') {
        await reviewClaim(id, action.decision, reviewNote);
      } else {
        await completeHandover(id);
      }
      setRetry((value) => value + 1);
    } catch (requestError) {
      if (await handleUnauthorized(requestError)) return;
      setActionError(requestError.response?.data?.message || (
        action.type === 'review' ? 'Unable to record this decision.' : 'Unable to complete handover.'
      ));
    } finally {
      setBusy(false);
    }
  }

  async function downloadEvidence(file) {
    setBusy(true);
    setActionError('');
    try {
      downloadBlob(await getEvidenceFile(id, file.id), file.originalFilename);
    } catch (requestError) {
      if (await handleUnauthorized(requestError)) return;
      setActionError(requestError.response?.data?.message || 'Unable to access this evidence file.');
    } finally {
      setBusy(false);
    }
  }

  const dialogCopy = confirmation?.type === 'review'
    ? {
        title: confirmation.decision === 'APPROVE' ? 'Approve this claim?' : 'Reject this claim?',
        message: `Confirm that you want to ${confirmation.decision === 'APPROVE' ? 'approve' : 'reject'} this claim?`,
        action: confirmation.decision === 'APPROVE' ? 'Confirm approval' : 'Confirm rejection'
      }
    : {
        title: 'Confirm physical handover',
        message: 'Confirm that the item has physically been handed over to this claimant?',
        action: 'Confirm handover'
      };

  return (
    <AdminModuleShell title="Claim review" eyebrow="Administration / Claims / Review">
      <Box sx={{ display: 'grid', gap: { xs: 2, md: 2.5 } }}>
        <Button
          component={RouterLink}
          to="/admin/claims"
          variant="text"
          sx={{ justifySelf: 'flex-start', px: 0, minHeight: 34 }}
        >
          ← Back to claims queue
        </Button>

        {loading && (
          <Box role="status" aria-label="Loading claim review" sx={{ display: 'grid', gap: 1.5 }}>
            <LinearProgress sx={{ borderRadius: 99 }} />
            <Skeleton variant="rounded" height={150} />
            <Skeleton variant="rounded" height={300} />
          </Box>
        )}

        {!loading && error && (
          <Alert
            severity="error"
            role="alert"
            action={<Button color="inherit" size="small" onClick={() => setRetry((value) => value + 1)}>Try again</Button>}
          >
            {error}
          </Alert>
        )}

        {!loading && !error && claim && (
          <>
            <Paper
              component="section"
              aria-labelledby="claim-review-title"
              variant="outlined"
              sx={{
                display: 'flex',
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1.5,
                p: { xs: 2, sm: 2.75 },
                borderRadius: 2.5,
                background: 'linear-gradient(115deg, #ffffff 0%, #f8fafd 100%)'
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="overline" sx={{ color: 'primary.main', fontSize: 9, fontWeight: 800, letterSpacing: '0.11em' }}>
                  Claim reference #{claim.id}
                </Typography>
                <Typography id="claim-review-title" component="h2" sx={{ color: 'text.primary', fontSize: { xs: 20, sm: 24 }, fontWeight: 750, overflowWrap: 'anywhere' }}>
                  {claim.report.title}
                </Typography>
              </Box>
              <AdminClaimStatusBadge status={claim.status} />
            </Paper>

            {actionError && <Alert severity="error" role="alert">{actionError}</Alert>}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.4fr) minmax(280px, 0.8fr)' }, alignItems: 'start', gap: 2 }}>
              <Card variant="outlined">
                <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
                  <SectionHeading eyebrow="Review material" title="Claim details" />
                  <Divider />
                  <Box component="section" sx={{ py: 2 }}>
                    <Typography component="h4" sx={{ mb: 0.75, color: 'text.primary', fontSize: 12, fontWeight: 700 }}>
                      Student justification
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                      {claim.justification || 'No written justification was recorded for this historical claim.'}
                    </Typography>
                  </Box>

                  {claim.legacyEvidenceText && (
                    <Box component="section" sx={{ py: 1.5 }}>
                      <Typography component="h4" sx={{ mb: 0.75, color: 'text.primary', fontSize: 12, fontWeight: 700 }}>
                        Previously submitted evidence
                      </Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                        {claim.legacyEvidenceText}
                      </Typography>
                    </Box>
                  )}

                  <Box component="section" sx={{ py: 1.5 }}>
                    <SectionHeading title="Supporting evidence" />
                    {claim.evidenceFiles?.length
                      ? (
                        <Stack spacing={1}>
                          {claim.evidenceFiles.map((file) => (
                            <EvidenceFileRow
                              key={file.id}
                              file={file}
                              disabled={busy}
                              onDownload={() => downloadEvidence(file)}
                            />
                          ))}
                        </Stack>
                      )
                      : (
                        <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                          No uploaded files are associated with this claim.
                        </Typography>
                      )}
                  </Box>

                  <Divider sx={{ my: 1.5 }} />
                  <Box
                    component="dl"
                    sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5, m: 0 }}
                  >
                    <DetailFact label="Submitted">{formatDate(claim.submittedAt)}</DetailFact>
                    <DetailFact label="Report status">{claim.report.status}</DetailFact>
                    <DetailFact label="Review status"><AdminClaimStatusBadge status={claim.status} /></DetailFact>
                    <DetailFact label="Handover">
                      {claim.status === 'APPROVED'
                        ? (claim.report.status === 'RETURNED' ? 'Completed' : 'Pending')
                        : '—'}
                    </DetailFact>
                  </Box>
                </CardContent>
              </Card>

              <Stack spacing={1.5}>
                <Card variant="outlined">
                  <CardContent sx={{ p: 2.25 }}>
                    <SectionHeading eyebrow="Claimant" title={claim.claimant.fullName} />
                    <MuiLink
                      href={`mailto:${claim.claimant.email}`}
                      underline="hover"
                      sx={{ fontSize: 12, overflowWrap: 'anywhere' }}
                    >
                      {claim.claimant.email}
                    </MuiLink>
                    <Typography color="text.secondary" sx={{ mt: 1, fontSize: 10 }}>
                      Claim ID {claim.id}
                    </Typography>
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent sx={{ p: 2.25 }}>
                    <SectionHeading eyebrow="Found item" title={claim.report.title} />
                    <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5, m: 0 }}>
                      <DetailFact label="Category">{claim.report.category}</DetailFact>
                      <DetailFact label="Location">{claim.report.location}</DetailFact>
                      <DetailFact label="Event date">{formatEventDate(claim.report.eventDate)}</DetailFact>
                      <DetailFact label="Report status">{claim.report.status}</DetailFact>
                    </Box>
                  </CardContent>
                </Card>

                {claim.reviewedAt && (
                  <Card variant="outlined">
                    <CardContent sx={{ p: 2.25 }}>
                      <SectionHeading eyebrow="Previous review" title="Administrator decision" />
                      <Typography sx={{ color: 'text.secondary', fontSize: 12, lineHeight: 1.65, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                        {claim.reviewNote || 'No review note was recorded.'}
                      </Typography>
                      <Typography color="text.secondary" sx={{ mt: 1.25, fontSize: 10 }}>
                        {claim.reviewer?.fullName || 'Administrator'} · {formatDate(claim.reviewedAt)}
                      </Typography>
                    </CardContent>
                  </Card>
                )}

                {claim.status === 'PENDING' && (
                  <Card variant="outlined">
                    <CardContent sx={{ p: 2.25 }}>
                      <SectionHeading eyebrow="Decision" title="Review this claim" />
                      <TextField
                        fullWidth
                        multiline
                        minRows={4}
                        maxRows={8}
                        label="Review note"
                        value={reviewNote}
                        onChange={(event) => setReviewNote(event.target.value)}
                        placeholder="Explain your decision for the student."
                        helperText="Required to reject; if provided, use 5–2,000 characters."
                        slotProps={{ htmlInput: { maxLength: 2000 } }}
                        size="small"
                      />
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
                        <Button
                          type="button"
                          variant="contained"
                          disabled={busy}
                          onClick={() => requestDecision('APPROVE')}
                          sx={{ flex: 1 }}
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          variant="outlined"
                          color="error"
                          disabled={busy}
                          onClick={() => requestDecision('REJECT')}
                          sx={{ flex: 1 }}
                        >
                          Reject
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                )}

                {claim.status === 'APPROVED' && claim.report.status === 'OPEN' && (
                  <Card variant="outlined" sx={{ borderColor: 'success.light', bgcolor: '#f8fcf8' }}>
                    <CardContent sx={{ p: 2.25 }}>
                      <SectionHeading eyebrow="Handover pending" title="Confirm item handover" />
                      <Typography color="text.secondary" sx={{ mb: 1.5, fontSize: 11, lineHeight: 1.6 }}>
                        Confirm only after the item has physically been handed to the claimant.
                      </Typography>
                      <Button
                        type="button"
                        variant="contained"
                        color="success"
                        disabled={busy}
                        onClick={() => {
                          setActionError('');
                          setConfirmation({ type: 'handover' });
                        }}
                        fullWidth
                      >
                        Confirm handover
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {claim.status === 'APPROVED' && claim.report.status === 'RETURNED' && (
                  <Card variant="outlined" sx={{ borderColor: 'success.light', bgcolor: '#f8fcf8' }}>
                    <CardContent sx={{ p: 2.25 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: 'success.light', color: 'success.dark', fontSize: 9, fontWeight: 750 }}>OK</Avatar>
                        <Typography component="h3" sx={{ color: 'text.primary', fontSize: 13, fontWeight: 700 }}>
                          Handover complete
                        </Typography>
                      </Stack>
                      <Typography color="text.secondary" sx={{ fontSize: 11 }}>
                        The report is marked returned.
                      </Typography>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            </Box>
          </>
        )}
      </Box>

      <Dialog
        open={Boolean(confirmation)}
        onClose={() => {
          if (!busy) setConfirmation(null);
        }}
        aria-labelledby="claim-confirmation-title"
        aria-describedby="claim-confirmation-description"
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle id="claim-confirmation-title">{dialogCopy.title}</DialogTitle>
        <DialogContent>
          <DialogContentText id="claim-confirmation-description">{dialogCopy.message}</DialogContentText>
          {confirmation?.type === 'handover' && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              This will mark the found item as returned.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button type="button" variant="outlined" disabled={busy} onClick={() => setConfirmation(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="contained"
            color={confirmation?.type === 'review' && confirmation.decision === 'REJECT' ? 'error' : 'primary'}
            disabled={busy}
            onClick={confirmAction}
            startIcon={busy ? <CircularProgress size={14} color="inherit" /> : null}
          >
            {busy ? 'Working…' : dialogCopy.action}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminModuleShell>
  );
}
